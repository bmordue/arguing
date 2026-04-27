# Universal Data Exchange Pipeline — Implementation Roadmap

## Overview

This document describes the implementation roadmap for building a comprehensive import/export system for the **Arguing** platform. The goal is full ecosystem interoperability, allowing users to freely move argument data in and out of the system in a variety of formats, migrate from competing tools, synchronise data incrementally, and maintain trustworthy provenance records.

---

## 1. Common Data Exchange Patterns in Similar Projects

### Background

Before designing bespoke exchange mechanisms, it is essential to understand how comparable argument-mapping and knowledge-graph tools handle data portability.

### Patterns Identified

| Pattern | Description | Examples |
|---------|-------------|---------|
| **Full snapshot export** | Export the entire dataset in one operation | Kialo CSV export, Argdown JSON dump |
| **Selective / filtered export** | Export a subset based on node type, date range, or tag | Debater XML filtered export |
| **Streaming / chunked export** | Stream large datasets to avoid memory exhaustion | Neo4j bulk export, RDF streaming |
| **Standard interchange formats** | Adopt widely used formats to maximise compatibility | GraphML, JSON-LD, OPML, CSV |
| **Webhook / event push** | Notify external systems on each data change | Roam Research plugin API |
| **Pull-based sync** | External systems poll a versioned endpoint for changes | Argument Interchange Format (AIF) REST feeds |

### Relevant Standards

- **Argument Interchange Format (AIF)**: JSON/RDF schema for representing argumentation networks. Directly applicable to Arguing's node/edge model.
- **GraphML**: XML-based graph format supported by Gephi, yEd, and Cytoscape.
- **JSON-LD**: Linked Data extension of JSON; enables semantic interoperability.
- **CSV**: Lowest-common-denominator tabular format for nodes and edges separately.
- **OPML**: Hierarchical outline format used by mind-mapping and outlining tools.

### Recommendations

- Adopt AIF as the primary canonical interchange format due to its domain alignment.
- Provide GraphML export for visualisation tool compatibility.
- Support plain CSV for spreadsheet-based workflows.
- Design all exchange interfaces as streaming-capable from the outset.

---

## 2. Bulk Data Export in Multiple Formats

### Goals

- Export complete argument graphs with a single command.
- Support at least four output formats at launch.
- Preserve all node and edge metadata in every format.

### Supported Export Formats

#### 2.1 JSON (native)

The existing `graph.json` schema is the native format. The exporter should:

- Write pretty-printed JSON by default.
- Optionally write compact JSON for programmatic consumption.
- Include a schema version field for forward compatibility.

```bash
arguing export --format json --output export.json
```

#### 2.2 CSV (nodes + edges)

Two CSV files are produced:

- `nodes.csv` — `id`, `label`, `type`, and any additional properties.
- `edges.csv` — `source`, `target`, `label`, and additional properties.

```bash
arguing export --format csv --output-dir ./export/
```

#### 2.3 GraphML

Encodes the graph as an XML document compatible with Gephi, yEd, and Cytoscape.

```bash
arguing export --format graphml --output export.graphml
```

#### 2.4 AIF (Argument Interchange Format)

Serialises nodes as `I-nodes` (information) or `S-nodes` (scheme) and edges as `RA-nodes` (rule application) per the AIF specification.

```bash
arguing export --format aif --output export-aif.json
```

#### 2.5 SQLite dump

Re-export from the generated SQLite database as a portable `.sql` script.

```bash
arguing export --format sql --output dump.sql
```

### Implementation Checklist

- [ ] Create `src/export/` module with a common `Exporter` interface.
- [ ] Implement `JsonExporter`, `CsvExporter`, `GraphMlExporter`, `AifExporter`, `SqlExporter`.
- [ ] Add `--format` and `--output` flags to the CLI.
- [ ] Write unit tests for each exporter using the existing example graphs.
- [ ] Document format-specific limitations (e.g., GraphML edge label array flattening).

---

## 3. Migration Tools from Competing Platforms

### Supported Source Platforms (Phase 1)

