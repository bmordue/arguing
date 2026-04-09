import { openDb, initializeDb, importFromXml } from '../lib';
import fs from 'fs';
import path from 'path';

describe('Security and Robustness', () => {
    const testDb = 'test_security.sqlite';

    beforeEach(async () => {
        if (fs.existsSync(testDb)) {
            fs.unlinkSync(testDb);
        }
    });

    afterAll(async () => {
        if (fs.existsSync(testDb)) {
            fs.unlinkSync(testDb);
        }
    });

    test('SQLite foreign key enforcement', async () => {
        const db = await openDb(testDb);
        await initializeDb(db);

        // Attempt to insert an edge with non-existent source and target IDs
        // Should fail because FOREIGN KEY(source) REFERENCES nodes(id)
        await expect(
            db.run("INSERT INTO edges (source, target, properties) VALUES ('non-existent-1', 'non-existent-2', '[]')")
        ).rejects.toThrow(/FOREIGN KEY constraint failed/);

        await db.close();
    });

    test('XML robustness with single node and edge', async () => {
        const xmlContent = `
<graph>
  <nodes>
    <node id="1" type="claim">
      <label>Single Node</label>
    </node>
  </nodes>
  <edges>
    <edge source="1" target="1">
      <label>Self Edge</label>
    </edge>
  </edges>
</graph>
`;
        const xmlFile = 'single_element.xml';
        fs.writeFileSync(xmlFile, xmlContent);

        const db = await openDb(testDb);

        try {
            await importFromXml(db, xmlFile);
            const nodes = await db.all("SELECT id FROM nodes");
            const edges = await db.all("SELECT source, target FROM edges");

            expect(nodes).toHaveLength(1);
            expect(nodes[0].id).toBe("1");
            expect(edges).toHaveLength(1);
            expect(edges[0].source).toBe("1");
        } finally {
            await db.close();
            if (fs.existsSync(xmlFile)) fs.unlinkSync(xmlFile);
        }
    });
});
