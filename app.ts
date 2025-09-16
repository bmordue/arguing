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
    return yargs(hideBin(process.argv))
        .command('import <format> <file>', 'Import data from a file into the database', (yargs) => {
            return yargs
                .positional('format', {
                    describe: 'the format of the input file',
                    type: 'string',
                })
                .positional('file', {
                    describe: 'the input file',
                    type: 'string',
                });
        }, async (argv) => {
            const db = await openDb("arguing.sqlite");
            console.log(`Importing from ${argv.file} in ${argv.format} format...`);

            const file = argv.file as string;
            if (!file) throw new Error('Input file is required');
            let graph;
            switch (argv.format) {
                case 'json':
                    graph = await importFromJson(db, file);
                    break;
                case 'csv':
                    graph = await importFromCsv(db, file);
                    break;
                case 'xml':
                    graph = await importFromXml(db, file);
                    break;
                case 'yaml':
                    graph = await importFromYaml(db, file);
                    break;
                default:
                    throw new Error('Unknown format');
            }
            console.log(`Successfully imported ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);

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
