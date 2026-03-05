# Arguing

A TypeScript/Node.js tool for converting structured argument data into a queryable SQLite database. This project helps model and analyze logical argument structures such as debates, claims, premises, and conclusions.

## What it does

The **Arguing** tool takes JSON files containing structured argument graphs and converts them into a SQLite database for easy querying and analysis. This is particularly useful for:

- **Argument mapping**: Visualizing and storing logical argument structures
- **Debate analysis**: Modeling complex debates with multiple claims and rebuttals
- **Educational tools**: Teaching critical thinking and logical reasoning
- **Research**: Analyzing argumentation patterns in large datasets

## Data Structure

Arguments are modeled as directed graphs where:

- **Nodes** represent argument components:
    - Claims (main assertions)
    - Premises (supporting evidence)
    - Conclusions (logical outcomes)
    - Rebuttals (counter-arguments)

- **Edges** represent logical relationships:
    - "Because" (premise supports claim)
    - "Therefore" (conclusion follows from premise)
    - Custom relationship types

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/bmordue/arguing.git
    cd arguing
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

1. **Prepare your argument data** in JSON format (see [Data Format](#data-format) below)

2. **Basic usage:**
   ```bash
   npm start
   ```
   This will process `graph.json` and create `arguing.sqlite`.

3. **Advanced usage with options:**
   ```bash
   npm start -- --input my_data.json --output results.sqlite --log-level debug
   ```

4. **Export to linked data formats:**
   ```bash
   # JSON-LD (for semantic web and knowledge graphs)
   npm start -- --input my_data.json --output results.jsonld --format jsonld

   # Turtle RDF (compact, human-readable RDF)
   npm start -- --input my_data.json --output results.ttl --format turtle

   # N-Triples RDF (line-by-line, machine-readable RDF)
   npm start -- --input my_data.json --output results.nt --format ntriples
   ```

5. **See all available options:**
   ```bash
   npm start -- --help
   ```

### Command Line Options

- `-i, --input <file>`: Specify input JSON file (default: graph.json)
- `-o, --output <file>`: Specify output file (default: arguing.sqlite)
- `-f, --format <fmt>`: Output format: `sqlite`, `jsonld`, `turtle`, `ntriples` (default: sqlite)
- `-l, --log-level <level>`: Set logging level: error, warn, info, debug (default: info)
- `-h, --help`: Show help message

## Testing

Run the test suite to verify functionality:

```bash
npm test
```

The test suite validates:
- Input data validation
- Database creation and operations
- File format compatibility
- Error handling scenarios

## Data Format

### Input JSON Structure

```json
{
    "nodes": [
        {
            "id": "1",
            "label": "16-year-olds should be allowed to vote",
            "type": "claim"
        },
        {
            "id": "2",
            "label": "16-year-olds can make informed decisions",
            "type": "premise"
        }
    ],
    "edges": [
        {
            "source": "2",
            "target": "1",
            "label": ["Because"]
        }
    ]
}
```

### Node Properties
- `id` (string|number): Unique identifier (flexible format support)
- `label` (string): The actual text of the argument component
- `type` (string, optional): Type of argument component (claim, premise, conclusion, rebuttal, etc.)
  - Defaults to 'node' if not specified

### Edge Properties

- `source` (string): ID of the source node
- `target` (string): ID of the target node
- `label` (string[]): Array of relationship labels (e.g., ["Because"], ["Therefore"])

## Linked Data / Semantic Web Output

The tool can export argument graphs to **linked data** formats compatible with the semantic web. This enables data discovery, integration with knowledge graphs, and consumption by RDF-aware tools and crawlers.

### Vocabularies Used

| Prefix   | Namespace                              | Purpose                                   |
|----------|----------------------------------------|-------------------------------------------|
| `arg:`   | `https://example.org/argument#`        | Argument-specific types and properties    |
| `schema:` | `https://schema.org/`                 | Schema.org (e.g. `schema:name` for labels) |
| `dc:`    | `http://purl.org/dc/elements/1.1/`     | Dublin Core metadata elements             |
| `foaf:`  | `http://xmlns.com/foaf/0.1/`           | FOAF (Friend of a Friend) vocabulary      |
| `rdf:`   | `http://www.w3.org/1999/02/22-rdf-syntax-ns#` | RDF core vocabulary              |

### Argument Ontology

Node types are mapped to semantic types:

| Input `type`  | Linked Data type    |
|---------------|---------------------|
| `claim`       | `arg:Claim`         |
| `premise`     | `arg:Premise`       |
| `conclusion`  | `arg:Conclusion`    |
| `rebuttal`    | `arg:Rebuttal`      |
| *(default)*   | `arg:ArgumentNode`  |

Edge labels are mapped to RDF predicates:

| Edge `label`  | RDF predicate       |
|---------------|---------------------|
| `Because`     | `arg:because`       |
| `Therefore`   | `arg:therefore`     |
| *(other)*     | `arg:relatedTo`     |

### JSON-LD Output

JSON-LD embeds a `@context` so that any JSON-LD processor can interpret the data as RDF.

```json
{
  "@context": {
    "schema": "https://schema.org/",
    "arg": "https://example.org/argument#",
    "dc": "http://purl.org/dc/elements/1.1/",
    "foaf": "http://xmlns.com/foaf/0.1/",
    "label": "schema:name",
    "source": { "@id": "arg:source", "@type": "@id" },
    "target": { "@id": "arg:target", "@type": "@id" }
  },
  "@type": "arg:ArgumentGraph",
  "@graph": [
    {
      "@id": "https://example.org/argument#node/1",
      "@type": "arg:Claim",
      "schema:name": "16-year-olds should be allowed to vote"
    },
    {
      "@id": "https://example.org/argument#edge/0",
      "@type": "arg:ArgumentRelation",
      "arg:source": { "@id": "https://example.org/argument#node/2" },
      "arg:target": { "@id": "https://example.org/argument#node/1" },
      "arg:relation": ["arg:because"]
    }
  ]
}
```

### Turtle Output

Turtle is a concise, human-readable RDF format:

```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix schema: <https://schema.org/> .
@prefix arg: <https://example.org/argument#> .

arg:node/1 a arg:Claim ;
    schema:name "16-year-olds should be allowed to vote" .

arg:edge/0 a arg:ArgumentRelation ;
    arg:source arg:node/2 ;
    arg:target arg:node/1 ;
    arg:relation arg:because .
```

### N-Triples Output

N-Triples is a line-by-line RDF format suitable for streaming and processing by RDF tools:

```ntriples
<https://example.org/argument#node/1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://example.org/argument#Claim> .
<https://example.org/argument#node/1> <https://schema.org/name> "16-year-olds should be allowed to vote" .
```

## Database Schema

The tool creates a SQLite database with the following structure:

### `nodes` table

```sql
CREATE TABLE nodes (
  body TEXT,                    -- JSON representation of the node
  id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
);
```

### `edges` table

```sql
CREATE TABLE edges (
  source TEXT,                  -- Source node ID
  target TEXT,                  -- Target node ID
  properties TEXT,              -- JSON representation of edge properties
  FOREIGN KEY(source) REFERENCES nodes(id),
  FOREIGN KEY(target) REFERENCES nodes(id)
);
```

## Examples

The repository includes two example files:

### `example_graph.json`

A simple argument about lowering the voting age to 16, demonstrating:

- Claims and counter-claims
- Supporting premises
- Logical conclusions
- Rebuttals

### `graph.json`

A more complex example with political figures and their relationships.

## Development

### Building

```bash
npm run prestart
# or
npx tsc
```

### File Structure
- `app.ts` - Main application logic and workflow orchestration
- `types.ts` - TypeScript interfaces and configuration management
- `validation.ts` - Input validation functions  
- `logger.ts` - Structured logging utility
- `jsonld.ts` - JSON-LD context definitions and graph serialization
- `rdf.ts` - RDF serialization (Turtle and N-Triples formats)
- `test.ts` - Comprehensive test suite
- `package.json` - Project configuration and dependencies
- `tsconfig.json` - TypeScript compiler configuration
- `ARCHITECTURE.md` - Detailed architecture documentation
- `graph.json` - Input argument data
- `example_graph.json` - Example argument structure
- `built/` - Compiled JavaScript output
- `arguing.sqlite` - Generated database (after running)

### Dependencies

- **sqlite3** - SQLite database driver
- **sqlite** - Promise-based SQLite wrapper
- **typescript** - TypeScript compiler
- **@types/node** - Node.js type definitions

## Querying the Database

Once your data is in the SQLite database, you can query it using standard SQL:

```sql
-- Find all claims
SELECT json_extract(body, '$.label') as claim
FROM nodes
WHERE json_extract(body, '$.type') = 'claim';

-- Find all relationships of type "Because"
SELECT s.label as source, t.label as target
FROM edges e
JOIN (SELECT id, json_extract(body, '$.label') as label FROM nodes) s ON e.source = s.id
JOIN (SELECT id, json_extract(body, '$.label') as label FROM nodes) t ON e.target = t.id
WHERE json_extract(e.properties, '$.properties') LIKE '%Because%';
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample data
5. Submit a pull request

## License

ISC License
