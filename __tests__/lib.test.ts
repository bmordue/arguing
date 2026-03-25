/* eslint-env jest */
import {
    openDb,
    importFromJson,
    exportToJson,
    importFromCsv,
    exportToCsv,
    importFromXml,
    exportToXml,
    importFromYaml,
    exportToYaml,
    exportToJsonLd,
    exportToTurtle,
    exportToNTriples,
    Graph,
} from '../lib';
import { graphToJsonLd, ARGUMENT_CONTEXT, ARG_NS, getNodeType, getEdgePredicate } from '../jsonld';
import { graphToTurtle, graphToNTriples } from '../rdf';
import { rm, readFile } from 'fs/promises';

describe('Data Import/Export', () => {
    const dbPath = './test.sqlite';

    afterEach(async () => {
        try {
            await rm(dbPath, { force: true });
            await rm('./test_export.json', { force: true });
            await rm('./test_export_nodes.csv', { force: true });
            await rm('./test_export_edges.csv', { force: true });
            await rm('./test_export.xml', { force: true });
            await rm('./test_export.yaml', { force: true });
        } catch {
            // Ignore errors
        }
    });

    test('JSON import/export round trip', async () => {
        const db = await openDb(dbPath);
        const inputFile = 'example_graph.json';
        await importFromJson(db, inputFile);

        const outputFile = './test_export.json';
        await exportToJson(db, outputFile);

        const originalGraph: Graph = JSON.parse(await readFile(inputFile, 'utf-8'));
        const exportedGraph: Graph = JSON.parse(await readFile(outputFile, 'utf-8'));

        expect(exportedGraph.nodes.length).toBe(originalGraph.nodes.length);
        expect(exportedGraph.edges.length).toBe(originalGraph.edges.length);
    });

    test('CSV import/export round trip', async () => {
        const db = await openDb(dbPath);
        // First, create the CSV files by exporting the JSON data
        await importFromJson(db, 'example_graph.json');
        await exportToCsv(db, './test_export.csv');

        // Now, import the CSV files into a new database
        const db2 = await openDb('./test2.sqlite');
        await importFromCsv(db2, './test_export.csv');

        // Export the data from the new database to JSON for comparison
        const finalExportFile = './final_export.json';
        await exportToJson(db2, finalExportFile);

        const finalGraph: Graph = JSON.parse(await readFile(finalExportFile, 'utf-8'));
        expect(finalGraph.nodes.length).toBe(9);
        expect(finalGraph.edges.length).toBe(6);

        await rm('./test2.sqlite');
        await rm(finalExportFile);
    });

    test('XML import/export round trip', async () => {
        const db = await openDb(dbPath);
        await importFromJson(db, 'example_graph.json');
        await exportToXml(db, './test_export.xml');

        const db2 = await openDb('./test2.sqlite');
        await importFromXml(db2, './test_export.xml');

        const finalExportFile = './final_export.json';
        await exportToJson(db2, finalExportFile);

        const finalGraph: Graph = JSON.parse(await readFile(finalExportFile, 'utf-8'));
        expect(finalGraph.nodes.length).toBe(9);
        expect(finalGraph.edges.length).toBe(6);

        await rm('./test2.sqlite');
        await rm(finalExportFile);
        await rm('./test_export.xml');
    });

    test('YAML import/export round trip', async () => {
        const db = await openDb(dbPath);
        await importFromJson(db, 'example_graph.json');
        await exportToYaml(db, './test_export.yaml');

        const db2 = await openDb('./test2.sqlite');
        await importFromYaml(db2, './test_export.yaml');

        const finalExportFile = './final_export.json';
        await exportToJson(db2, finalExportFile);

        const finalGraph: Graph = JSON.parse(await readFile(finalExportFile, 'utf-8'));
        expect(finalGraph.nodes.length).toBe(9);
        expect(finalGraph.edges.length).toBe(6);

        await rm('./test2.sqlite');
        await rm(finalExportFile);
        await rm('./test_export.yaml');
    });
});

