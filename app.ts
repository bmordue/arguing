import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
    openDb,
    importFromJson,
    importFromCsv,
    importFromXml,
    importFromYaml,
    exportToJson,
    exportToCsv,
    exportToXml,
    exportToYaml,
} from "./lib";

async function main() {
    yargs(hideBin(process.argv))
        .command('import <format> <file>', 'Import data from a file into the database', (yargs) => {
            return yargs
                .positional('format', {
                    describe: 'the format of the input file',
                    choices: ['json', 'csv', 'xml', 'yaml'],
                    demandOption: true,
                })
                .positional('file', {
                    describe: 'the path to the input file',
                    type: 'string',
                    demandOption: true,
                })
        }, async (argv) => {
            const db = await openDb("arguing.sqlite");
            console.log(`Importing from ${argv.file} in ${argv.format} format...`);

            if (argv.format === 'json') {
                const graph = await importFromJson(db, argv.file);
                console.log(`Successfully imported ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
            } else if (argv.format === 'csv') {
                const graph = await importFromCsv(db, argv.file);
                console.log(`Successfully imported ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
            } else if (argv.format === 'xml') {
                const graph = await importFromXml(db, argv.file);
                console.log(`Successfully imported ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
            } else if (argv.format === 'yaml') {
                const graph = await importFromYaml(db, argv.file);
                console.log(`Successfully imported ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
            }

            await db.close();
        })
        .command('export <format> <file>', 'Export data from the database to a file', (yargs) => {
            return yargs
                .positional('format', {
                    describe: 'the format of the output file',
                    choices: ['json', 'csv', 'xml', 'yaml'],
                    demandOption: true,
                })
                .positional('file', {
                    describe: 'the path to the output file',
                    type: 'string',
                    demandOption: true,
                })
        }, async (argv) => {
            const db = await openDb("arguing.sqlite");

            if (argv.format === 'json') {
                await exportToJson(db, argv.file);
            } else if (argv.format === 'csv') {
                await exportToCsv(db, argv.file);
            } else if (argv.format === 'xml') {
                await exportToXml(db, argv.file);
            } else if (argv.format === 'yaml') {
                await exportToYaml(db, argv.file);
            }

            await db.close();
        })
        .demandCommand(1, 'You must provide a command: import or export.')
        .help()
        .argv;
}

main();
