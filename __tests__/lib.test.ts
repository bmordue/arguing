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
    Graph,
} from '../lib';
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
