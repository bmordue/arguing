/**
 * Arguing API JavaScript/Node.js Client SDK
 *
 * A simple client for the Arguing REST API.
 *
 * Supports both Node.js (using built-in fetch in Node 18+) and browser environments.
 *
 * @example
 * const client = new ArguingClient({ baseUrl: 'http://localhost:3000', apiKey: 'your-api-key' });
 * const graph = await client.getGraph();
 * const nodes = await client.getNodes();
 */

'use strict';

class ArguingAPIError extends Error {
    constructor(statusCode, message) {
        super(`API Error ${statusCode}: ${message}`);
        this.name = 'ArguingAPIError';
        this.statusCode = statusCode;
    }
}

class ArguingClient {
    /**
     * @param {object} options
     * @param {string} [options.baseUrl='http://localhost:3000'] - Base URL of the API server
     * @param {string} [options.apiKey=''] - API key for authentication
     */
    constructor({ baseUrl = 'http://localhost:3000', apiKey = '' } = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        this.apiBase = `${this.baseUrl}/api/v1`;
    }

    async _request(path, { method = 'GET', body, accept = 'application/json' } = {}) {
        const url = `${this.apiBase}${path}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': accept,
            'Content-Type': 'application/json',
        };

        const options = { method, headers };
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (response.status === 204) return null;

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }

        if (!response.ok) {
            const message = (data && data.message) ? data.message : String(data);
            throw new ArguingAPIError(response.status, message);
        }

        return data;
    }

    /** Get all nodes in the argument graph */
    async getNodes(accept = 'application/json') {
        const result = await this._request('/nodes', { accept });
        return result?.nodes ?? result;
    }

    /** Get a specific node by ID */
    async getNode(id) {
        return this._request(`/nodes/${encodeURIComponent(id)}`);
    }

    /** Get all edges in the argument graph */
    async getEdges() {
        const result = await this._request('/edges');
        return result?.edges ?? result;
    }

    /** Get edges filtered by source node ID */
    async getEdgesBySource(sourceId) {
        const result = await this._request(`/edges/filter?source=${encodeURIComponent(sourceId)}`);
        return result?.edges ?? result;
    }

    /** Get edges filtered by target node ID */
    async getEdgesByTarget(targetId) {
        const result = await this._request(`/edges/filter?target=${encodeURIComponent(targetId)}`);
        return result?.edges ?? result;
    }

    /** Get the full argument graph (nodes and edges) */
    async getGraph(accept = 'application/json') {
        return this._request('/graph', { accept });
    }

    /** Register a webhook for event notifications */
    async registerWebhook(url, events, secret) {
        const body = { url, events };
        if (secret) body.secret = secret;
        return this._request('/webhooks', { method: 'POST', body });
    }

    /** List all registered webhooks */
    async listWebhooks() {
        const result = await this._request('/webhooks');
        return result?.webhooks ?? result;
    }

    /** Delete a registered webhook by ID */
    async deleteWebhook(webhookId) {
        return this._request(`/webhooks/${encodeURIComponent(webhookId)}`, { method: 'DELETE' });
    }

    /** Execute a GraphQL query */
    async graphqlQuery(query, variables = {}) {
        const url = `${this.baseUrl}/graphql`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        });
        const data = await response.json();
        if (data.errors) {
            throw new ArguingAPIError(400, data.errors.map(e => e.message).join(', '));
        }
        return data;
    }
}

// CommonJS export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ArguingClient, ArguingAPIError };
}
