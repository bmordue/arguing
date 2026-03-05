# Architecture Documentation

## Overview

The **Arguing** application is a TypeScript/Node.js tool that converts structured argument data from JSON format into queryable SQLite databases. This document outlines the current architecture and recent improvements.

## Project Structure

```
arguing/
├── app.ts              # Main application entry point (CLI mode)
├── server.ts           # HTTP API server entry point
├── types.ts            # Type definitions and configuration
├── validation.ts       # Input validation functions
├── logger.ts           # Logging utility
├── test.ts             # Test suite
├── api/                # API interoperability layer
│   ├── auth.ts         # API key authentication
│   ├── rateLimiter.ts  # Rate limiting
│   ├── contentNegotiation.ts  # JSON/XML/JSON-LD support
│   ├── webhookManager.ts      # Webhook system
│   ├── graphql/
│   │   └── schema.ts   # GraphQL schema and resolvers
│   └── routes/v1/      # REST API v1 routes
│       ├── nodes.ts
│       ├── edges.ts
│       ├── graph.ts
│       └── webhooks.ts
├── sdk/                # Client SDK libraries
│   ├── javascript/arguing_client.js
│   ├── python/arguing_client.py
│   └── examples/query_graph.js
├── README.md           # User documentation
├── ARCHITECTURE.md     # This file
├── package.json        # Node.js dependencies
├── tsconfig.json       # TypeScript configuration
├── example_graph.json  # Sample data file
└── built/              # Compiled JavaScript output
```

## Architecture Principles

### 1. Separation of Concerns
- **app.ts**: Application orchestration and main workflow
- **types.ts**: Type definitions and configuration management
- **validation.ts**: Data validation logic
- **logger.ts**: Structured logging functionality

### 2. Type Safety
- Strong TypeScript interfaces for `Node`, `Edge`, and `Graph`
- Flexible ID types (string or number) to handle varied input formats
- Optional type field for nodes with sensible defaults

### 3. Error Handling
- Comprehensive input validation with descriptive error messages
- Graceful handling of file system errors
- JSON parsing error recovery
- Database operation error handling

### 4. Configuration Management
- Command-line argument support for key parameters
- Default configuration with override capabilities
- Built-in help system

## Key Components

### Data Models

```typescript
interface Node {
    id: string | number;
    label: string;
    type?: string;
}

interface Edge {
    source: string | number;
    target: string | number;
    label: string | string[];
}

interface Graph {
    nodes: Node[];
    edges: Edge[];
}
```

### Validation Pipeline

1. **JSON Structure Validation**: Ensures basic object structure
2. **Required Field Validation**: Checks for mandatory node/edge properties
3. **Type Validation**: Validates data types for each field
4. **Data Normalization**: Converts mixed formats to consistent internal representation

### Database Schema

The application creates a SQLite database with the following schema:

```sql
-- Nodes table with JSON storage and virtual ID column
CREATE TABLE nodes (
    body TEXT,
    id TEXT GENERATED ALWAYS AS (json_extract(body, '$.id')) VIRTUAL NOT NULL UNIQUE
);

-- Edges table with foreign key relationships
CREATE TABLE edges (
    source TEXT,
    target TEXT,
    properties TEXT,
    FOREIGN KEY(source) REFERENCES nodes(id),
    FOREIGN KEY(target) REFERENCES nodes(id)
);
```

## API Interoperability Layer

The application includes an HTTP API server (`server.ts`) that exposes the graph data for external integration.

### API Architecture

```
server.ts               # Express HTTP server entry point
api/
├── auth.ts             # API key authentication middleware
├── rateLimiter.ts      # Rate limiting middleware (express-rate-limit)
├── contentNegotiation.ts  # Content type detection and serialization
├── webhookManager.ts   # Webhook registration and event dispatch
├── graphql/
│   └── schema.ts       # GraphQL schema and resolvers
└── routes/v1/
    ├── nodes.ts        # GET /api/v1/nodes, /api/v1/nodes/:id
    ├── edges.ts        # GET /api/v1/edges, /api/v1/edges/filter
    ├── graph.ts        # GET /api/v1/graph
    └── webhooks.ts     # CRUD /api/v1/webhooks
```

