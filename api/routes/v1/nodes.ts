import { Router, Request, Response } from 'express';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { detectContentType, sendResponse } from '../../contentNegotiation';

export function createNodesRouter(db: Database<sqlite3.Database, sqlite3.Statement>): Router {
    const router = Router();

    // GET /api/v1/nodes - list all nodes
    router.get('/', async (req: Request, res: Response) => {
        const contentType = detectContentType(req);
        try {
            const rows = await db.all('SELECT body FROM nodes');
            const nodes = rows.map(row => JSON.parse(row.body));
            sendResponse(res, { nodes }, contentType, 'nodes');
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error', message: String(err) });
        }
    });

    // GET /api/v1/nodes/:id - get a specific node
    router.get('/:id', async (req: Request, res: Response) => {
        const contentType = detectContentType(req);
        try {
            const row = await db.get('SELECT body FROM nodes WHERE id = ?', req.params.id);
            if (!row) {
                res.status(404).json({ error: 'Not Found', message: `Node '${req.params.id}' not found` });
                return;
            }
            sendResponse(res, JSON.parse(row.body), contentType, 'node');
        } catch (err) {
            res.status(500).json({ error: 'Internal Server Error', message: String(err) });
        }
    });

    return router;
}