describe('Linked Data Serialization (unit)', () => {
    const sampleGraph: Graph = {
        nodes: [
            { id: '1', label: 'Main claim', type: 'claim' },
            { id: '2', label: 'Supporting premise', type: 'premise' },
        ],
        edges: [{ source: '2', target: '1', label: 'Because' }],
    };

    test('getNodeType maps known types correctly', () => {
        expect(getNodeType('claim')).toBe('arg:Claim');
        expect(getNodeType('premise')).toBe('arg:Premise');
        expect(getNodeType('conclusion')).toBe('arg:Conclusion');
        expect(getNodeType('rebuttal')).toBe('arg:Rebuttal');
        expect(getNodeType(undefined)).toBe('arg:ArgumentNode');
        expect(getNodeType('unknown')).toBe('arg:ArgumentNode');
    });

    test('getEdgePredicate maps known labels correctly', () => {
        expect(getEdgePredicate('Because')).toBe('arg:because');
        expect(getEdgePredicate('Therefore')).toBe('arg:therefore');
        expect(getEdgePredicate('custom')).toBe('arg:relatedTo');
    });

    test('graphToJsonLd produces valid JSON-LD document', () => {
        const jsonld = graphToJsonLd(sampleGraph) as Record<string, unknown>;

        expect(jsonld).toHaveProperty('@context');
        expect(jsonld['@type']).toBe('arg:ArgumentGraph');

        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        expect(Array.isArray(items)).toBe(true);
        expect(items).toHaveLength(3); // 2 nodes + 1 edge

        const claimNode = items.find(n => n['@id'] === `${ARG_NS}node/1`);
        expect(claimNode).toBeDefined();
        expect(claimNode!['@type']).toBe('arg:Claim');
        expect(claimNode!['schema:name']).toBe('Main claim');

        const edgeItem = items.find(n => n['@type'] === 'arg:ArgumentRelation');
        expect(edgeItem).toBeDefined();
        const edgeSource = edgeItem!['arg:source'] as Record<string, unknown>;
        expect(edgeSource['@id']).toBe(`${ARG_NS}node/2`);
    });

    test('graphToJsonLd includes required namespace prefixes', () => {
        const jsonld = graphToJsonLd({ nodes: [], edges: [] }) as Record<string, unknown>;
        const ctx = jsonld['@context'] as Record<string, unknown>;

        expect(ctx['schema']).toBe('https://schema.org/');
        expect(typeof ctx['arg']).toBe('string');
        expect(typeof ctx['dc']).toBe('string');
        expect(typeof ctx['foaf']).toBe('string');
    });

    test('graphToJsonLd defaults missing type to ArgumentNode', () => {
        const graph: Graph = { nodes: [{ id: 'x', label: 'No type node', type: 'node' }], edges: [] };
        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;
        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        expect(items[0]['@type']).toBe('arg:ArgumentNode');
    });

    test('graphToJsonLd handles edge with array of labels', () => {
        const graph: Graph = {
            nodes: [{ id: 'a', label: 'A', type: 'claim' }, { id: 'b', label: 'B', type: 'premise' }],
            edges: [{ source: 'a', target: 'b', label: ['Because', 'Therefore'] }],
        };
        const jsonld = graphToJsonLd(graph) as Record<string, unknown>;
        const items = jsonld['@graph'] as Array<Record<string, unknown>>;
        const edge = items.find(n => n['@type'] === 'arg:ArgumentRelation');
        expect(edge).toBeDefined();
        const relations = edge!['arg:relation'] as string[];
        expect(relations).toContain('arg:because');
        expect(relations).toContain('arg:therefore');
    });

    test('graphToTurtle produces prefix declarations', () => {
        const turtle = graphToTurtle({ nodes: [], edges: [] });
        expect(turtle).toContain('@prefix rdf:');
        expect(turtle).toContain('@prefix schema:');
        expect(turtle).toContain('@prefix arg:');
        expect(turtle).toContain('@prefix dc:');
        expect(turtle).toContain('@prefix foaf:');
    });

    test('graphToTurtle serializes a node correctly', () => {
        const graph: Graph = { nodes: [{ id: '1', label: 'A claim', type: 'claim' }], edges: [] };
        const turtle = graphToTurtle(graph);
        expect(turtle).toContain('arg:node/1');
        expect(turtle).toContain('a arg:Claim');
        expect(turtle).toContain('schema:name "A claim"');
    });

    test('graphToTurtle serializes an edge correctly', () => {
        const turtle = graphToTurtle(sampleGraph);
        expect(turtle).toContain('arg:edge/0');
        expect(turtle).toContain('a arg:ArgumentRelation');
        expect(turtle).toContain('arg:source arg:node/2');
        expect(turtle).toContain('arg:target arg:node/1');
        expect(turtle).toContain('arg:because');
    });

    test('graphToNTriples produces valid N-Triples format', () => {
        const graph: Graph = { nodes: [{ id: '1', label: 'A claim', type: 'claim' }], edges: [] };
        const ntriples = graphToNTriples(graph);
        const lines = ntriples.trim().split('\n');
        for (const line of lines) {
            expect(line).toMatch(/ \.$/);
            expect(line.startsWith('<')).toBe(true);
        }
    });

    test('graphToNTriples serializes node type and label', () => {
        const graph: Graph = { nodes: [{ id: '42', label: 'A premise', type: 'premise' }], edges: [] };
        const ntriples = graphToNTriples(graph);
        expect(ntriples).toContain('argument#node/42');
        expect(ntriples).toContain('argument#Premise');
        expect(ntriples).toContain('"A premise"');
    });

    test('graphToNTriples serializes an edge', () => {
        const ntriples = graphToNTriples(sampleGraph);
        expect(ntriples).toContain('argument#edge/0');
        expect(ntriples).toContain('argument#ArgumentRelation');
        expect(ntriples).toContain('argument#because');
    });

    test('graphToNTriples escapes special characters in literals', () => {
        const graph: Graph = { nodes: [{ id: '1', label: 'Say "hello"', type: 'claim' }], edges: [] };
        const ntriples = graphToNTriples(graph);
        expect(ntriples).toContain('\\"hello\\"');
    });

    test('ARGUMENT_CONTEXT is consistent with ARG_NS', () => {
        expect(ARGUMENT_CONTEXT.arg).toMatch(/^https?:\/\//);
        expect(ARGUMENT_CONTEXT.Claim).toBe('arg:Claim');
        expect(ARGUMENT_CONTEXT.Premise).toBe('arg:Premise');
        expect(ARGUMENT_CONTEXT.Conclusion).toBe('arg:Conclusion');
        expect(ARGUMENT_CONTEXT.Rebuttal).toBe('arg:Rebuttal');
    });
});

describe('Linked Data Export (integration)', () => {
    const dbPath = './test_ld.sqlite';

    beforeEach(async () => {
        const db = await openDb(dbPath);
        await importFromJson(db, 'example_graph.json');
        await db.close();
    });

    afterEach(async () => {
        try {
            await rm(dbPath, { force: true });
            await rm('./test_export.jsonld', { force: true });
            await rm('./test_export.ttl', { force: true });
            await rm('./test_export.nt', { force: true });
        } catch {
            // Ignore
        }
    });

    test('exportToJsonLd writes a valid JSON-LD file', async () => {
        const db = await openDb(dbPath);
        await exportToJsonLd(db, './test_export.jsonld');
        await db.close();

        const content = await readFile('./test_export.jsonld', 'utf-8');
        const parsed = JSON.parse(content) as Record<string, unknown>;
        expect(parsed).toHaveProperty('@context');
        expect(parsed['@type']).toBe('arg:ArgumentGraph');
        const items = parsed['@graph'] as unknown[];
        expect(items.length).toBe(9 + 6); // 9 nodes + 6 edges
    });

    test('exportToTurtle writes a valid Turtle file', async () => {
        const db = await openDb(dbPath);
        await exportToTurtle(db, './test_export.ttl');
        await db.close();

        const content = await readFile('./test_export.ttl', 'utf-8');
        expect(content).toContain('@prefix arg:');
        expect(content).toContain('arg:node/');
        expect(content).toContain('arg:edge/');
    });

    test('exportToNTriples writes a valid N-Triples file', async () => {
        const db = await openDb(dbPath);
        await exportToNTriples(db, './test_export.nt');
        await db.close();

        const content = await readFile('./test_export.nt', 'utf-8');
        const lines = content.trim().split('\n');
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
            expect(line).toMatch(/ \.$/);
        }
    });
});