| Platform | Export Format Available | Import Strategy |
|----------|------------------------|-----------------|
| **Kialo** | CSV (topics + pros/cons) | Custom CSV parser → Arguing JSON |
| **Argdown** | `.argdown` / JSON | Argdown JSON → Arguing JSON |
| **Debategraph** | XML | XSLT transformation → Arguing JSON |
| **MindMeister / FreeMind** | OPML / FreeMind XML | OPML parser → Arguing JSON |
| **Roam Research** | JSON | Roam JSON → Arguing JSON |

### Migration Architecture

Each migration is implemented as a two-stage pipeline:

```
[Source File] → [Parser] → [Canonical Internal Graph] → [Arguing Importer]
```

The canonical internal graph matches the existing `Graph` TypeScript interface, so the migration layer only needs to produce valid `Node[]` and `Edge[]` arrays.

### CLI Interface

```bash
# Kialo migration
arguing migrate --from kialo --input kialo_export.csv --output graph.json

# Argdown migration
arguing migrate --from argdown --input debate.argdown --output graph.json

# Generic: auto-detect source format
arguing migrate --input source_file --output graph.json
```

### Implementation Checklist

- [ ] Create `src/migrate/` module with a `Migrator` interface.
- [ ] Implement Kialo CSV migrator.
- [ ] Implement Argdown JSON migrator.
- [ ] Implement Debategraph XML migrator (using a lightweight XML parser).
- [ ] Implement OPML migrator (FreeMind/MindMeister).
- [ ] Add format auto-detection heuristic.
- [ ] Provide sample source files in `test/fixtures/migration/` for each platform.
- [ ] Write integration tests for each migrator.

---

## 4. Incremental Sync Capabilities

### Motivation

Full re-exports are expensive for large graphs. Incremental sync allows external tools to receive only the data that has changed since the last synchronisation point.

### Design

#### 4.1 Change Tracking

Add an `updated_at` column (Unix timestamp) to both `nodes` and `edges` tables:

```sql
ALTER TABLE nodes ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'));
ALTER TABLE edges ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'));
```

Triggers keep `updated_at` current on every write.

#### 4.2 Sync Cursors

A `sync_cursors` table stores the last-synced timestamp per named consumer:

```sql
CREATE TABLE sync_cursors (
    consumer TEXT PRIMARY KEY,
    last_sync INTEGER NOT NULL DEFAULT 0
);
```

#### 4.3 Delta Export

```bash
# Export only changes since the last sync for consumer "ci-pipeline"
arguing sync --consumer ci-pipeline --format json --output delta.json
```

The sync command:
1. Reads `last_sync` for the named consumer.
2. Queries nodes and edges where `updated_at > last_sync`.
3. Writes the delta in the requested format.
4. Updates `last_sync` to the current timestamp.

#### 4.4 Merge Semantics

Consumers that receive a delta must support upsert (insert-or-replace) semantics; the delta payload includes a `deleted` flag for soft-deleted records.

### Implementation Checklist

- [ ] Add `updated_at` column and triggers to the database schema.
- [ ] Create `sync_cursors` table.
- [ ] Implement `src/sync/DeltaExporter` class.
- [ ] Add `arguing sync` sub-command to the CLI.
- [ ] Document merge semantics for downstream consumers.
- [ ] Write tests covering create, update, and delete delta scenarios.

---

## 5. Data Validation and Transformation Pipelines

### Goals

- Reject malformed data early with actionable error messages.
- Normalise diverse input formats into a consistent internal representation.
- Apply configurable transformation rules before import or export.

### Validation Layers

The existing `validation.ts` module provides a foundation. The pipeline extends it with:

| Layer | Responsibility |
|-------|---------------|
| **Schema validation** | JSON structure, required fields, correct data types |
| **Referential integrity** | Edge source/target IDs must reference existing nodes |
| **Business rule validation** | Configurable rules (e.g., no self-loops, max edge weight) |
| **Duplicate detection** | Identify and optionally merge duplicate nodes |

### Transformation Pipeline

Transformations are composable functions that operate on the internal graph representation:

