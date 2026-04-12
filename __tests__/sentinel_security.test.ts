import { validateGraph, MAX_LABEL_LENGTH, MAX_NODES_COUNT, MAX_EDGES_COUNT } from '../validation';
import { openDb, importFromXml, importFromJson, MAX_FILE_SIZE } from '../lib';
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

        expect(() => validateGraph(invalidGraph as any)).toThrow(`Node at index 0 label exceeds maximum length of ${MAX_LABEL_LENGTH}`);
    });

    test('Graph exceeding MAX_NODES_COUNT should be rejected', () => {
        const invalidGraph = {
            nodes: Array(MAX_NODES_COUNT + 1).fill({ id: "1", label: "test", type: "claim" }),
            edges: []
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/too many nodes/);
    });

    test('Graph exceeding MAX_EDGES_COUNT should be rejected', () => {
        const invalidGraph = {
            nodes: [],
            edges: Array(MAX_EDGES_COUNT + 1).fill({ source: "1", target: "2", label: "test" })
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/too many edges/);
    });

    test('Node with invalid ID type should be rejected', () => {
        const invalidGraph = {
            nodes: [{ id: { complex: "object" }, label: "test" }],
            edges: []
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/ID must be a string or a number/);
    });

    test('Edge with invalid source type should be rejected', () => {
        const invalidGraph = {
            nodes: [{ id: "1", label: "test" }],
            edges: [{ source: ["invalid"], target: "1", label: "test" }]
        };
        expect(() => validateGraph(invalidGraph as any)).toThrow(/source and target must be strings or numbers/);
    });

    test('File exceeding MAX_FILE_SIZE should be rejected', async () => {
        const largeFile = 'large_test.json';
        const db = await openDb(testDb);
        try {
            // Create a file larger than MAX_FILE_SIZE
            const buffer = Buffer.alloc(MAX_FILE_SIZE + 1);
            await writeFile(largeFile, buffer);

            await expect(importFromJson(db, largeFile)).rejects.toThrow(/exceeds the maximum allowed size/);
        } finally {
            await db.close();
            if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile);
        }
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
});
