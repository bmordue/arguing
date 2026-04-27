# Web Standards Implementation Plan (Microformats and Open Graph)

## Overview

This document provides an implementation plan for integrating **Microformats** and the **Open Graph Protocol** into the **Arguing** project. Both standards are relevant when argument data is rendered as HTML pages, enabling machine-readable metadata for aggregators, search engines, and social media platforms.

---

## Standard Descriptions

### Microformats

[Microformats](https://microformats.org/) are a set of HTML class-name conventions that embed structured data directly in human-readable HTML. They allow parsers (search engines, social readers, feed aggregators) to extract meaningful data without a separate API.

Key Microformats vocabulary:
- `h-card` — represents a person or organisation (analogous to vCard)
- `h-entry` — represents a blog post, article, or discrete piece of content
- `h-cite` — represents a citation or reference
- `h-feed` — represents a stream of `h-entry` items

### Open Graph Protocol

The [Open Graph Protocol](https://ogp.me/) uses `<meta>` tags in an HTML page's `<head>` to describe the page as a rich object. When the page URL is shared on social media (Facebook, Twitter/X, LinkedIn, Slack, Discord), the platform reads these tags to display a rich preview card showing the page title, description, and image.

Key Open Graph properties:
- `og:title` — title of the content
- `og:description` — short description
- `og:type` — type of object (e.g., `article`, `website`)
- `og:url` — canonical URL
- `og:image` — representative image URL

---

## Applicability Analysis

The current Arguing project is a CLI tool with no HTML output. These standards become applicable when one of the following is added:

1. **Static site generation** — export argument graphs as browsable HTML pages (e.g., for publishing debates online).
2. **Web API with HTML responses** — serve argument data via HTTP with an HTML view.
3. **Embeddable widgets** — render argument trees in third-party pages.

The plan below assumes a future **HTML rendering layer** and describes what to implement at that point.

---

## Implementation Plan

### Phase 1 — HTML Rendering of Argument Graphs

**Goal:** Generate browsable HTML pages from argument graph data as a prerequisite for the metadata standards below.

#### Implementation Steps

1. Add `--format html` CLI option.
2. Create `src/exporters/html.ts`:
   - Render each node as an HTML `<article>` or `<section>` element.
   - Render edges as links or visual connectors between nodes.
   - Use a simple template string or a lightweight templating library (e.g., `mustache`, MIT).
3. Output to `<output-basename>/index.html` and one file per top-level claim.

---

### Phase 2 — Open Graph Meta Tags

**Goal:** Add Open Graph `<meta>` tags to every generated HTML page so that sharing the page URL on social media produces a rich preview card.

#### Mapping: Argument Graph → Open Graph

| Arguing concept | Open Graph property | Example value |
|-----------------|--------------------|-|
| Top-level claim label | `og:title` | "16-year-olds should be allowed to vote" |
| Summary of premises | `og:description` | "Supported by 3 premises and 2 rebuttals" |
| Graph page URL | `og:url` | `https://example.com/debates/voting-age` |
| Node type | `og:type` | `article` |
| Optional image | `og:image` | Graph visualisation PNG |

#### Example HTML `<head>`

```html
<head>
  <meta charset="UTF-8">
  <title>16-year-olds should be allowed to vote</title>

  <!-- Open Graph -->
  <meta property="og:title"       content="16-year-olds should be allowed to vote" />
  <meta property="og:description" content="Supported by 3 premises and 2 rebuttals." />
  <meta property="og:type"        content="article" />
  <meta property="og:url"         content="https://example.com/debates/voting-age" />
  <meta property="og:image"       content="https://example.com/debates/voting-age/graph.png" />
  <meta property="og:site_name"   content="Arguing" />
</head>
```

#### Implementation Steps

1. Extend `src/exporters/html.ts` to accept a base URL configuration option (`--base-url`).
2. For each top-level claim page, inject the Open Graph `<meta>` tags into the `<head>`.
3. Add a helper `buildOpenGraphMeta(node: Node, baseUrl: string, graph: Graph): string` that returns the meta tag block.
4. Optionally add Twitter Card meta tags (`twitter:card`, `twitter:title`, `twitter:description`) as these use the same data.
5. Add tests verifying the correct `og:title` and `og:description` appear in the output HTML.

---

### Phase 3 — Microformats Markup

**Goal:** Embed Microformats class names in the generated HTML so that parsers and aggregators can extract structured argument data directly from the page.

#### Mapping: Argument Graph → Microformats

| Arguing concept | Microformat | HTML pattern |
|-----------------|------------|---|
| Top-level claim | `h-entry` | `<article class="h-entry">` |
| Claim label | `p-name` | `<h1 class="p-name">...</h1>` |
| Claim body | `e-content` | `<div class="e-content">...</div>` |
| Author / person node | `h-card` | `<address class="h-card">` |
| Author name | `p-name` (inside `h-card`) | `<span class="p-name">...</span>` |
| Supporting premise | `h-cite` | `<blockquote class="h-cite">` |
| Publication date | `dt-published` | `<time class="dt-published" datetime="...">` |

#### Example HTML Structure

```html
<article class="h-entry">
  <h1 class="p-name">16-year-olds should be allowed to vote</h1>
  <div class="e-content">
    <p>This argument is supported by the following premises:</p>
    <blockquote class="h-cite">
      <p class="p-name">16-year-olds can make informed decisions</p>
    </blockquote>
  </div>
</article>
```

#### Implementation Steps

1. Extend `src/exporters/html.ts` to add Microformats class names to all generated elements.
2. Apply `h-entry` to each top-level claim page wrapper.
3. Apply `h-card` to any node of type `person` or `organisation` (see [Contact Formats Plan](./contact-formats.md)).
4. Apply `h-cite` to premise and rebuttal nodes when they appear inline in a claim page.
5. Add tests verifying Microformat class names are present in generated HTML using a parser like `microformats-parser` (MIT).

---

### Phase 4 — JSON-LD Structured Data in HTML

**Goal:** Embed JSON-LD `<script type="application/ld+json">` in generated pages for search engine rich results.

This complements Open Graph and Microformats by providing a richer semantic description using Schema.org vocabulary. See also the [Data Formats Implementation Plan](./data-formats-implementation.md) for the JSON-LD context definition.

#### Example

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Claim",
  "name": "16-year-olds should be allowed to vote",
  "description": "Supported by 3 premises and 2 rebuttals.",
  "url": "https://example.com/debates/voting-age"
}
</script>
```

#### Implementation Steps

1. Extend `src/exporters/html.ts` to inject a JSON-LD block using the context from `docs/schema/arguing-context.jsonld`.
2. Add tests verifying the JSON-LD block is valid JSON and contains the expected `@type` and `name` properties.

---

## Recommendation

| Phase | Action | Priority | Dependency |
|-------|--------|----------|------------|
| 1 | HTML rendering of argument graphs | Medium | None |
| 2 | Open Graph meta tags | Medium | Phase 1 |
| 3 | Microformats class names | Medium | Phase 1 |
| 4 | JSON-LD in HTML | Medium | Phase 1 + Data Formats Plan |

These standards are practical and relatively low-effort to add once an HTML rendering layer exists. They significantly improve the discoverability and shareability of published argument graphs.

---

## References

- [Open Graph Protocol](https://ogp.me/)
- [Microformats.org](https://microformats.org/)
- [h-entry — Microformats2](https://microformats.org/wiki/h-entry)
- [h-card — Microformats2](https://microformats.org/wiki/h-card)
- [Twitter Cards Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Schema.org Claim](https://schema.org/Claim)
- [Google Rich Results — Schema.org](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
