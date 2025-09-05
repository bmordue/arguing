# Architecture Documentation

## Overview

The **Arguing** application is a TypeScript/Node.js tool that converts structured argument data from JSON format into queryable SQLite databases. This document outlines the current architecture and recent improvements.

## Project Structure

```
arguing/
├── app.ts              # Main application entry point
├── types.ts            # Type definitions and configuration  
├── validation.ts       # Input validation functions
├── logger.ts           # Logging utility
├── test.ts             # Test suite
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

## Recent Improvements (2024)

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