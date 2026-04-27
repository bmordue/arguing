# Calendar Integration Implementation Plan (iCal / CalDAV)

## Overview

This document evaluates the applicability of calendar standards — **iCalendar (iCal)** and **CalDAV** — to the **Arguing** project, and provides an implementation plan where applicable.

---

## Standard Descriptions

### iCalendar (RFC 5545)

iCalendar is the standard format (`.ics` files) for representing calendar data including events (`VEVENT`), tasks (`VTODO`), and free-busy information. It is supported by Apple Calendar, Google Calendar, Microsoft Outlook, and virtually all calendar applications.

### CalDAV (RFC 4791)

CalDAV is an HTTP-based protocol that extends WebDAV to allow clients to access and manage calendar data stored on a remote server. It is the protocol underlying iCloud Calendar, Google Calendar (partial), and Nextcloud Calendar.

---

## Applicability Analysis

The Arguing project models **logical argument structures** — claims, premises, conclusions, and rebuttals — as a directed graph. The core data is atemporal: a claim does not inherently have a start time, end time, or duration.

However, several real-world use cases introduce a temporal dimension:

| Use Case | iCal Relevance |
|----------|---------------|
| Structured debates with scheduled sessions | `VEVENT` for each debate round |
| Argument submission deadlines | `VTODO` with a due date |
| Tagging nodes with the date an argument was made | `DTSTART` on a custom property |
| Exporting a debate schedule to participants' calendars | `.ics` file export |
| Synchronising debate schedules with calendar apps | CalDAV write endpoint |

---

## Implementation Plan

### Phase 1 — Temporal Metadata on Nodes and Edges (Data Model Extension)

**Goal:** Allow nodes and edges to carry optional timestamp metadata.

**Changes to `types.ts`:**

```typescript
interface Node {
    id: string | number;
    label: string;
    type?: string;
    // Optional temporal metadata
    createdAt?: string;   // ISO 8601 date-time
    occurredAt?: string;  // ISO 8601 date-time — when the argument was made
}

interface Edge {
    source: string | number;
    target: string | number;
    label: string | string[];
    // Optional temporal metadata
    createdAt?: string;
}
```

This is backward-compatible: fields are optional and existing JSON files require no changes.

---

### Phase 2 — iCal Export for Debate Events

**Goal:** Export a collection of debate events from an argument graph as a `.ics` file.

#### Mapping: Argument Graph → iCalendar

| Arguing concept | iCal component | iCal property |
|-----------------|---------------|---------------|
| Top-level claim | `VEVENT` | `SUMMARY` = claim label |
| Node `occurredAt` | `VEVENT` | `DTSTART` |
| Edge `createdAt` | `VEVENT` | `DTSTART` |
| Node ID | `VEVENT` | `UID` = `<id>@arguing` |
| Node `label` | `VEVENT` | `DESCRIPTION` |

#### Example `.ics` Output

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//bmordue//Arguing//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:1@arguing
SUMMARY:16-year-olds should be allowed to vote
DESCRIPTION:Claim node from argument graph
DTSTART:20240101T090000Z
DTEND:20240101T100000Z
END:VEVENT
END:VCALENDAR
```

#### Implementation Steps

1. Add `--format ical` CLI option.
2. Create `src/exporters/ical.ts`:
   - Filter nodes that have `occurredAt` or that are of type `claim`.
   - For each, construct a `VEVENT` block.
   - Wrap all events in a `VCALENDAR` envelope.
   - Output to `<output-basename>.ics`.
3. Use the `ical-generator` package (MIT) for correct iCal serialisation, or implement a minimal template-based serialiser for the subset of properties needed.
4. Add tests verifying the output parses as valid iCal.

#### Dependency Evaluation
- `ical-generator` (MIT, actively maintained) — handles edge cases in iCal formatting (line folding, escaping).
- Alternative: minimal string template (avoids dependency; acceptable given limited property set).

---

### Phase 3 — CalDAV Integration (Future / Optional)

**Goal:** Publish argument-derived events to a CalDAV server for direct calendar application access.

**Prerequisites:** A running HTTP server (not present in the current CLI-only architecture).

#### Implementation Steps (when a server exists)

1. Add a `/calendar` endpoint to the HTTP server that responds to CalDAV `PROPFIND` requests.
2. Use `tsdav` (MIT) or `node-caldav` to handle CalDAV protocol negotiation.
3. Serve a `VCALENDAR` resource per argument graph, dynamically generated from the SQLite database.
4. Support `PUT` to allow external calendar apps to add events that are stored back as node metadata.

**Recommendation:** Defer CalDAV until a web server component is added to the architecture.

---

## Recommendation

| Phase | Action | Priority |
|-------|--------|----------|
| 1 | Add optional `createdAt` / `occurredAt` fields to the Node and Edge types | Low |
| 2 | Add iCal export for nodes with temporal metadata | Low |
| 3 | CalDAV server integration | Deferred |

Calendar integration is **low priority** for the current CLI tool but is straightforward to add incrementally once temporal metadata exists in the data model.

---

## References

- [RFC 5545 — iCalendar](https://datatracker.ietf.org/doc/html/rfc5545)
- [RFC 4791 — CalDAV](https://datatracker.ietf.org/doc/html/rfc4791)
- [ical-generator (npm)](https://www.npmjs.com/package/ical-generator)
- [tsdav (npm)](https://www.npmjs.com/package/tsdav)
