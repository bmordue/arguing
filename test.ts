import { readFile, unlink } from "fs/promises";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { validateGraph } from './validation';
import { graphToJsonLd, ARGUMENT_CONTEXT, ARG_NS, getNodeType, getEdgePredicate } from './jsonld';
import { graphToTurtle, graphToNTriples } from './rdf';

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

    // --- JSON-LD tests ---

    runner.test("getNodeType maps known types correctly", async () => {
        if (getNodeType('claim') !== 'arg:Claim') throw new Error('claim type mismatch');
        if (getNodeType('premise') !== 'arg:Premise') throw new Error('premise type mismatch');
        if (getNodeType('conclusion') !== 'arg:Conclusion') throw new Error('conclusion type mismatch');
        if (getNodeType('rebuttal') !== 'arg:Rebuttal') throw new Error('rebuttal type mismatch');
        if (getNodeType(undefined) !== 'arg:ArgumentNode') throw new Error('undefined type mismatch');
        if (getNodeType('unknown') !== 'arg:ArgumentNode') throw new Error('unknown type mismatch');
    });

    runner.test("getEdgePredicate maps known labels correctly", async () => {
        if (getEdgePredicate('Because') !== 'arg:because') throw new Error('Because predicate mismatch');
        if (getEdgePredicate('Therefore') !== 'arg:therefore') throw new Error('Therefore predicate mismatch');
        if (getEdgePredicate('custom') !== 'arg:relatedTo') throw new Error('custom predicate mismatch');
    });

    runner.test("graphToJsonLd produces valid JSON-LD document", async () => {
        const graph = {
            nodes: [
                { id: "1", label: "Main claim", type: "claim" },
                { id: "2", label: "Supporting premise", type: "premise" },
            ],
            edges: [
                { source: "2", target: "1", label: "Because" },
            ],
        };

        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;

        if (!('@context' in jsonld)) throw new Error('Missing @context');
        if (jsonld['@type'] !== 'arg:ArgumentGraph') throw new Error('Wrong @type');
        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        if (!Array.isArray(items)) throw new Error('@graph must be an array');
        if (items.length !== 3) throw new Error(`Expected 3 items (2 nodes + 1 edge), got ${items.length}`);

        const claimNode = items.find((n) => n['@id'] === `${ARG_NS}node/1`);
        if (!claimNode) throw new Error('Claim node not found in @graph');
        if (claimNode['@type'] !== 'arg:Claim') throw new Error('Claim node has wrong @type');
        if (claimNode['schema:name'] !== 'Main claim') throw new Error('Claim node has wrong schema:name');

        const edgeItem = items.find((n) => n['@type'] === 'arg:ArgumentRelation');
        if (!edgeItem) throw new Error('Edge not found in @graph');
        const edgeSource = edgeItem['arg:source'] as Record<string, unknown>;
        if (edgeSource['@id'] !== `${ARG_NS}node/2`) throw new Error('Edge source IRI mismatch');
    });

    runner.test("graphToJsonLd includes JSON-LD context with required namespaces", async () => {
        const graph = { nodes: [], edges: [] };
        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;
        const ctx = jsonld['@context'] as Record<string, unknown>;

        if (ctx['schema'] !== 'https://schema.org/') throw new Error('Missing schema: prefix');
        if (typeof ctx['arg'] !== 'string' || !ctx['arg'].startsWith('https://')) {
            throw new Error('Missing or invalid arg: prefix');
        }
        if (typeof ctx['dc'] !== 'string') throw new Error('Missing dc: prefix');
        if (typeof ctx['foaf'] !== 'string') throw new Error('Missing foaf: prefix');
    });

    runner.test("graphToJsonLd handles node with no type (defaults to ArgumentNode)", async () => {
        const graph = {
            nodes: [{ id: "x", label: "A node without type" }],
            edges: [],
        };
        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;
        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        if (items[0]['@type'] !== 'arg:ArgumentNode') {
            throw new Error(`Expected arg:ArgumentNode, got ${items[0]['@type']}`);
        }
    });

    runner.test("graphToJsonLd handles edge with array of labels", async () => {
        const graph = {
            nodes: [
                { id: "a", label: "Node A" },
                { id: "b", label: "Node B" },
            ],
            edges: [{ source: "a", target: "b", label: ["Because", "Therefore"] }],
        };
        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;
        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        const edge = items.find((n) => n['@type'] === 'arg:ArgumentRelation');
        if (!edge) throw new Error('Edge not found');
        const relations = edge['arg:relation'] as string[];
        if (!Array.isArray(relations) || relations.length !== 2) {
            throw new Error(`Expected 2 relations, got ${JSON.stringify(relations)}`);
        }
        if (!relations.includes('arg:because')) throw new Error('Missing arg:because relation');
        if (!relations.includes('arg:therefore')) throw new Error('Missing arg:therefore relation');
    });

    // --- RDF / Turtle tests ---

    runner.test("graphToTurtle produces prefix declarations", async () => {
        const graph = { nodes: [], edges: [] };
        const turtle = graphToTurtle(graph);

        if (!turtle.includes('@prefix rdf:')) throw new Error('Missing rdf prefix');
        if (!turtle.includes('@prefix schema:')) throw new Error('Missing schema prefix');
        if (!turtle.includes('@prefix arg:')) throw new Error('Missing arg prefix');
        if (!turtle.includes('@prefix dc:')) throw new Error('Missing dc prefix');
        if (!turtle.includes('@prefix foaf:')) throw new Error('Missing foaf prefix');
    });

    runner.test("graphToTurtle serializes a node correctly", async () => {
        const graph = {
            nodes: [{ id: "1", label: "A claim", type: "claim" }],
            edges: [],
        };
        const turtle = graphToTurtle(graph);

        if (!turtle.includes('arg:node/1')) throw new Error('Missing node IRI');
        if (!turtle.includes('a arg:Claim')) throw new Error('Missing rdf:type triple');
        if (!turtle.includes('schema:name "A claim"')) throw new Error('Missing schema:name triple');
    });

    runner.test("graphToTurtle serializes an edge correctly", async () => {
        const graph = {
            nodes: [
                { id: "1", label: "Claim" },
                { id: "2", label: "Premise" },
            ],
            edges: [{ source: "2", target: "1", label: "Because" }],
        };
        const turtle = graphToTurtle(graph);

        if (!turtle.includes('arg:edge/0')) throw new Error('Missing edge IRI');
        if (!turtle.includes('a arg:ArgumentRelation')) throw new Error('Missing edge type triple');
        if (!turtle.includes('arg:source arg:node/2')) throw new Error('Missing source triple');
        if (!turtle.includes('arg:target arg:node/1')) throw new Error('Missing target triple');
        if (!turtle.includes('arg:because')) throw new Error('Missing arg:because predicate');
    });

    // --- N-Triples tests ---

    runner.test("graphToNTriples produces valid N-Triples format", async () => {
        const graph = {
            nodes: [{ id: "1", label: "A claim", type: "claim" }],
            edges: [],
        };
        const ntriples = graphToNTriples(graph);
        const lines = ntriples.trim().split('\n');

        for (const line of lines) {
            if (!line.endsWith(' .')) throw new Error(`Line does not end with ' .': ${line}`);
            if (!line.startsWith('<')) throw new Error(`Line does not start with '<': ${line}`);
        }
    });

    runner.test("graphToNTriples serializes node type and label", async () => {
        const graph = {
            nodes: [{ id: "42", label: "A premise", type: "premise" }],
            edges: [],
        };
        const ntriples = graphToNTriples(graph);

        if (!ntriples.includes('argument#node/42')) throw new Error('Missing node IRI');
        if (!ntriples.includes('argument#Premise')) throw new Error('Missing Premise type IRI');
        if (!ntriples.includes('"A premise"')) throw new Error('Missing literal label');
    });

    runner.test("graphToNTriples serializes an edge", async () => {
        const graph = {
            nodes: [
                { id: "1", label: "A" },
                { id: "2", label: "B" },
            ],
            edges: [{ source: "1", target: "2", label: "Therefore" }],
        };
        const ntriples = graphToNTriples(graph);

        if (!ntriples.includes('argument#edge/0')) throw new Error('Missing edge IRI');
        if (!ntriples.includes('argument#ArgumentRelation')) throw new Error('Missing edge type');
        if (!ntriples.includes('argument#therefore')) throw new Error('Missing predicate IRI');
    });

    runner.test("graphToNTriples escapes special characters in literals", async () => {
        const graph = {
            nodes: [{ id: "1", label: 'Say "hello"' }],
            edges: [],
        };
        const ntriples = graphToNTriples(graph);
        if (!ntriples.includes('\\"hello\\"')) throw new Error('Quotes not properly escaped');
    });

    runner.test("ARGUMENT_CONTEXT is consistent with ARG_NS", async () => {
        if (!ARGUMENT_CONTEXT.arg.startsWith('https://')) throw new Error('arg: prefix is not an HTTPS IRI');
        if (ARGUMENT_CONTEXT.Claim !== 'arg:Claim') throw new Error('Claim mapping incorrect');
        if (ARGUMENT_CONTEXT.Premise !== 'arg:Premise') throw new Error('Premise mapping incorrect');
        if (ARGUMENT_CONTEXT.Conclusion !== 'arg:Conclusion') throw new Error('Conclusion mapping incorrect');
        if (ARGUMENT_CONTEXT.Rebuttal !== 'arg:Rebuttal') throw new Error('Rebuttal mapping incorrect');
    });

    const success = await runner.run();
    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    runTests().catch(console.error);
}