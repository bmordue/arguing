import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { readFile, writeFile, stat } from "fs/promises";
import { stringify as csvStringify, parse as csvParse } from 'csv/sync';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import YAML from 'yaml';
import { Node, Edge, Graph } from "./types";
import { validateGraph } from "./validation";

export { Node, Edge, Graph };

// Security constant
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// --- Security Helpers ---

/**
 * Validates that a file does not exceed the maximum allowed size.
 * This prevents reading excessively large files into memory (DoS protection).
 */
export async function validateFileSize(filepath: string): Promise<void> {
    try {
        const stats = await stat(filepath);
        if (stats.size > MAX_FILE_SIZE) {
            throw new Error(`File ${filepath} exceeds the maximum allowed size of ${MAX_FILE_SIZE} bytes.`);
        }
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            throw new Error(`File not found: ${filepath}`);
        }
        throw error;
    }
}

// --- Database Functions ---

export async function openDb(filename: string): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    const db = await open({
        filename,
        driver: sqlite3.Database,
    });
    // Enable foreign key constraints for this connection
    await db.get("PRAGMA foreign_keys = ON;");
    return db;
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

/**
 * Sanitizes a string for CSV export to prevent Formula Injection (CSV Injection).
 * If the string starts with characters that can trigger formula execution
 * (=, +, -, @, \t, \r), it is prefixed with a single quote (').
 */
export function sanitizeForCsv(value: string | number | undefined | null): string {
    if (value === null || value === undefined) return '';
    const strValue = String(value);
    if (strValue.length > 0 && /^[=+\-@\t\r]/.test(strValue)) {
        return `'${strValue}`;
    }
    return strValue;
}

export async function insertGraphIntoDb(db: Database, graph: Graph): Promise<void> {
    validateGraph(graph);
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
    await validateFileSize(inputFile);
    const contents = await readFile(inputFile, "utf-8");
    const graph: Graph = JSON.parse(contents);
    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromCsv(db: Database, inputFile: string): Promise<Graph> {
    const baseInputFile = inputFile.endsWith('.csv') ? inputFile.slice(0, -4) : inputFile;
    const nodeFile = `${baseInputFile}_nodes.csv`;
    const edgeFile = `${baseInputFile}_edges.csv`;

    await validateFileSize(nodeFile);
    await validateFileSize(edgeFile);

    const nodeContents = await readFile(nodeFile, 'utf-8');
    const edgeContents = await readFile(edgeFile, 'utf-8');

    const nodeRecords = csvParse(nodeContents, { columns: true, skip_empty_lines: true }) as Array<{ id: string; label: string; type: string }>;
    const edgeRecords = csvParse(edgeContents, { columns: true, skip_empty_lines: true }) as Array<{ source: string; target: string; label: string }>;

    const graph: Graph = {
        nodes: nodeRecords.map((r) => ({ id: r.id, label: r.label, type: r.type })),
        edges: edgeRecords.map((r) => ({ source: r.source, target: r.target, label: [r.label] }))
    };

    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromXml(db: Database, inputFile: string): Promise<Graph> {
    await validateFileSize(inputFile);
    const xmlContent = await readFile(inputFile, 'utf-8');

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        // Ensure nodes and edges are always treated as arrays to prevent crashes on single elements
        isArray: (_name: string, jpath: unknown) => ['graph.nodes.node', 'graph.edges.edge'].includes(jpath as string),
    });
    const xmlObject = parser.parse(xmlContent);

    interface XmlNode {
        '@_id': string;
        '@_type': string;
        label: string;
    }

    interface XmlEdge {
        '@_source': string;
        '@_target': string;
        label: string;
    }

    const graph: Graph = {
        nodes: (xmlObject?.graph?.nodes?.node || []).map((n: XmlNode) => ({
            id: n['@_id'],
            type: n['@_type'],
            label: n.label
        })),
        edges: (xmlObject?.graph?.edges?.edge || []).map((e: XmlEdge) => ({
            source: e['@_source'],
            target: e['@_target'],
            label: [e.label]
        }))
    };

    await insertGraphIntoDb(db, graph);
    return graph;
}

export async function importFromYaml(db: Database, inputFile: string): Promise<Graph> {
    await validateFileSize(inputFile);
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

    const nodeRecords = nodes.map(n => ({
        id: sanitizeForCsv(n.id),
        label: sanitizeForCsv(n.label),
        type: sanitizeForCsv(n.type)
    }));
    const edgeRecords = edges.map(e => ({
        source: sanitizeForCsv(e.source),
        target: sanitizeForCsv(e.target),
        label: sanitizeForCsv(Array.isArray(e.label) ? e.label.join(',') : e.label)
    }));

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
