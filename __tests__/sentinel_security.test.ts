import { validateGraph, MAX_LABEL_LENGTH } from '../validation';
import { openDb, importFromXml } from '../lib';
import fs from 'fs';
import { rm } from 'fs/promises';

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
});
