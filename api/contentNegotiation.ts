import { Request, Response } from 'express';

export type ContentType = 'json' | 'xml' | 'json-ld';

// JSON-LD context for argument graph data
const JSON_LD_CONTEXT = {
    '@context': {
        '@vocab': 'https://schema.org/',
        'arguing': 'https://github.com/bmordue/arguing/vocab#',
        'id': '@id',
        'nodes': 'arguing:nodes',
        'edges': 'arguing:edges',
        'label': 'arguing:label',
        'type': '@type',
        'source': 'arguing:source',
        'target': 'arguing:target'
    }
};

export function detectContentType(req: Request): ContentType {
    const accept = req.headers['accept'] || '';
    if (accept.includes('application/ld+json')) return 'json-ld';
    if (accept.includes('application/xml') || accept.includes('text/xml')) return 'xml';
    return 'json';
}

function toXmlValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function objectToXml(obj: Record<string, unknown>, rootTag: string): string {
    const inner = Object.entries(obj)
        .map(([key, val]) => {
            if (Array.isArray(val)) {
                return val.map(item =>
                    typeof item === 'object' && item !== null
                        ? objectToXml(item as Record<string, unknown>, key)
                        : `<${key}>${toXmlValue(item)}</${key}>`
                ).join('');
            }
            if (typeof val === 'object' && val !== null) {
                return objectToXml(val as Record<string, unknown>, key);
            }
            return `<${key}>${toXmlValue(val)}</${key}>`;
        })
        .join('');
    return `<${rootTag}>${inner}</${rootTag}>`;
}

export function sendResponse(res: Response, data: unknown, contentType: ContentType, rootTag = 'response'): void {
    switch (contentType) {
        case 'xml': {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            const xmlData = typeof data === 'object' && data !== null
                ? objectToXml(data as Record<string, unknown>, rootTag)
                : `<${rootTag}>${toXmlValue(data)}</${rootTag}>`;
            res.send(`<?xml version="1.0" encoding="UTF-8"?>\n${xmlData}`);
            break;
        }
        case 'json-ld': {
            res.setHeader('Content-Type', 'application/ld+json; charset=utf-8');
            const jsonLdData = {
                ...JSON_LD_CONTEXT,
                ...(typeof data === 'object' && data !== null ? data as Record<string, unknown> : { value: data })
            };
            res.json(jsonLdData);
            break;
        }
        default: {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.json(data);
        }
    }
}