### API Features

1. **Authentication**: API key authentication via `Authorization: Bearer` or `X-API-Key` headers.
2. **API Versioning**: URL-based versioning (`/api/v1/`).
3. **Content Negotiation**: Supports JSON (default), XML, and JSON-LD via `Accept` header.
4. **Rate Limiting**: 100 req/15min for general API; 10 req/15min for webhook registration.
5. **GraphQL**: Full GraphQL schema at `/graphql` with queries for nodes, edges, and graph.
6. **Webhooks**: Register HTTP callbacks for `graph.updated`, `node.created`, `edge.created` events.

### SDK / Client Libraries

```
sdk/
├── javascript/arguing_client.js   # JavaScript/Node.js client
├── python/arguing_client.py       # Python client (stdlib only)
└── examples/query_graph.js        # Complete integration example
```

### Additional Dependencies (API Layer)

- `express` v5 - HTTP server framework
- `express-rate-limit` - Rate limiting middleware
- `graphql` - GraphQL core runtime
- `graphql-http` - GraphQL HTTP server handler



### High Priority Fixes
- ✅ **Input Validation**: Added comprehensive validation for JSON data structure
- ✅ **Error Handling**: Improved error messages and graceful failure handling
- ✅ **Type Safety**: Fixed interface mismatches and added flexible type support
- ✅ **Testing Infrastructure**: Created basic test framework with automated validation

### Medium Priority Enhancements  
- ✅ **Code Modularity**: Separated concerns into focused modules
- ✅ **Configuration Management**: Added CLI argument support
- ✅ **Logging**: Implemented structured logging with configurable levels
- ✅ **Documentation**: Added architectural documentation and inline comments

### Architecture Benefits

1. **Maintainability**: Clear separation of concerns makes code easier to modify
2. **Reliability**: Comprehensive validation prevents runtime failures
3. **Usability**: CLI interface supports various use cases
4. **Testability**: Modular structure enables focused unit testing
5. **Observability**: Structured logging aids in debugging and monitoring

## Usage Patterns

### Basic Usage
```bash
npm start                                    # Use defaults (graph.json → arguing.sqlite)
```

### Advanced Usage
```bash
npm start --input data.json --output results.sqlite --log-level debug
```

### Programmatic Usage
The modular structure supports programmatic use:

```typescript
import { validateGraph } from './validation';
import { Logger } from './logger';

const logger = new Logger('info');
const graph = validateGraph(jsonData);
```

## Future Considerations

### Potential Enhancements
- **Database Migrations**: Version control for schema changes
- **Query Builder**: Simplified interface for common queries
- **Export Formats**: Support for additional output formats (CSV, GraphML)
- **Validation Rules**: Configurable business logic validation
- **Performance Optimization**: Bulk insert strategies for large datasets

### Scalability Considerations
- **Connection Pooling**: For high-throughput scenarios
- **Streaming**: Large file processing without memory limits
- **Indexing Strategy**: Optimized queries for complex graph operations
- **Caching**: In-memory caching for frequently accessed data

## Testing Strategy

### Current Tests
- Input validation edge cases
- Database creation and data insertion
- File format compatibility
- Error handling scenarios

### Testing Philosophy
- **Unit Tests**: Focus on individual function behavior
- **Integration Tests**: Validate end-to-end workflows
- **Data Validation**: Ensure example files remain compatible
- **Error Scenarios**: Test graceful failure handling

## Dependencies

### Production Dependencies
- `sqlite3`: Native SQLite database driver
- `sqlite`: Promise-based SQLite wrapper for async operations

### Development Dependencies  
- `typescript`: TypeScript compiler and type checking
- `@types/node`: Node.js type definitions

The minimal dependency footprint reduces security vulnerabilities and maintenance overhead.