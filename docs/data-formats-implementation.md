# Data Formats Implementation Plan

## Overview

This document analyses the export and import requirements for the **Arguing** project and provides an implementation plan for supporting common data exchange formats: **CSV**, **JSON** (including JSON-LD), **XML**, and **YAML**.

---

## Data Export / Import Requirements Analysis

### Current State

- **Input:** JSON files conforming to the graph schema (`nodes[]`, `edges[]`)
- **Output:** SQLite database (`arguing.sqlite`)
- **CLI options:** `--input`, `--output`, `--log-level`

### Use Cases Driving Format Support

| Use Case | Formats Needed |
|----------|---------------|
| Import data from spreadsheet tools (Excel, Google Sheets) | CSV |
| Round-trip data between Arguing instances | JSON, YAML |
| Integration with semantic web / knowledge graphs | JSON-LD (JSON extension) |
| Integration with XML-based toolchains (XSLT, GraphML) | XML |
| Human-editable configuration or small graphs | YAML |
| Export for data analysis pipelines | CSV, JSON |
| Import from argumentation tools (Argdown, OWL) | XML, JSON |

### Data Entities to Export / Import

#### Nodes
- `id` — unique identifier
- `label` — argument text
- `type` — node type (claim, premise, conclusion, rebuttal)

#### Edges
- `source` — source node ID
- `target` — target node ID
- `label` — relationship label(s) (e.g., "Because", "Therefore")

---

## Format-Specific Plans

### 1. CSV

**RFC:** [RFC 4180](https://datatracker.ietf.org/doc/html/rfc4180)

#### Rationale
CSV is the lowest-friction format for data scientists, educators, and spreadsheet users. Nodes and edges map naturally to flat tabular structures.

#### Schema Design

**`nodes.csv`**
```
id,label,type
"1","16-year-olds should be allowed to vote","claim"
"2","16-year-olds can make informed decisions","premise"
```

**`edges.csv`**
```
source,target,label
"2","1","Because"
```

Multi-value `label` arrays are serialised as a semicolon-delimited string within a quoted field.

#### Implementation Steps

1. Add `--format csv` option to the CLI alongside `--output`.
2. Create `src/exporters/csv.ts`:
   - Use the built-in `csv-stringify` package (or implement a simple serialiser to avoid new dependencies).
   - Export `exportNodesToCSV(nodes: Node[]): string` and `exportEdgesToCSV(edges: Edge[]): string`.
   - Write two files: `<output-basename>-nodes.csv` and `<output-basename>-edges.csv`.
3. Create `src/importers/csv.ts`:
   - Parse CSV using `csv-parse` (or a lightweight alternative).
   - Map columns back to `Node[]` and `Edge[]` types.
   - Handle multi-value labels by splitting on `;`.
4. Wire import/export into the main workflow in `app.ts`.
5. Add tests for round-trip fidelity (export then re-import produces the same graph).

#### Dependencies to Evaluate
- `csv-stringify` and `csv-parse` (Apache-2.0) — well-maintained, zero transitive dependencies.
- Alternative: implement a minimal CSV writer to avoid dependency additions.

---

### 2. JSON (and JSON-LD)

**Specifications:**
- JSON — [RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259)
- JSON-LD 1.1 — [W3C Recommendation](https://www.w3.org/TR/json-ld11/)

#### Rationale
JSON is already the native input format. JSON-LD extends it with a `@context` to make the data interpretable by semantic web tools, knowledge graph platforms, and search engine crawlers.

#### Current JSON Schema (no change needed for basic JSON)
The existing `graph.json` schema is already valid JSON. What is needed is:
- A JSON Schema document (`docs/schema/graph.schema.json`) for validation and tooling support.
- A JSON-LD context (`docs/schema/arguing-context.jsonld`) for semantic enrichment.

#### JSON Schema (validation)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/bmordue/arguing/blob/main/docs/schema/graph.schema.json",
  "title": "Argument Graph",
  "type": "object",
  "required": ["nodes", "edges"],
  "properties": {
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label"],
        "properties": {
          "id":    { "type": ["string", "number"] },
          "label": { "type": "string" },
          "type":  { "type": "string", "enum": ["claim", "premise", "conclusion", "rebuttal", "node"] }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["source", "target", "label"],
        "properties": {
          "source": { "type": ["string", "number"] },
          "target": { "type": ["string", "number"] },
          "label":  { "oneOf": [{ "type": "string" }, { "type": "array", "items": { "type": "string" } }] }
        }
      }
    }
  }
}
```

#### JSON-LD Context

> **Note on Schema.org mappings:** Schema.org does not define dedicated types for `conclusion` or `rebuttal`. The mappings below use `schema:Statement` as a reasonable approximation. These are placeholder mappings — they should be refined once a more specific vocabulary (e.g., a custom `@context` URI or an argumentation ontology such as AIF) is adopted.

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "id":     "@id",
    "nodes":  "hasPart",
    "edges":  "additionalProperty",
    "label":  "name",
    "type":   "@type",
    "source": "http://www.w3.org/2004/03/trix/rdfg-1/subGraphOf",
    "target": "http://www.w3.org/2004/03/trix/rdfg-1/superGraphOf",
    "claim":       "schema:Claim",
    "premise":     "schema:Statement",
    "conclusion":  "schema:Statement",   // placeholder — Schema.org has no dedicated Conclusion type; refine as vocabulary evolves
    "rebuttal":    "schema:Statement"    // placeholder — Schema.org has no dedicated Rebuttal type; consider schema:OpinionNewsArticle for news contexts only
  }
}
```

