import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { detectContentType, sendResponse } from '../../contentNegotiation';

export function createEdgesRouter(db: Database<sqlite3.Database, sqlite3.Statement>): Router {
    const router = Router();

    // GET /api/v1/edges - list all edges
    router.get('/', async (req: Request, res: Response) => {
        const contentType = detectContentType(req);
        try {
            const rows = await db.all('SELECT source, target, properties FROM edges');
            const edges = rows.map(row => ({
                source: row.source,
                target: row.target,
                properties: JSON.parse(row.properties)
            }));
            sendResponse(res, { edges }, contentType, 'edges');
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error', message: String(err) });
        }
    });

    // GET /api/v1/edges?source=:id - filter edges by source node
    // GET /api/v1/edges?target=:id - filter edges by target node
    router.get('/filter', async (req: Request, res: Response) => {
        const contentType = detectContentType(req);
        const { source, target } = req.query;
        try {
            let query = 'SELECT source, target, properties FROM edges WHERE 1=1';
            const params: string[] = [];
            if (typeof source === 'string') {
                query += ' AND source = ?';
                params.push(source);
            }
            if (typeof target === 'string') {
                query += ' AND target = ?';
                params.push(target);
            }
            const rows = await db.all(query, ...params);
            const edges = rows.map(row => ({
                source: row.source,
                target: row.target,
                properties: JSON.parse(row.properties)
            }));
            sendResponse(res, { edges }, contentType, 'edges');
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error', message: String(err) });
        }
    });

    return router;
}
