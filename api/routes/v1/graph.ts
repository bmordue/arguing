import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { detectContentType, sendResponse } from '../../contentNegotiation';

export function createGraphRouter(db: Database<sqlite3.Database, sqlite3.Statement>): Router {
    const router = Router();

    // GET /api/v1/graph - get the full graph (nodes + edges)
    router.get('/', async (req: Request, res: Response) => {
        const contentType = detectContentType(req);
        try {
            const nodeRows = await db.all('SELECT body FROM nodes');
            const edgeRows = await db.all('SELECT source, target, properties FROM edges');

            const nodes = nodeRows.map(row => JSON.parse(row.body));
            const edges = edgeRows.map(row => ({
                source: row.source,
                target: row.target,
                properties: JSON.parse(row.properties)
            }));

            sendResponse(res, { nodes, edges }, contentType, 'graph');
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error', message: String(err) });
        }
    });

    return router;
}
