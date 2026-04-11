import { validateGraph, MAX_LABEL_LENGTH, MAX_NODES_COUNT, MAX_EDGES_COUNT } from '../validation';
import { openDb, importFromXml, importFromJson } from '../lib';
import fs from 'fs';
import { rm, writeFile } from 'fs/promises';

describe('Sentinel Security and Robustness', () => {
    const testDb = 'test_sentinel.sqlite';

    afterEach(async () => {
        try {
            await rm(testDb, { force: true });
        } catch {
            // Ignore errors
        }
    });

    test('Node label exceeding MAX_LABEL_LENGTH should be rejected', () => {
        const longLabel = 'a'.repeat(MAX_LABEL_LENGTH + 1);
        const invalidGraph = {
            nodes: [
                { id: "1", label: longLabel, type: "claim" }
            ],
            edges: []
        };

        expect(() => validateGraph(invalidGraph)).toThrow(`Node at index 0 label exceeds maximum length of ${MAX_LABEL_LENGTH}`);
    });

    test('XML with missing nodes or edges should be handled gracefully', async () => {
        const xmlContent = `
<graph>
  <nodes>
    <node id="1" type="claim">
      <label>Single Node</label>
    </node>
  </nodes>
</graph>
`;
        const xmlFile = 'no_edges.xml';
        fs.writeFileSync(xmlFile, xmlContent);

        try {
            const db = await openDb(testDb);
            await importFromXml(db, xmlFile);
            const nodes = await db.all("SELECT id FROM nodes");
            const edges = await db.all("SELECT source, target FROM edges");

            expect(nodes).toHaveLength(1);
            expect(edges).toHaveLength(0);
            await db.close();
        } finally {
            if (fs.existsSync(xmlFile)) fs.unlinkSync(xmlFile);
        }
    });

    test('Empty XML graph should be handled gracefully', async () => {
        const xmlContent = `<graph></graph>`;
        const xmlFile = 'empty.xml';
        fs.writeFileSync(xmlFile, xmlContent);

        try {
            const db = await openDb(testDb);
            await importFromXml(db, xmlFile);
            const nodes = await db.all("SELECT id FROM nodes");
            const edges = await db.all("SELECT source, target FROM edges");

            expect(nodes).toHaveLength(0);
            expect(edges).toHaveLength(0);
            await db.close();
        } finally {
            if (fs.existsSync(xmlFile)) fs.unlinkSync(xmlFile);
        }
    });

    test('Nodes count exceeding MAX_NODES_COUNT should be rejected', () => {
        const nodes = Array.from({ length: MAX_NODES_COUNT + 1 }, (_, i) => ({
            id: i.toString(),
            label: `Node ${i}`,
            type: 'node'
        }));
        const invalidGraph = { nodes, edges: [] };

        expect(() => validateGraph(invalidGraph as any)).toThrow(`Graph nodes count exceeds maximum of ${MAX_NODES_COUNT}`);
    });

    test('Edges count exceeding MAX_EDGES_COUNT should be rejected', () => {
        const edges = Array.from({ length: MAX_EDGES_COUNT + 1 }, (_, i) => ({
            source: '1',
            target: '2',
            label: 'edge'
        }));
        const invalidGraph = {
            nodes: [{ id: '1', label: 'N1' }, { id: '2', label: 'N2' }],
            edges
        };

        expect(() => validateGraph(invalidGraph as any)).toThrow(`Graph edges count exceeds maximum of ${MAX_EDGES_COUNT}`);
    });

    test('Node ID with invalid type should be rejected', () => {
        const invalidGraph = {
            nodes: [{ id: { complex: 'id' }, label: 'Invalid ID' }],
            edges: []
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/id' must be a string or number/);
    });

    test('Edge label with invalid type should be rejected', () => {
        const invalidGraph = {
            nodes: [{ id: '1', label: 'N1' }, { id: '2', label: 'N2' }],
            edges: [{ source: '1', target: '2', label: { invalid: 'type' } }]
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/label' must be a string or string array/);
    });

    test('File size exceeding MAX_FILE_SIZE should be rejected', async () => {
        const largeFile = 'large.json';
        // Create a 51MB file (MAX_FILE_SIZE is 50MB)
        const buffer = Buffer.alloc(51 * 1024 * 1024, 'a');
        await writeFile(largeFile, buffer);

        try {
            const db = await openDb(testDb);
            await expect(importFromJson(db, largeFile)).rejects.toThrow(/size exceeds maximum allowed size/);
            await db.close();
        } finally {
            await rm(largeFile, { force: true });
        }
    });
});
