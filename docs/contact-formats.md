# Contact Formats Implementation Plan (vCard / CardDAV)

## Overview

This document evaluates the applicability of contact standards — **vCard** and **CardDAV** — to the **Arguing** project, and provides an implementation plan where applicable.

---

## Standard Descriptions

### vCard (RFC 6350)

vCard is a file format standard for electronic business cards (`.vcf` files). A vCard represents a person or organisation and can include name, email address, phone number, organisation affiliation, and other contact information. It is supported by Apple Contacts, Google Contacts, Microsoft Outlook, and most contact management applications.

### CardDAV (RFC 6352)

CardDAV is an HTTP-based protocol that extends WebDAV to allow clients to access and manage contact data stored on a remote server. It is the protocol underlying iCloud Contacts, Google Contacts, and Nextcloud Contacts.

---

## Applicability Analysis

The Arguing project's graph data model includes a flexible `type` field on nodes. While the current example data uses types such as `claim`, `premise`, `conclusion`, and `rebuttal`, the graph can naturally represent **people** and **organisations** as nodes — for example:

- A person who makes a claim
- An organisation that publishes a position
- A researcher who authored a premise

When people or organisations appear as nodes, exporting them in vCard format allows the contact data to be imported directly into address books, CRM systems, or networking tools.

---

## Data Model Extension

### New Node Types

Two new optional node types are proposed:

| Type | Description | Maps to |
|------|-------------|---------|
| `person` | A human participant in the argument | `vCard` `FN`, `N` properties |
| `organisation` | An institution or group | `vCard` `ORG` property |

### Extended Node Properties

```typescript
interface Node {
    id: string | number;
    label: string;
    type?: string;
    // Contact-specific optional fields (used when type is 'person' or 'organisation')
    email?: string;
    url?: string;
    organisation?: string;   // Person's affiliation
    role?: string;           // Person's role within their organisation
}
```

These fields are optional and backward-compatible — existing graphs require no changes.

---

## Implementation Plan

### Phase 1 — vCard Export

**Goal:** Export nodes of type `person` or `organisation` from the argument graph as a `.vcf` file.

#### Mapping: Node → vCard

| Node property | vCard property | Notes |
|---------------|---------------|-------|
| `label` | `FN` (Full Name) | For persons; also used as `ORG` for organisations |
| `id` | `UID` | Prefixed: `urn:arguing:<id>` |
| `email` | `EMAIL` | Optional |
| `url` | `URL` | Optional |
| `organisation` | `ORG` | For person nodes — their employer/affiliation |
| `role` | `ROLE` | Optional |
| `type=person` | `KIND:individual` | vCard 4.0 |
| `type=organisation` | `KIND:org` | vCard 4.0 |

#### Example `.vcf` Output

```
BEGIN:VCARD
VERSION:4.0
FN:Jane Smith
N:Smith;Jane;;;
KIND:individual
UID:urn:arguing:42
ORG:Example University
ROLE:Researcher
EMAIL:jane.smith@example.edu
URL:https://example.edu/~jsmith
END:VCARD
```

#### Implementation Steps

1. Add `--format vcard` CLI option.
2. Create `src/exporters/vcard.ts`:
   - Filter nodes where `type === 'person'` or `type === 'organisation'`.
   - Map node properties to vCard 4.0 properties.
   - Handle line folding (vCard lines must not exceed 75 octets per RFC 6350 §3.2).
   - Output to `<output-basename>.vcf`.
3. Add `vcard4js` (MIT) or implement a minimal vCard serialiser.
4. Add tests verifying the output is valid vCard 4.0.

#### Dependency Evaluation
- `vcard4js` — lightweight vCard 4.0 serialiser.
- Alternative: implement a minimal serialiser (the required property set is small).

---

### Phase 2 — vCard Import

**Goal:** Parse a `.vcf` file and create `person` or `organisation` nodes in the argument graph.

#### Implementation Steps

1. Add `.vcf` to recognised input extensions.
2. Create `src/importers/vcard.ts`:
   - Parse vCard using `vcard4js` or a regex-based parser.
   - Map vCard properties to `Node` fields.
   - Generate edges where appropriate (e.g., a `person` node linked to a `claim` node).
3. Add tests verifying parsed vCard produces the correct `Node[]` array.

---

### Phase 3 — CardDAV Integration (Future / Optional)

**Goal:** Synchronise person/organisation nodes with a CardDAV server.

**Prerequisites:** An HTTP server component (not present in the current CLI architecture).

#### Implementation Steps (when a server exists)

1. Add a `/contacts` endpoint to the HTTP server that responds to CardDAV `PROPFIND` requests.
2. Serve one `VCARD` resource per person/organisation node, generated from the SQLite database.
3. Support `PUT` to allow external contact applications to update person data, stored back as node properties.

**Recommendation:** Defer CardDAV until a web server component is added.

---

## Example Input JSON (with person nodes)

```json
{
  "nodes": [
    {
      "id": "1",
      "label": "16-year-olds should be allowed to vote",
      "type": "claim"
    },
    {
      "id": "p1",
      "label": "Jane Smith",
      "type": "person",
      "email": "jane.smith@example.edu",
      "organisation": "Example University",
      "role": "Researcher"
    }
  ],
  "edges": [
    {
      "source": "p1",
      "target": "1",
      "label": ["Asserts"]
    }
  ]
}
```

---

## Recommendation

| Phase | Action | Priority |
|-------|--------|----------|
| 1 | Extend node types to include `person` and `organisation` | Medium |
| 2 | Add vCard 4.0 export for person/organisation nodes | Medium |
| 3 | Add vCard import to create person/organisation nodes | Medium |
| 4 | CardDAV server integration | Deferred |

Contact format support is **medium priority** — it is immediately useful for argument graphs that model participants in a debate, and the implementation is straightforward given the small property set needed.

---

## References

- [RFC 6350 — vCard Format Specification](https://datatracker.ietf.org/doc/html/rfc6350)
- [RFC 6352 — CardDAV](https://datatracker.ietf.org/doc/html/rfc6352)
- [vCard Wikipedia](https://en.wikipedia.org/wiki/VCard)
- [vcard4js (npm)](https://www.npmjs.com/package/vcard4js)