```typescript
type Transform = (graph: Graph) => Graph;

const pipeline: Transform[] = [
  normaliseIds,        // Convert numeric IDs to strings
  deduplicateNodes,    // Merge nodes with identical labels
  inferEdgeTypes,      // Add default edge types where missing
  sanitiseLabels,      // Strip control characters from text fields
];
```

The pipeline is applied after validation and before database insertion:

```
[Raw Input] → [Schema Validation] → [Transformation Pipeline] → [Referential Integrity Check] → [Database]
```

### Configurable Rules

A `pipeline.config.json` file in the project root (or specified via `--pipeline-config`) allows users to enable/disable transforms:

```json
{
  "transforms": {
    "normaliseIds": true,
    "deduplicateNodes": false,
    "inferEdgeTypes": true,
    "sanitiseLabels": true
  },
  "rules": {
    "allowSelfLoops": false,
    "maxLabelLength": 500
  }
}
```

### Implementation Checklist

- [ ] Extend `validation.ts` with referential integrity checks.
- [ ] Create `src/pipeline/` module with composable `Transform` functions.
- [ ] Implement `normaliseIds`, `deduplicateNodes`, `inferEdgeTypes`, `sanitiseLabels`.
- [ ] Add `pipeline.config.json` schema and loader.
- [ ] Wire the pipeline into the main import flow in `app.ts`.
- [ ] Write unit tests for each transform.
- [ ] Document how to add custom transforms.

---

## 6. Backup and Restore Functionality

### Goals

- Create point-in-time snapshots of the SQLite database.
- Restore from a snapshot with a single command.
- Support scheduled automatic backups.

### Backup Strategy

#### 6.1 Manual Backup

```bash
# Create a timestamped backup
arguing backup --output backups/

# Creates: backups/arguing_2024-11-15T142300Z.sqlite
```

The backup uses SQLite's online backup API (`sqlite3_backup_init`) to create a consistent copy without locking writes for longer than necessary.

#### 6.2 Restore

```bash
# Restore from a specific backup file
arguing restore --input backups/arguing_2024-11-15T142300Z.sqlite

# Restore with confirmation prompt (default for safety)
arguing restore --input backups/arguing_2024-11-15T142300Z.sqlite --confirm
```

The restore command:
1. Validates the backup file is a readable SQLite database.
2. Prompts for confirmation unless `--yes` is supplied.
3. Renames the current database to `.bak` before restoring.
4. Copies the backup file to the configured output path.

#### 6.3 Automated Scheduled Backups

A `backup.schedule` key in configuration enables cron-style scheduling:

```json
{
  "backup": {
    "schedule": "0 2 * * *",
    "outputDir": "./backups",
    "retainCount": 7
  }
}
```

`retainCount` controls how many backup files are kept; older files are deleted automatically.

#### 6.4 Backup Manifest

Each backup directory contains a `manifest.json`:

```json
{
  "backups": [
    {
      "filename": "arguing_2024-11-15T142300Z.sqlite",
      "createdAt": "2024-11-15T14:23:00Z",
      "sizeBytes": 204800,
      "nodeCount": 42,
      "edgeCount": 67,
      "checksum": "sha256:abc123..."
    }
  ]
}
```

### Implementation Checklist

- [ ] Create `src/backup/` module with `BackupManager` class.
- [ ] Implement `backup` and `restore` sub-commands in the CLI.
- [ ] Add checksum verification on restore.
- [ ] Implement backup manifest tracking.
- [ ] Implement scheduled backup runner (optional daemon mode).
- [ ] Write tests for backup creation, restore, and manifest update.
- [ ] Document backup retention policy configuration.

---

## 7. Data Lineage and Provenance Tracking

### Goals

- Record the origin of every node and edge (source file, migration tool, manual entry).
- Track all modifications over time.
- Enable auditing and reproducibility.

### Provenance Model

A `provenance` table records the history of each entity:

