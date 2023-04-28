import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';

const db = new sqlite3.Database(':memory:');

async function createTables() {
    await new Promise<void>((resolve, reject) => {
        db.run(`
      CREATE TABLE IF NOT EXISTS nodes (
        body TEXT,
        id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
      );
    `, err => {
            if (err) reject(err);
            else resolve();
        });
    });

    await new Promise<void>((resolve, reject) => {
        db.run(`
      CREATE TABLE IF NOT EXISTS edges (
        source TEXT,
        target TEXT,
        properties TEXT,
        UNIQUE(source, target, properties) ON CONFLICT REPLACE,
        FOREIGN KEY(source) REFERENCES nodes(id),
        FOREIGN KEY(target) REFERENCES nodes(id)
      );
    `, err => {
            if (err) reject(err);
            else resolve();
        });
    });

    await new Promise<void>((resolve, reject) => {
        db.run('BEGIN', err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function insertNode(node: any) {
    await new Promise<void>((resolve, reject) => {
        db.run(`
      INSERT INTO nodes (body) VALUES (?);
    `, JSON.stringify(node), err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function insertEdge(edge: any) {
    await new Promise<void>((resolve, reject) => {
        db.run(`
      INSERT INTO edges (source, target, properties)
      VALUES (?, ?, ?);
    `, [edge.source, edge.target, JSON.stringify(edge.properties)], err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

async function endTransaction() {
    await new Promise<void>((resolve, reject) => {
        db.run('COMMIT', err => {
            if (err) reject(err);
            else resolve();
        });
    });

    db.close();
}

async function loadGraphFromFile(filePath: string) {
    const graph = JSON.parse(readFileSync(filePath, 'utf8'));

    await createTables();

    for (const node of graph.nodes) {
        await insertNode(node);
    }

    for (const edge of graph.edges) {
        await insertEdge(edge);
    }

    await endTransaction();
}

loadGraphFromFile('graph.json').catch(console.error);
