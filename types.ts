export interface Node {
    id: string | number;
    label: string;
    type?: string;
}

export interface Edge {
    source: string | number;
    target: string | number;
    label: string | string[];
}

export interface Graph {
    nodes: Node[];
    edges: Edge[];
}

export type OutputFormat = 'sqlite' | 'jsonld' | 'turtle' | 'ntriples';

export interface Config {
    inputFile: string;
    outputFile: string;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    outputFormat: OutputFormat;
}

export const DEFAULT_CONFIG: Config = {
    inputFile: 'graph.json',
    outputFile: 'arguing.sqlite',
    logLevel: 'info',
    outputFormat: 'sqlite',
};

// Parse command line arguments for basic configuration
export function parseConfig(): Config {
    const config = { ...DEFAULT_CONFIG };
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--input' || arg === '-i') {
            config.inputFile = args[i + 1];
            i++;
        } else if (arg === '--output' || arg === '-o') {
            config.outputFile = args[i + 1];
            i++;
        } else if (arg === '--log-level' || arg === '-l') {
            const level = args[i + 1] as Config['logLevel'];
            if (['error', 'warn', 'info', 'debug'].includes(level)) {
                config.logLevel = level;
            }
            i++;
        } else if (arg === '--format' || arg === '-f') {
            const fmt = args[i + 1] as OutputFormat;
            if (['sqlite', 'jsonld', 'turtle', 'ntriples'].includes(fmt)) {
                config.outputFormat = fmt;
            }
            i++;
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Usage: npm start [options]

Options:
  -i, --input <file>      Input JSON file (default: graph.json)
  -o, --output <file>     Output file (default: arguing.sqlite)
  -f, --format <fmt>      Output format: sqlite, jsonld, turtle, ntriples (default: sqlite)
  -l, --log-level <level> Log level: error, warn, info, debug (default: info)
  -h, --help              Show this help message

Examples:
  npm start -- --input data.json --output results.sqlite
  npm start -- --input data.json --output results.jsonld --format jsonld
  npm start -- --input data.json --output results.ttl --format turtle
  npm start -- --input data.json --output results.nt --format ntriples
  npm start -- --log-level debug
            `);
            process.exit(0);
        }
    }
    
    return config;
}