import https from 'https';
import http from 'http';
import { createHmac } from 'crypto';
import { URL } from 'url';
import { Logger } from '../logger';

const logger = new Logger('info');

export interface Webhook {
    id: string;
    url: string;
    events: string[];
    secret?: string;
    createdAt: string;
}

export type WebhookEvent = 'graph.updated' | 'node.created' | 'edge.created';

let webhooks: Map<string, Webhook> = new Map();

function generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function registerWebhook(url: string, events: string[], secret?: string): Webhook {
    // Validate URL
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error(`Invalid webhook URL: ${url}`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Webhook URL must use http or https protocol');
    }

    const webhook: Webhook = {
        id: generateId(),
        url,
        events,
        secret,
        createdAt: new Date().toISOString()
    };

    webhooks.set(webhook.id, webhook);
    logger.info(`Registered webhook ${webhook.id} for events: ${events.join(', ')}`);
    return webhook;
}

export function unregisterWebhook(id: string): boolean {
    const deleted = webhooks.delete(id);
    if (deleted) {
        logger.info(`Unregistered webhook ${id}`);
    }
    return deleted;
}

export function listWebhooks(): Webhook[] {
    return Array.from(webhooks.values());
}

export function getWebhook(id: string): Webhook | undefined {
    return webhooks.get(id);
}

export function clearWebhooks(): void {
    webhooks = new Map();
}

export async function emitEvent(event: WebhookEvent, payload: unknown): Promise<void> {
    const matchingWebhooks = Array.from(webhooks.values()).filter(wh =>
        wh.events.includes(event) || wh.events.includes('*')
    );

    if (matchingWebhooks.length === 0) return;

    const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload
    });

    await Promise.allSettled(matchingWebhooks.map(async wh => {
        try {
            await sendWebhookRequest(wh.url, body, wh.secret);
            logger.debug(`Webhook ${wh.id} notified for event ${event}`);
        } catch (err) {
            logger.warn(`Webhook ${wh.id} delivery failed: ${err}`);
        }
    }));
}

function sendWebhookRequest(url: string, body: string, secret?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-Arguing-Event': 'webhook',
                ...(secret ? { 'X-Arguing-Signature': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` } : {})
            },
            timeout: 10000
        };

        const transport = parsedUrl.protocol === 'https:' ? https : http;
        const req = transport.request(options, res => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
            } else {
                reject(new Error(`Webhook returned status ${res.statusCode}`));
            }
            res.resume();
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Webhook request timed out'));
        });

        req.write(body);
        req.end();
    });
}
