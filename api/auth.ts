import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logger';

const logger = new Logger('info');

// In-memory API key store (in production, use a persistent store)
const validApiKeys = new Set<string>();

// Default development API key (override via ARGUING_API_KEY env var)
const defaultApiKey = process.env.ARGUING_API_KEY || 'arguing-dev-key-change-in-production';
validApiKeys.add(defaultApiKey);

export function addApiKey(key: string): void {
    validApiKeys.add(key);
}

export function removeApiKey(key: string): void {
    validApiKeys.delete(key);
}

export function isValidApiKey(key: string): boolean {
    return validApiKeys.has(key);
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    let apiKey: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
    } else if (typeof apiKeyHeader === 'string') {
        apiKey = apiKeyHeader;
    }

    if (!apiKey) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'API key required. Provide via Authorization: Bearer <key> or X-API-Key header'
        });
        return;
    }

    if (!isValidApiKey(apiKey)) {
        logger.warn(`Invalid API key attempt from ${req.ip}`);
        res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key'
        });
        return;
    }

    next();
}
