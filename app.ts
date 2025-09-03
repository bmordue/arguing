import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { readFile } from "fs/promises";
import { Graph, Config, parseConfig } from './types';
import { validateGraph } from './validation';
import { Logger } from './logger';

async function readGraphFromFile(filename: string): Promise<Graph> {
    try {
        const contents = await readFile(filename, "utf-8");
        const parsedData = JSON.parse(contents);
        return validateGraph(parsedData);
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in file ${filename}: ${error.message}`);
        }
        if (error instanceof Error && error.message.includes('ENOENT')) {
            throw new Error(`File not found: ${filename}`);
        }
        throw error;
    }
}

async function writeGraphToDB(graph: Graph, db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
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

    // await db.serialize(async () => {
    await db.run("BEGIN TRANSACTION;");

    const insertNodeStmt = await db.prepare(
        "INSERT INTO nodes (body) VALUES (?)"
    );
    const insertEdgeStmt = await db.prepare(
        "INSERT INTO edges (source, target, properties) VALUES (?, ?, ?)"
    );

    for (const node of graph.nodes) {
        // Normalize node data to ensure consistent structure
        const normalizedNode = {
            id: String(node.id),
            label: node.label,
            type: node.type || 'node'
        };
        const nodeStr = JSON.stringify(normalizedNode);
        await insertNodeStmt.run(nodeStr);
    }

    for (const edge of graph.edges) {
        // Normalize edge labels to always be arrays
        const labels = Array.isArray(edge.label) ? edge.label : [edge.label];
        const edgeStr = JSON.stringify({
            source: String(edge.source),
            target: String(edge.target),
            properties: JSON.stringify(labels),
        });
        await insertEdgeStmt.run(String(edge.source), String(edge.target), edgeStr);
    }

    await insertNodeStmt.finalize();
    await insertEdgeStmt.finalize();
    await db.run("COMMIT TRANSACTION;");
    // });
}

async function main() {
    const config: Config = parseConfig();
    const logger = new Logger(config.logLevel);
    
    try {
        const db = await open({
            filename: config.outputFile,
            driver: sqlite3.Database,
        });
        
        logger.info("Reading graph data...");
        const graph = await readGraphFromFile(config.inputFile);
        logger.info(`Loaded ${graph.nodes.length} nodes and ${graph.edges.length} edges`);
        
        logger.info("Writing to database...");
        await writeGraphToDB(graph, db);
        await db.close();
        
        logger.info(`Successfully created ${config.outputFile} database!`);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error.message);
        } else {
            logger.error(`An unexpected error occurred: ${error}`);
        }
        process.exit(1);
    }
}

main();
