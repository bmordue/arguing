import { readFile, unlink } from "fs/promises";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { validateGraph } from './validation';
import { requireApiKey, isValidApiKey, addApiKey, removeApiKey } from './api/auth';
import { detectContentType, sendResponse } from './api/contentNegotiation';
import { registerWebhook, unregisterWebhook, listWebhooks, clearWebhooks } from './api/webhookManager';
import { createGraphQLSchema } from './api/graphql/schema';
import { startServer } from './server';

// Simple test framework
class TestRunner {
    private tests: Array<() => Promise<void>> = [];
    private passed = 0;
    private failed = 0;

    test(name: string, testFn: () => Promise<void>) {
        this.tests.push(async () => {
            try {
                console.log(`  Running: ${name}`);
                await testFn();
                this.passed++;
                console.log(`  ✓ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`  ✗ ${name}: ${error}`);
            }
        });
    }

    async run() {
        console.log("Running tests...\n");
        for (const test of this.tests) {
            await test();
        }
        console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
}

async function runTests() {
    const runner = new TestRunner();

    runner.test("validateGraph accepts valid graph", async () => {
        const validGraph = {
            nodes: [
                { id: "1", label: "Test node", type: "claim" }
            ],
            edges: [
                { source: "1", target: "1", label: "self-reference" }
            ]
        };
        
        const result = validateGraph(validGraph);
        if (!result) throw new Error("Validation should return truthy result");
    });

    runner.test("database creation and data insertion", async () => {
        const testDbPath = "test.sqlite";
        
        try {
            // Clean up any existing test database
            try {
                await unlink(testDbPath);
            } catch {
                // File might not exist
            }

            const db = await open({
                filename: testDbPath,
                driver: sqlite3.Database,
            });

            // Create tables
            await db.exec(`
                CREATE TABLE IF NOT EXISTS nodes (
                    body TEXT,
                    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
                );
                CREATE INDEX IF NOT EXISTS id_idx ON nodes(id);
            `);

            // Insert test data
            const testNode = JSON.stringify({ id: "test1", label: "Test Node", type: "test" });
            await db.run("INSERT INTO nodes (body) VALUES (?)", testNode);

            // Verify data
            const result = await db.get("SELECT COUNT(*) as count FROM nodes");
            if (result.count !== 1) {
                throw new Error(`Expected 1 node, found ${result.count}`);
            }

            await db.close();
            await unlink(testDbPath);

        } catch (error) {
            // Clean up on error
            try {
                await unlink(testDbPath);
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    });

    runner.test("example_graph.json is valid", async () => {
        try {
            const contents = await readFile("example_graph.json", "utf-8");
            const graph = JSON.parse(contents);
            validateGraph(graph);
        } catch (error) {
            throw new Error(`example_graph.json validation failed: ${error}`);
        }
    });

    // API authentication tests
    runner.test("auth - isValidApiKey returns true for valid key", async () => {
        addApiKey('test-key-123');
        if (!isValidApiKey('test-key-123')) throw new Error('Expected valid key to be recognized');
        removeApiKey('test-key-123');
        if (isValidApiKey('test-key-123')) throw new Error('Expected removed key to be rejected');
    });

    runner.test("auth - requireApiKey rejects missing key", async () => {
        let statusCode = 0;
        const mockReq = { headers: {}, ip: '127.0.0.1' } as Parameters<typeof requireApiKey>[0];
        const mockRes = {
            status: (code: number) => { statusCode = code; return mockRes; },
            json: () => mockRes
        } as unknown as Parameters<typeof requireApiKey>[1];
        const mockNext = () => { throw new Error('next() should not be called'); };
        requireApiKey(mockReq, mockRes, mockNext);
        if (statusCode !== 401) throw new Error(`Expected 401, got ${statusCode}`);
    });

    runner.test("auth - requireApiKey accepts Bearer token", async () => {
        addApiKey('valid-bearer-key');
        let nextCalled = false;
        const mockReq = { headers: { authorization: 'Bearer valid-bearer-key' }, ip: '127.0.0.1' } as Parameters<typeof requireApiKey>[0];
        const mockRes = {} as Parameters<typeof requireApiKey>[1];
        const mockNext = () => { nextCalled = true; };
        requireApiKey(mockReq, mockRes, mockNext);
        removeApiKey('valid-bearer-key');
        if (!nextCalled) throw new Error('Expected next() to be called for valid bearer token');
    });

    // Content negotiation tests
    runner.test("content negotiation - detects JSON by default", async () => {
        const mockReq = { headers: {} } as Parameters<typeof detectContentType>[0];
        const ct = detectContentType(mockReq);
        if (ct !== 'json') throw new Error(`Expected 'json', got '${ct}'`);
    });

    runner.test("content negotiation - detects XML from Accept header", async () => {
        const mockReq = { headers: { accept: 'application/xml' } } as Parameters<typeof detectContentType>[0];
        const ct = detectContentType(mockReq);
        if (ct !== 'xml') throw new Error(`Expected 'xml', got '${ct}'`);
    });

    runner.test("content negotiation - detects JSON-LD from Accept header", async () => {
        const mockReq = { headers: { accept: 'application/ld+json' } } as Parameters<typeof detectContentType>[0];
        const ct = detectContentType(mockReq);
        if (ct !== 'json-ld') throw new Error(`Expected 'json-ld', got '${ct}'`);
    });

    runner.test("content negotiation - sendResponse sets correct XML content-type", async () => {
        let contentTypeHeader = '';
        let responseBody = '';
        const mockRes = {
            setHeader: (key: string, val: string) => { if (key === 'Content-Type') contentTypeHeader = val; },
            send: (body: string) => { responseBody = body; },
            json: () => { /* no-op */ }
        } as unknown as Parameters<typeof sendResponse>[0];
        sendResponse(mockRes, { id: '1', label: 'Test' }, 'xml', 'node');
        if (!contentTypeHeader.includes('application/xml')) throw new Error(`Expected XML content-type, got ${contentTypeHeader}`);
        if (!responseBody.includes('<node>')) throw new Error(`Expected <node> in XML body`);
    });

    // Webhook manager tests
    runner.test("webhook - register and list webhooks", async () => {
        clearWebhooks();
        const hook = registerWebhook('http://example.com/hook', ['graph.updated']);
        if (!hook.id) throw new Error('Expected webhook to have an id');
        if (hook.url !== 'http://example.com/hook') throw new Error('Expected webhook URL to match');
        const hooks = listWebhooks();
        if (hooks.length !== 1) throw new Error(`Expected 1 webhook, got ${hooks.length}`);
        clearWebhooks();
    });

    runner.test("webhook - unregister webhook", async () => {
        clearWebhooks();
        const hook = registerWebhook('http://example.com/hook', ['*']);
        const deleted = unregisterWebhook(hook.id);
        if (!deleted) throw new Error('Expected webhook deletion to return true');
        if (listWebhooks().length !== 0) throw new Error('Expected no webhooks after deletion');
    });

    runner.test("webhook - rejects invalid URL", async () => {
        try {
            registerWebhook('not-a-valid-url', ['*']);
            throw new Error('Expected error for invalid URL');
        } catch (err) {
            if (!(err instanceof Error) || !err.message.includes('Invalid webhook URL')) {
                throw new Error(`Expected invalid URL error, got: ${err}`);
            }
        }
    });

    // GraphQL schema test
    runner.test("GraphQL schema - creates schema and can query nodes", async () => {
        const testDbPath = "test_gql.sqlite";
        try {
            try { await unlink(testDbPath); } catch { /* ok */ }
            const db = await open({ filename: testDbPath, driver: sqlite3.Database });
            await db.exec(`
                CREATE TABLE IF NOT EXISTS nodes (
                    body TEXT,
                    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
                );
                CREATE TABLE IF NOT EXISTS edges (
                    source TEXT, target TEXT, properties TEXT,
                    UNIQUE(source, target, properties) ON CONFLICT REPLACE
                );
            `);
            await db.run("INSERT INTO nodes (body) VALUES (?)", JSON.stringify({ id: 'n1', label: 'Test', type: 'claim' }));

            const schema = createGraphQLSchema(db);
            if (!schema) throw new Error('Expected schema to be created');

            await db.close();
            await unlink(testDbPath);
        } catch (error) {
            try { await unlink(testDbPath); } catch { /* ignore */ }
            throw error;
        }
    });

    // HTTP server integration test
    runner.test("API server - starts and responds to health check", async () => {
        const testDbPath = "test_server.sqlite";
        let server: ReturnType<typeof import('http').createServer> | undefined;
        try {
            try { await unlink(testDbPath); } catch { /* ok */ }

            const db = await open({ filename: testDbPath, driver: sqlite3.Database });
            await db.exec(`
                CREATE TABLE IF NOT EXISTS nodes (
                    body TEXT,
                    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
                );
                CREATE TABLE IF NOT EXISTS edges (
                    source TEXT, target TEXT, properties TEXT
                );
            `);
            await db.close();

            server = await startServer({ inputFile: 'graph.json', outputFile: testDbPath, logLevel: 'error', port: 13579 });

            const res = await fetch('http://localhost:13579/health');
            if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
            const data = await res.json() as { status: string };
            if (data.status !== 'ok') throw new Error(`Expected status 'ok', got '${data.status}'`);

        } finally {
            if (server) server.close();
            try { await unlink(testDbPath); } catch { /* ignore */ }
        }
    });

    runner.test("API server - REST endpoints require authentication", async () => {
        const testDbPath = "test_server2.sqlite";
        let server: ReturnType<typeof import('http').createServer> | undefined;
        try {
            try { await unlink(testDbPath); } catch { /* ok */ }

            const db = await open({ filename: testDbPath, driver: sqlite3.Database });
            await db.exec(`
                CREATE TABLE IF NOT EXISTS nodes (
                    body TEXT,
                    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
                );
                CREATE TABLE IF NOT EXISTS edges (
                    source TEXT, target TEXT, properties TEXT
                );
            `);
            await db.close();

            server = await startServer({ inputFile: 'graph.json', outputFile: testDbPath, logLevel: 'error', port: 13580 });

            // Without API key - should get 401
            const noAuthRes = await fetch('http://localhost:13580/api/v1/nodes');
            if (noAuthRes.status !== 401) throw new Error(`Expected 401 without auth, got ${noAuthRes.status}`);

            // With API key - should get 200
            const authRes = await fetch('http://localhost:13580/api/v1/nodes', {
                headers: { 'Authorization': 'Bearer arguing-dev-key-change-in-production' }
            });
            if (authRes.status !== 200) throw new Error(`Expected 200 with valid auth, got ${authRes.status}`);

        } finally {
            if (server) server.close();
            try { await unlink(testDbPath); } catch { /* ignore */ }
        }
    });

    const success = await runner.run();
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    runTests().catch(console.error);
}