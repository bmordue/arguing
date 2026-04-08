/* eslint-env jest */
import {
    openDb,
    insertGraphIntoDb,
    exportToCsv,
    Graph,
} from '../lib';
import { rm, readFile } from 'fs/promises';

describe('CSV Injection Vulnerability', () => {
    const dbPath = './test_injection.sqlite';
    const exportBase = './test_injection_export';

    afterEach(async () => {
        try {
            await rm(dbPath, { force: true });
            await rm(`${exportBase}_nodes.csv`, { force: true });
            await rm(`${exportBase}_edges.csv`, { force: true });
        } catch {
            // Ignore errors
        }
    });

    test('reproduce CSV injection in node labels', async () => {
        const db = await openDb(dbPath);

        const injectionGraph: Graph = {
            nodes: [
                { id: '1', label: '=1+2', type: 'claim' },
                { id: '2', label: '+1+2', type: 'premise' },
                { id: '3', label: '-1+2', type: 'rebuttal' },
                { id: '4', label: '@SUM(A1:A2)', type: 'conclusion' }
            ],
            edges: []
        };

        await insertGraphIntoDb(db, injectionGraph);
        await exportToCsv(db, exportBase);

        const nodeCsvContent = await readFile(`${exportBase}_nodes.csv`, 'utf-8');

        // After fix, these should be escaped with a single quote
        expect(nodeCsvContent).toContain("'=1+2");
        expect(nodeCsvContent).toContain("'+1+2");
        expect(nodeCsvContent).toContain("'-1+2");
        expect(nodeCsvContent).toContain("'@SUM(A1:A2)");

        await db.close();
    });
});