```sql
CREATE TABLE provenance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,          -- 'node' or 'edge'
    entity_id   TEXT NOT NULL,          -- node/edge ID
    action      TEXT NOT NULL,          -- 'created', 'updated', 'deleted', 'imported', 'migrated'
    source      TEXT,                   -- filename, URL, or tool name
    source_format TEXT,                 -- 'json', 'csv', 'kialo', 'argdown', etc.
    performed_at INTEGER NOT NULL,      -- Unix timestamp
    performed_by TEXT,                  -- username or 'system'
    details     TEXT                    -- JSON blob with additional context
);
```

### Lineage Capture Points

| Action | Provenance Record |
|--------|------------------|
| Import from file | `action='imported'`, `source=<filename>`, `source_format=<format>` |
| Migration from another platform | `action='migrated'`, `source=<platform>`, `source_format=<platform_format>` |
| Manual creation | `action='created'`, `performed_by=<user>` |
| Sync delta applied | `action='updated'`, `source=<consumer>` |
| Restore from backup | `action='restored'`, `source=<backup_filename>` |
| Deletion | `action='deleted'`, `details=<snapshot of deleted data>` |

### Lineage Query API

```bash
# Show full history for a specific node
arguing lineage --entity-type node --entity-id "1"

# Show all nodes imported from a specific file
arguing lineage --source my_data.json

# Export lineage report as JSON
arguing lineage --format json --output lineage_report.json
```

### Data Snapshot on Deletion

When a node or edge is deleted, its last-known state is captured in the `details` field of the provenance record. This allows reconstruction of accidentally deleted data without a full backup restore.

### Implementation Checklist

- [ ] Create `provenance` table in the database schema.
- [ ] Add provenance write calls to all import, migration, sync, and backup/restore paths.
- [ ] Create `src/lineage/` module with `ProvenanceTracker` class.
- [ ] Implement `arguing lineage` sub-command with filtering options.
- [ ] Add lineage export (JSON and CSV).
- [ ] Write tests covering each action type.
- [ ] Document provenance schema and query patterns.

---

## Implementation Phases

| Phase | Deliverables | Estimated Effort |
|-------|-------------|-----------------|
| **Phase 1** | Bulk export (JSON, CSV, GraphML, AIF) + Kialo/Argdown migration | 3–4 weeks |
| **Phase 2** | Data validation pipeline + backup/restore | 2–3 weeks |
| **Phase 3** | Incremental sync + additional migrators | 2–3 weeks |
| **Phase 4** | Data lineage and provenance tracking | 2 weeks |
| **Phase 5** | Scheduled backups + lineage query API + docs | 1–2 weeks |

---

## Cross-Cutting Concerns

### Testing

All new modules must include:
- Unit tests for individual functions (using the existing test framework in `test.ts`).
- Integration tests using the existing `example_graph.json` fixture.
- New fixtures for migration source formats in `test/fixtures/`.

### CLI Design

New sub-commands follow the existing `npm start -- <options>` pattern:

```
arguing export   [--format <fmt>] [--output <path>]
arguing migrate  [--from <platform>] [--input <file>] [--output <file>]
arguing sync     [--consumer <name>] [--format <fmt>] [--output <path>]
arguing backup   [--output <dir>]
arguing restore  [--input <file>] [--yes]
arguing lineage  [--entity-type <type>] [--entity-id <id>] [--format <fmt>]
```

### Logging

All new operations use the existing `Logger` class from `logger.ts`, emitting structured log entries at appropriate levels (`debug`, `info`, `warn`, `error`).

### Error Handling

All new modules follow the established pattern: validate inputs early, throw descriptive errors, and ensure resources (file handles, DB connections) are always released in `finally` blocks.

---

## References

- [Argument Interchange Format (AIF) Specification](http://www.argumentinterchange.org/)
- [GraphML File Format](http://graphml.graphdrawing.org/)
- [JSON-LD Specification](https://json-ld.org/)
- [SQLite Online Backup API](https://www.sqlite.org/backup.html)
- [Kialo Help: Exporting a Discussion](https://support.kialo.com/)
- [Argdown Documentation](https://argdown.org/guide/exporting-argdown.html)
