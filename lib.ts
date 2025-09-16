import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { readFile, writeFile } from "fs/promises";
import { stringify as csvStringify, parse as csvParse } from 'csv/sync';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import YAML from 'yaml';

// --- Interfaces ---
export interface Node {
    id: string;
    label: string;
    type: string;
    [key: string]: unknown; // Allow other properties
}

export interface Edge {
    source: string;
    target: string;
    label: string | string[];
}

export interface Graph {
    nodes: Node[];
    edges: Edge[];
}

// --- Database Functions ---

export async function openDb(filename: string): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    return open({
        filename,
        driver: sqlite3.Database,
    });
}

export async function initializeDb(db: Database): Promise<void> {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS nodes (
            body TEXT,
            id   TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
        );
        CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);

        CREATE TABLE IF NOT EXISTS edges (
            source     TEXT,
            target     TEXT,
            properties TEXT,
            UNIQUE(source, target, properties) ON CONFLICT REPLACE,
            FOREIGN KEY(source) REFERENCES nodes(id),
            FOREIGN KEY(target) REFERENCES nodes(id)
        );
        CREATE INDEX IF NOT EXISTS source_idx ON edges(source);
        CREATE INDEX IF NOT EXISTS target_idx ON edges(target);
    `);
}

// --- Core Logic ---

export async function insertGraphIntoDb(db: Database, graph: Graph): Promise<void> {
    await initializeDb(db);
    await db.run("BEGIN TRANSACTION;");

    const insertNodeStmt = await db.prepare("INSERT OR REPLACE INTO nodes (body) VALUES (?)");
    const insertEdgeStmt = await db.prepare("INSERT OR REPLACE INTO edges (source, target, properties) VALUES (?, ?, ?)");

    for (const node of graph.nodes) {
        const nodeStr = JSON.stringify(node);
        await insertNodeStmt.run(nodeStr);
    }

    for (const edge of graph.edges) {
        const propertiesStr = JSON.stringify(edge.label);
        await insertEdgeStmt.run(edge.source, edge.target, propertiesStr);
    }

    await insertNodeStmt.finalize();
    await insertEdgeStmt.finalize();
    await db.run("COMMIT TRANSACTION;");
}

// --- Import Functions ---

export async function importFromJson(db: Database, inputFile: string): Promise<Graph> {
    const contents = await readFile(inputFile, "utf-8");
    const graph: Graph = JSON.parse(contents);
    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromCsv(db: Database, inputFile: string): Promise<Graph> {
    const baseInputFile = inputFile.endsWith('.csv') ? inputFile.slice(0, -4) : inputFile;
    const nodeFile = `${baseInputFile}_nodes.csv`;
    const edgeFile = `${baseInputFile}_edges.csv`;

    const nodeContents = await readFile(nodeFile, 'utf-8');
    const edgeContents = await readFile(edgeFile, 'utf-8');

    const nodeRecords = csvParse(nodeContents, { columns: true, skip_empty_lines: true });
    const edgeRecords = csvParse(edgeContents, { columns: true, skip_empty_lines: true });

    const graph: Graph = {
        nodes: nodeRecords.map((r) => ({ id: r.id, label: r.label, type: r.type })),
        edges: edgeRecords.map((r) => ({ source: r.source, target: r.target, label: [r.label] }))
    };

    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromXml(db: Database, inputFile: string): Promise<Graph> {
    const xmlContent = await readFile(inputFile, 'utf-8');

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
    });
    const xmlObject = parser.parse(xmlContent);

    const graph: Graph = {
        nodes: xmlObject.graph.nodes.node.map((n) => ({
            id: n['@_id'],
            type: n['@_type'],
            label: n.label
        })),
        edges: xmlObject.graph.edges.edge.map((e) => ({
            source: e['@_source'],
            target: e['@_target'],
            label: [e.label]
        }))
    };

    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromYaml(db: Database, inputFile: string): Promise<Graph> {
    const contents = await readFile(inputFile, "utf-8");
    const graph: Graph = YAML.parse(contents);
    await insertGraphIntoDb(db, graph);
    return graph;
}


// --- Export Functions ---

export async function exportToJson(db: Database, outputFile: string): Promise<void> {
    const nodes = (await db.all("SELECT body FROM nodes")).map(n => JSON.parse(n.body));
    const dbEdges = await db.all("SELECT source, target, properties FROM edges");

    const edges = dbEdges.map(e => ({
        source: e.source,
        target: e.target,
        label: JSON.parse(e.properties)
    }));

    const graph: Graph = { nodes, edges };

    await writeFile(outputFile, JSON.stringify(graph, null, 2));
    console.log(`Successfully exported ${graph.nodes.length} nodes and ${graph.edges.length} edges to ${outputFile}.`);
}

export async function exportToCsv(db: Database, outputFile: string): Promise<void> {
    const nodes = (await db.all("SELECT body FROM nodes")).map(n => JSON.parse(n.body));
    const dbEdges = await db.all("SELECT source, target, properties FROM edges");

    const edges = dbEdges.map(e => ({
        source: e.source,
        target: e.target,
        label: JSON.parse(e.properties)
    }));

    const nodeRecords = nodes.map(n => ({ id: n.id, label: n.label, type: n.type }));
    const edgeRecords = edges.map(e => ({ source: e.source, target: e.target, label: Array.isArray(e.label) ? e.label.join(',') : e.label }));

    const nodeCsv = csvStringify(nodeRecords, { header: true });
    const edgeCsv = csvStringify(edgeRecords, { header: true });

    const baseOutputFile = outputFile.endsWith('.csv') ? outputFile.slice(0, -4) : outputFile;
    const nodeFile = `${baseOutputFile}_nodes.csv`;
    const edgeFile = `${baseOutputFile}_edges.csv`;

    await writeFile(nodeFile, nodeCsv);
    await writeFile(edgeFile, edgeCsv);

    console.log(`Successfully exported ${nodes.length} nodes to ${nodeFile}.`);
    console.log(`Successfully exported ${edges.length} edges to ${edgeFile}.`);
}

export async function exportToXml(db: Database, outputFile: string): Promise<void> {
    const nodes = (await db.all("SELECT body FROM nodes")).map(n => JSON.parse(n.body));
    const dbEdges = await db.all("SELECT source, target, properties FROM edges");

    const edges = dbEdges.map(e => ({
        source: e.source,
        target: e.target,
        label: JSON.parse(e.properties)
    }));

    const xmlObject = {
        graph: {
            nodes: {
                node: nodes.map(n => ({
                    '@_id': n.id,
                    '@_type': n.type,
                    label: n.label
                }))
            },
            edges: {
                edge: edges.map(e => ({
                    '@_source': e.source,
                    '@_target': e.target,
                    label: e.label
                }))
            }
        }
    };

    const builder = new XMLBuilder({
        format: true,
        attributeNamePrefix : "@_",
    });
    const xmlContent = builder.build(xmlObject);

    await writeFile(outputFile, xmlContent);
    console.log(`Successfully exported ${nodes.length} nodes and ${edges.length} edges to ${outputFile}.`);
}

export async function exportToYaml(db: Database, outputFile: string): Promise<void> {
    const nodes = (await db.all("SELECT body FROM nodes")).map(n => JSON.parse(n.body));
    const dbEdges = await db.all("SELECT source, target, properties FROM edges");

    const edges = dbEdges.map(e => ({
        source: e.source,
        target: e.target,
        label: JSON.parse(e.properties)
    }));

    const graph: Graph = { nodes, edges };

    const yamlContent = YAML.stringify(graph);

    await writeFile(outputFile, yamlContent);
    console.log(`Successfully exported ${nodes.length} nodes and ${edges.length} edges to ${outputFile}.`);
}
