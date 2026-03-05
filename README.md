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

4. **See all available options:**
   ```bash
   npm start -- --help
   ```

### Command Line Options

- `-i, --input <file>`: Specify input JSON file (default: graph.json)
- `-o, --output <file>`: Specify output SQLite file (default: arguing.sqlite)  
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
- `app.ts` - Main CLI application logic and workflow orchestration
- `server.ts` - HTTP API server entry point
- `types.ts` - TypeScript interfaces and configuration management
- `validation.ts` - Input validation functions  
- `logger.ts` - Structured logging utility
- `test.ts` - Comprehensive test suite
- `api/` - API interoperability layer (auth, rate limiting, routes, GraphQL, webhooks)
- `sdk/` - Client SDK libraries (JavaScript, Python) and integration examples
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
- **express** - HTTP server framework (API server)
- **express-rate-limit** - Rate limiting middleware
- **graphql** - GraphQL runtime
- **graphql-http** - GraphQL HTTP server handler
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

## API Server

The Arguing tool includes an HTTP API server that exposes the graph data via REST and GraphQL endpoints.

### Starting the API Server

1. **First create the database** (if not already done):
   ```bash
   npm start -- --input example_graph.json --output arguing.sqlite
   ```

2. **Start the API server:**
   ```bash
   npm run serve
   ```
   The server starts on port 3000 by default. Set `PORT` env var to override.

3. **Configure the API key:**
   Set `ARGUING_API_KEY` environment variable (default: `arguing-dev-key-change-in-production`):
   ```bash
   ARGUING_API_KEY=my-secret-key npm run serve
   ```

### Authentication

All API endpoints (except `/health` and `/api`) require an API key, provided via:
- `Authorization: Bearer <key>` header
- `X-API-Key: <key>` header

### REST API (v1)

Base URL: `http://localhost:3000/api/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/nodes` | List all argument nodes |
| GET | `/api/v1/nodes/:id` | Get a specific node |
| GET | `/api/v1/edges` | List all edges |
| GET | `/api/v1/edges/filter?source=:id` | Filter edges by source |
| GET | `/api/v1/edges/filter?target=:id` | Filter edges by target |
| GET | `/api/v1/graph` | Get the full graph |
| GET | `/api/v1/webhooks` | List registered webhooks |
| POST | `/api/v1/webhooks` | Register a webhook |
| GET | `/api/v1/webhooks/:id` | Get a specific webhook |
| DELETE | `/api/v1/webhooks/:id` | Remove a webhook |

#### Content Negotiation

The REST API supports multiple response formats via the `Accept` header:
- `application/json` (default)
- `application/xml`
- `application/ld+json` (JSON-LD with argument vocabulary context)

```bash
# JSON (default)
curl -H "Authorization: Bearer <key>" http://localhost:3000/api/v1/nodes

# XML
curl -H "Authorization: Bearer <key>" -H "Accept: application/xml" http://localhost:3000/api/v1/graph

# JSON-LD
curl -H "Authorization: Bearer <key>" -H "Accept: application/ld+json" http://localhost:3000/api/v1/graph
```

### GraphQL

GraphQL endpoint: `http://localhost:3000/graphql`

```graphql
# Query all nodes
query {
    nodes {
        id
        label
        type
    }
}

# Query a specific node
query {
    node(id: "1") {
        id
        label
        type
    }
}

# Query full graph
query {
    graph {
        nodes { id label type }
        edges { source target properties }
    }
}
```

```bash
curl -X POST -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ nodes { id label type } }"}' \
  http://localhost:3000/graphql
```

### Webhooks

Register webhooks to receive real-time notifications when the graph is updated:

```bash
# Register a webhook
curl -X POST -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-server.com/hook","events":["graph.updated","node.created"]}' \
  http://localhost:3000/api/v1/webhooks

# Available events: graph.updated, node.created, edge.created, *
```

The webhook will receive POST requests with:
```json
{
  "event": "graph.updated",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": { ... }
}
```

### Rate Limiting

- General API: 100 requests per 15 minutes
- Webhook registration: 10 requests per 15 minutes

Rate limit info is returned in standard `RateLimit` headers.

### API Info

```bash
# Explore available endpoints (no auth required)
curl http://localhost:3000/api

# Check server health (no auth required)
curl http://localhost:3000/health
```

## SDK / Client Libraries

Client libraries for popular languages are provided in the `sdk/` directory.

### JavaScript/Node.js

```javascript
const { ArguingClient } = require('./sdk/javascript/arguing_client');

const client = new ArguingClient({
    baseUrl: 'http://localhost:3000',
    apiKey: 'your-api-key'
});

// REST API
const nodes = await client.getNodes();
const graph = await client.getGraph('application/ld+json'); // JSON-LD

// GraphQL
const result = await client.graphqlQuery('{ nodes { id label } }');

// Webhooks
const hook = await client.registerWebhook('https://my-server.com/hook', ['graph.updated']);
```

### Python

```python
from sdk.python.arguing_client import ArguingClient

client = ArguingClient(base_url='http://localhost:3000', api_key='your-api-key')

# REST API
nodes = client.get_nodes()
graph = client.get_graph()

# GraphQL
result = client.graphql_query('{ nodes { id label } }')

# Webhooks
hook = client.register_webhook('https://my-server.com/hook', ['graph.updated'])
```

See `sdk/examples/query_graph.js` for a complete integration example.



1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with sample data
5. Submit a pull request

## License

ISC License
