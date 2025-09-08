import { readFile, writeFile, unlink } from "fs/promises";
import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { validateGraph } from './validation';

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

    runner.test("validateGraph rejects invalid graph - no nodes", async () => {
        const invalidGraph = { edges: [] };
        
        try {
            validateGraph(invalidGraph);
            throw new Error("Should have thrown error for missing nodes");
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes("nodes")) {
                throw new Error(`Expected nodes error, got: ${error}`);
            }
        }
    });

    runner.test("validateGraph rejects invalid graph - no edges", async () => {
        const invalidGraph = { nodes: [] };
        
        try {
            validateGraph(invalidGraph);
            throw new Error("Should have thrown error for missing edges");
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes("edges")) {
                throw new Error(`Expected edges error, got: ${error}`);
            }
        }
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

    const success = await runner.run();
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    runTests().catch(console.error);
}