#### Implementation Steps

1. Create `docs/schema/graph.schema.json` with the JSON Schema above.
2. Create `docs/schema/arguing-context.jsonld` with the JSON-LD context.
3. Add `--format jsonld` CLI option that wraps the graph output with `@context`.
4. Create `src/exporters/jsonld.ts`:
   - Read the context from `docs/schema/arguing-context.jsonld`.
   - Attach it to the graph output as `{ "@context": ..., ...graph }`.
5. Optionally add `ajv` (MIT) for JSON Schema validation during import.

---

### 3. XML

**Specifications:**
- XML 1.0 — [W3C Recommendation](https://www.w3.org/TR/xml/)
- GraphML — [GraphML Primer](http://graphml.graphdrawing.org/)

#### Rationale
XML is required for interoperability with older enterprise systems, XSLT pipelines, and argumentation tools that use XML-based formats (e.g., OWL, GraphML, AIF).

#### Target XML Format — GraphML

GraphML is the most widely supported XML format for graph data, with tooling support in yEd, Gephi, NetworkX, and others.

**Example output:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/graphml"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/graphml
           http://graphml.graphdrawing.org/graphml/1.0/graphml.xsd">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="type"  for="node" attr.name="type"  attr.type="string"/>
  <key id="rel"   for="edge" attr.name="label" attr.type="string"/>
  <graph id="G" edgedefault="directed">
    <node id="1">
      <data key="label">16-year-olds should be allowed to vote</data>
      <data key="type">claim</data>
    </node>
    <node id="2">
      <data key="label">16-year-olds can make informed decisions</data>
      <data key="type">premise</data>
    </node>
    <edge source="2" target="1">
      <data key="rel">Because</data>
    </edge>
  </graph>
</graphml>
```

#### Implementation Steps

1. Add `--format xml` CLI option.
2. Create `src/exporters/xml.ts`:
   - Implement a GraphML serialiser using Node.js built-in string templating (no external XML library required for output-only).
   - For import, use `fast-xml-parser` (MIT, zero dependencies) to parse GraphML into the internal graph type.
3. Create `src/importers/xml.ts`:
   - Parse `<node>` and `<edge>` elements into `Node[]` and `Edge[]`.
   - Map `<data key="label">` values to the appropriate fields.
4. Add tests verifying export and re-import produce the same graph.

#### Dependencies to Evaluate
- `fast-xml-parser` (MIT) — for XML import only; export can be done with string templates.

---

### 4. YAML

**Specification:** [YAML 1.2](https://yaml.org/spec/1.2/)

#### Rationale
YAML is human-friendly and commonly used for configuration files, CI pipelines, and small datasets that developers need to read and edit directly. The graph data model maps cleanly to YAML.

#### Example Format

```yaml
nodes:
  - id: "1"
    label: "16-year-olds should be allowed to vote"
    type: claim
  - id: "2"
    label: "16-year-olds can make informed decisions"
    type: premise

edges:
  - source: "2"
    target: "1"
    label:
      - Because
```

#### Implementation Steps

1. Add `--format yaml` CLI option (both input and output).
2. Add `js-yaml` (MIT) as a dependency — the most widely used YAML library for Node.js.
3. Create `src/importers/yaml.ts`:
   - Call `yaml.load(fileContent)` and validate the result with the existing `validateGraph` function.
4. Create `src/exporters/yaml.ts`:
   - Call `yaml.dump(graph)` to serialise.
5. Update `app.ts` to detect file extension (`.yaml`, `.yml`) and route to the appropriate importer automatically.
6. Add tests for round-trip fidelity.

#### Dependencies to Evaluate
- `js-yaml` (MIT, actively maintained) — standard choice; no transitive dependencies.

---

## Migration Path

The changes are additive and backward-compatible:

1. **Phase 1** — Add JSON Schema and JSON-LD context (no code changes; documentation only).
2. **Phase 2** — Add YAML import/export (one new dependency: `js-yaml`).
3. **Phase 3** — Add CSV import/export (one new optional dependency or minimal built-in implementation).
4. **Phase 4** — Add XML (GraphML) import/export (one new dependency for import: `fast-xml-parser`).

Each phase can be delivered independently without breaking existing behaviour.

---

## Testing Strategy

- **Unit tests** for each exporter: verify output matches expected format string.
- **Unit tests** for each importer: verify parsed output matches expected `Graph` object.
- **Round-trip tests**: export a known graph, re-import it, assert structural equivalence.
- **Error tests**: verify invalid format input produces descriptive errors, not uncaught exceptions.

---

## References

- [RFC 4180 — CSV](https://datatracker.ietf.org/doc/html/rfc4180)
- [RFC 8259 — JSON](https://datatracker.ietf.org/doc/html/rfc8259)
- [JSON Schema Draft 2020-12](https://json-schema.org/specification)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
- [GraphML Format](http://graphml.graphdrawing.org/)
- [YAML 1.2](https://yaml.org/spec/1.2/)
- [js-yaml](https://github.com/nodeca/js-yaml)
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
