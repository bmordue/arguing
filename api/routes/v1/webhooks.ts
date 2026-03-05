import { Router, Request, Response } from 'express';
import {
    registerWebhook,
    unregisterWebhook,
    listWebhooks,
    getWebhook
} from '../../webhookManager';
import { webhookRateLimiter } from '../../rateLimiter';

export function createWebhooksRouter(): Router {
    const router = Router();

    // GET /api/v1/webhooks - list registered webhooks
    router.get('/', (_req: Request, res: Response) => {
        const hooks = listWebhooks().map(wh => ({
            id: wh.id,
            url: wh.url,
            events: wh.events,
            createdAt: wh.createdAt
        }));
        res.json({ webhooks: hooks });
    });

    // GET /api/v1/webhooks/:id - get a specific webhook
    router.get('/:id', (req: Request, res: Response) => {
        const hook = getWebhook(String(req.params.id));
        if (!hook) {
            res.status(404).json({ error: 'Not Found', message: `Webhook '${req.params.id}' not found` });
            return;
        }
        res.json({ id: hook.id, url: hook.url, events: hook.events, createdAt: hook.createdAt });
    });

    // POST /api/v1/webhooks - register a new webhook
    router.post('/', webhookRateLimiter, (req: Request, res: Response) => {
        const { url, events, secret } = req.body as {
            url?: string;
            events?: string[];
            secret?: string;
        };

        if (!url || typeof url !== 'string') {
            res.status(400).json({ error: 'Bad Request', message: 'Missing or invalid "url" field' });
            return;
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            res.status(400).json({ error: 'Bad Request', message: 'Missing or invalid "events" array' });
            return;
        }

        const validEvents = ['graph.updated', 'node.created', 'edge.created', '*'];
        const invalidEvents = events.filter(e => !validEvents.includes(e));
        if (invalidEvents.length > 0) {
            res.status(400).json({
                error: 'Bad Request',
                message: `Invalid event types: ${invalidEvents.join(', ')}. Valid events: ${validEvents.join(', ')}`
            });
            return;
        }

        try {
            const hook = registerWebhook(url, events, secret);
            res.status(201).json({
                id: hook.id,
                url: hook.url,
                events: hook.events,
                createdAt: hook.createdAt
            });
        } catch (err) {
            res.status(400).json({ error: 'Bad Request', message: String(err) });
        }
    });

    // DELETE /api/v1/webhooks/:id - remove a webhook
    router.delete('/:id', (req: Request, res: Response) => {
        const deleted = unregisterWebhook(String(req.params.id));
        if (!deleted) {
            res.status(404).json({ error: 'Not Found', message: `Webhook '${req.params.id}' not found` });
            return;
        }
        res.status(204).send();
    });

    return router;
}
