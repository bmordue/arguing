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

2. **Place your JSON file** as `graph.json` in the project root, or modify the filename in `app.ts`

3. **Run the conversion:**
   ```bash
   npm start
   ```

This will:
- Compile the TypeScript code
- Read your `graph.json` file
- Create/update `arguing.sqlite` database with your argument data

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
- `id` (string): Unique identifier
- `label` (string): The actual text of the argument component
- `type` (string): Type of argument component (claim, premise, conclusion, rebuttal, etc.)

### Edge Properties  
- `source` (string): ID of the source node
- `target` (string): ID of the target node  
- `label` (string[]): Array of relationship labels (e.g., ["Because"], ["Therefore"])

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
- `app.ts` - Main application logic
- `package.json` - Project configuration and dependencies
- `tsconfig.json` - TypeScript compiler configuration
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