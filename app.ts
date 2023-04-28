import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { readFile } from "fs/promises";

interface Node {
    id: string;
    label: string;
    type: string;
}

interface Edge {
    source: string;
    target: string;
    label: string[];
}

interface Graph {
    nodes: Node[];
    edges: Edge[];
}

async function readGraphFromFile(filename: string): Promise<Graph> {
    const contents = await readFile(filename, "utf-8");
    return JSON.parse(contents);
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
        const nodeStr = JSON.stringify(node);
        await insertNodeStmt.run(nodeStr);
    }

    for (const edge of graph.edges) {
        const edgeStr = JSON.stringify({
            source: edge.source,
            target: edge.target,
            properties: JSON.stringify(edge.label),
        });
        await insertEdgeStmt.run(edge.source, edge.target, edgeStr);
    }

    await insertNodeStmt.finalize();
    await insertEdgeStmt.finalize();
    await db.run("COMMIT TRANSACTION;");
    // });
}

async function main() {
    const db = await open({
        filename: "arguing.sqlite",
        driver: sqlite3.Database,
    });
    const graph = await readGraphFromFile("graph.json");
    await writeGraphToDB(graph, db);
    await db.close();
}

main();
