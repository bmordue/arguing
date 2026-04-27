# Open Standards and Protocols Research

## Overview

This document evaluates open standards and protocols relevant to the **Arguing** project — a tool for modelling and analysing logical argument structures stored in a SQLite database. The goal is to identify where industry-standard formats and protocols can improve interoperability, data exchange, and ecosystem compatibility.

## Project Context

The Arguing tool currently:
- Ingests argument graphs as JSON files
- Stores nodes (claims, premises, conclusions, rebuttals) and edges (logical relationships) in SQLite
- Is operated via a CLI

Integrating open standards will enable the data to be consumed by external tools, shared across systems, and presented on the web in machine-readable ways.

---

## Applicable Standards Evaluated

### 1. RSS / Atom (Syndication)

**Relevance:** Medium  
RSS 2.0 and Atom 1.0 are XML-based feed formats used to syndicate content updates.

- **Use case:** Publishing a feed of newly added arguments, claims, or debate updates so subscribers can follow changes.
- **Applicability:** An Atom feed could expose top-level claims or recent changes to an argument graph via an HTTP endpoint.
- **Conclusion:** Useful if a web API layer is added. Lower priority for the CLI-only tool.

### 2. WebSub (formerly PubSubHubbub)

**Relevance:** Low  
WebSub is a publish-subscribe protocol built on top of Atom/RSS feeds.

- **Use case:** Pushing real-time notifications when an argument graph is updated to registered subscribers.
- **Applicability:** Requires an HTTP server and hub infrastructure.
- **Conclusion:** Deferred until a web server component exists.

### 3. ActivityPub

**Relevance:** Low–Medium  
ActivityPub is a W3C decentralised social networking protocol used by the Fediverse (Mastodon, etc.).

- **Use case:** Representing arguments as `Note` or custom `Activity` objects shared across federated instances, enabling collaborative debate analysis.
- **Applicability:** Significant architectural work required (actor model, inbox/outbox endpoints, HTTP signatures).
- **Conclusion:** Architecturally interesting for a future collaborative mode; not suited to the current CLI tool.

### 4. JSON-LD / Schema.org

**Relevance:** High  
JSON-LD is a W3C standard for expressing Linked Data in JSON. Schema.org provides a shared vocabulary.

- **Use case:** Exporting argument graph data as JSON-LD so it can be consumed by search engines and semantic web tools. The `schema:Claim`, `schema:CreativeWork`, and `schema:DefinedTerm` types are candidate mappings.
- **Applicability:** Can be applied to the existing JSON input/output format with minimal disruption.
- **Conclusion:** High priority — directly improves discoverability and interoperability.

### 5. Common Data Formats (CSV, XML, YAML)

**Relevance:** High  
Standard tabular and structured formats for data exchange with spreadsheet tools, data pipelines, and configuration-driven workflows.

- **Conclusion:** High priority — see [Data Formats Implementation Plan](./data-formats-implementation.md).

### 6. iCal / CalDAV

**Relevance:** Low  
iCalendar (RFC 5545) and CalDAV (RFC 4791) are formats and protocols for calendar data.

- **Use case:** Scheduling debate events, deadlines for argument submission, or tagging arguments with temporal context.
- **Conclusion:** Low applicability to the core data model. See [Calendar Integration Plan](./calendar-integration.md).

### 7. vCard / CardDAV

**Relevance:** Medium  
vCard (RFC 6350) is a format for contact data. CardDAV (RFC 6352) is the associated protocol.

- **Use case:** The graph can model people and organisations as nodes. vCard export would allow person-nodes to be imported into address books or CRM tools.
- **Conclusion:** Moderate priority when people/organisation data is present. See [Contact Formats Plan](./contact-formats.md).

### 8. Microformats

**Relevance:** Medium  
Microformats are HTML-embedded metadata patterns (e.g., `h-card`, `h-entry`).

- **Use case:** If argument graphs are rendered as HTML pages, embedding Microformats enables parsers and aggregators to extract structured data without a separate API.
- **Conclusion:** Useful if an HTML rendering layer is added. See [Web Standards Plan](./web-standards.md).

### 9. Open Graph Protocol

**Relevance:** Medium  
Open Graph meta tags allow web pages to become rich objects in social media previews.

- **Use case:** When argument pages are shared on social platforms, Open Graph tags provide the title, description, and image shown in the preview card.
- **Conclusion:** Moderate priority alongside any HTML output feature. See [Web Standards Plan](./web-standards.md).

### 10. CORS and CSP

**Relevance:** High (for web integration)  
Cross-Origin Resource Sharing (CORS) and Content Security Policy (CSP) are HTTP security mechanisms.

- **Use case:** Any future HTTP API or web UI will require correct CORS headers to allow browser clients to call the API, and CSP headers to mitigate XSS risks.
- **Conclusion:** High priority when a web layer exists. See [Web Security Headers Plan](./web-security-headers.md).

---

## Priority Summary

| Standard / Protocol    | Priority | Dependency                     |
|------------------------|----------|--------------------------------|
| Common formats (CSV, JSON, XML, YAML) | High | None — applicable now |
| JSON-LD / Schema.org   | High     | None — extends existing JSON   |
| CORS / CSP headers     | High     | Requires HTTP server layer     |
| vCard export           | Medium   | Person/org nodes in graph      |
| Open Graph             | Medium   | Requires HTML rendering layer  |
| Microformats           | Medium   | Requires HTML rendering layer  |
| RSS / Atom feeds       | Medium   | Requires HTTP server layer     |
| iCal / CalDAV          | Low      | Limited relevance to data model|
| ActivityPub            | Low      | Significant architecture change|
| WebSub                 | Low      | Requires HTTP server and hub   |

---

## References

- [RSS 2.0 Specification](https://www.rssboard.org/rss-specification)
- [Atom Syndication Format — RFC 4287](https://datatracker.ietf.org/doc/html/rfc4287)
- [WebSub — W3C Recommendation](https://www.w3.org/TR/websub/)
- [ActivityPub — W3C Recommendation](https://www.w3.org/TR/activitypub/)
- [JSON-LD 1.1 — W3C Recommendation](https://www.w3.org/TR/json-ld11/)
- [Schema.org](https://schema.org/)
- [iCalendar — RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545)
- [vCard — RFC 6350](https://datatracker.ietf.org/doc/html/rfc6350)
- [Microformats](https://microformats.org/)
- [Open Graph Protocol](https://ogp.me/)
- [CORS — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Content Security Policy — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
