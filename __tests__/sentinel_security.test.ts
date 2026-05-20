import { validateGraph, MAX_LABEL_LENGTH, MAX_NODES_COUNT } from "../validation";
import { openDb, importFromXml, importFromJson, MAX_FILE_SIZE } from "../lib";
import fs from "fs";
import { rm } from "fs/promises";

describe("Sentinel Security and Robustness", () => {
    const testDb = "test_sentinel.sqlite";

    afterEach(async () => {
        try {
            await rm(testDb, { force: true });
        } catch {
            // Ignore errors
        }
    });

    test("Node label exceeding MAX_LABEL_LENGTH should be rejected", () => {
        const longLabel = "a".repeat(MAX_LABEL_LENGTH + 1);
        const invalidGraph = {
            nodes: [{ id: "1", label: longLabel, type: "claim" }],
            edges: [],
        };

        expect(() => validateGraph(invalidGraph)).toThrow(
            `Node at index 0 label exceeds maximum length of ${MAX_LABEL_LENGTH}`
        );
    });

    test("XML with missing nodes or edges should be handled gracefully", async () => {
        const xmlContent = `
<graph>
  <nodes>
    <node id="1" type="claim">
      <label>Single Node</label>
    </node>
  </nodes>
</graph>
`;
        const xmlFile = "no_edges.xml";
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

    test("Empty XML graph should be handled gracefully", async () => {
        const xmlContent = `<graph></graph>`;
        const xmlFile = "empty.xml";
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

    test("Graph exceeding MAX_NODES_COUNT should be rejected", () => {
        const tooManyNodes = Array.from({ length: MAX_NODES_COUNT + 1 }, (_, i) => ({
            id: String(i),
            label: `Node ${i}`,
            type: "node",
        }));

        const invalidGraph = {
            nodes: tooManyNodes,
            edges: [],
        };

        expect(() => validateGraph(invalidGraph)).toThrow(
            `Graph nodes count exceeds maximum of ${MAX_NODES_COUNT}`
        );
    });

    test("File exceeding MAX_FILE_SIZE should be rejected", async () => {
        const largeFile = "large_test.json";
        const db = await openDb(testDb);

        // Create a file slightly larger than MAX_FILE_SIZE
        const handle = fs.openSync(largeFile, "w");
        fs.ftruncateSync(handle, MAX_FILE_SIZE + 1);
        fs.closeSync(handle);

        try {
            await expect(importFromJson(db, largeFile)).rejects.toThrow(/exceeds maximum size/);
        } finally {
            await db.close();
            if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile);
        }
    });
});
