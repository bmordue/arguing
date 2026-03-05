import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createHandler } from 'graphql-http/lib/use/express';
import { requireApiKey } from './api/auth';
import { apiRateLimiter } from './api/rateLimiter';
import { createNodesRouter } from './api/routes/v1/nodes';
import { createEdgesRouter } from './api/routes/v1/edges';
import { createGraphRouter } from './api/routes/v1/graph';
import { createWebhooksRouter } from './api/routes/v1/webhooks';
import { createGraphQLSchema } from './api/graphql/schema';
import { Logger } from './logger';
import { Config, parseConfig } from './types';

const logger = new Logger('info');

export async function startServer(config: Config & { port?: number }): Promise<ReturnType<typeof express.application.listen>> {
    const port = config.port ?? 3000;

    const db = await open({
        filename: config.outputFile,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY
    });

    const app = express();
    app.use(express.json());

    // Apply global rate limiting
    app.use(apiRateLimiter);

    // Health check endpoint (no auth required)
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
    });

    // API info endpoint (no auth required)
    app.get('/api', (_req, res) => {
        res.json({
            name: 'Arguing API',
            version: '1',
            endpoints: {
                rest: {
                    v1: {
                        nodes: '/api/v1/nodes',
                        edges: '/api/v1/edges',
                        graph: '/api/v1/graph',
                        webhooks: '/api/v1/webhooks'
                    }
                },
                graphql: '/graphql'
            },
            authentication: 'API key via Authorization: Bearer <key> or X-API-Key header',
            contentNegotiation: ['application/json', 'application/xml', 'application/ld+json']
        });
    });

    // REST API v1 routes (authentication required)
    const v1Router = express.Router();
    v1Router.use(requireApiKey);
    v1Router.use('/nodes', createNodesRouter(db));
    v1Router.use('/edges', createEdgesRouter(db));
    v1Router.use('/graph', createGraphRouter(db));
    v1Router.use('/webhooks', createWebhooksRouter());

    app.use('/api/v1', v1Router);

    // GraphQL endpoint (authentication required)
    const schema = createGraphQLSchema(db);
    app.use('/graphql', requireApiKey, createHandler({ schema }));

    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
    });

    // Global error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        logger.error(`Unhandled error: ${err.message}`);
        res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
    });

    return new Promise(resolve => {
        const server = app.listen(port, () => {
            logger.info(`Arguing API server listening on port ${port}`);
            logger.info(`REST API: http://localhost:${port}/api/v1/`);
            logger.info(`GraphQL: http://localhost:${port}/graphql`);
            logger.info(`API Key: ${process.env.ARGUING_API_KEY || 'arguing-dev-key-change-in-production'}`);
            resolve(server);
        });
    });
}

// Start server when run directly
if (require.main === module) {
    const config = parseConfig();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    startServer({ ...config, port }).catch(err => {
        logger.error(`Failed to start server: ${err}`);
        process.exit(1);
    });
}
