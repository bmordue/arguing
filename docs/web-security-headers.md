# Web Security Headers Implementation Plan (CORS and CSP)

## Overview

This document provides an implementation plan for adding **Cross-Origin Resource Sharing (CORS)** and **Content Security Policy (CSP)** HTTP headers to any web integration layer added to the **Arguing** project.

---

## Standard Descriptions

### Cross-Origin Resource Sharing (CORS)

CORS is a W3C/WHATWG mechanism that allows a web server to specify which origins (domains) are permitted to make cross-origin HTTP requests to it. Without CORS headers, browsers block JavaScript running on `https://example.com` from fetching data from `https://api.arguing.io` — even if the API is publicly accessible.

CORS is controlled via HTTP response headers:
- `Access-Control-Allow-Origin` — which origins may access the resource
- `Access-Control-Allow-Methods` — which HTTP methods are permitted
- `Access-Control-Allow-Headers` — which request headers are permitted
- `Access-Control-Allow-Credentials` — whether cookies/auth headers are sent
- `Access-Control-Max-Age` — how long preflight results can be cached

### Content Security Policy (CSP)

CSP is an HTTP response header that instructs browsers to restrict which resources (scripts, styles, images, fonts, iframes) a page may load and execute. It is the primary defence against **Cross-Site Scripting (XSS)** attacks.

CSP is controlled via the `Content-Security-Policy` header (and optionally `Content-Security-Policy-Report-Only` for monitoring without enforcement).

---

## Applicability Analysis

The current Arguing project is a **CLI tool** with no HTTP server. CORS and CSP become relevant when any of the following is added:

1. **A REST/GraphQL API** — browser clients need CORS to call it from other origins.
2. **A web UI** — the served HTML pages need CSP to mitigate XSS.
3. **An embeddable widget** — third-party pages embedding the widget need CORS on the asset URLs.

The implementation plan below is structured for a future Express.js (or similar) HTTP server layer.

---

## Implementation Plan

### Phase 1 — HTTP Server Foundation

**Goal:** Add a minimal HTTP server to serve argument data via an API and/or HTML pages.

**Recommended stack:** `express` (MIT) — widely used, well-documented, extensive middleware ecosystem.

```typescript
import express from 'express';
const app = express();
app.listen(3000);
```

All subsequent phases depend on this server existing.

---

### Phase 2 — CORS Configuration

**Goal:** Allow selected browser clients to call the Arguing API from other origins.

#### Recommended Approach

Use the `cors` middleware package (MIT) for Express. It handles all CORS header logic including preflight (`OPTIONS`) requests.

```bash
npm install cors
npm install --save-dev @types/cors
```

#### Configuration

CORS policy should be configurable, not hardcoded. The recommended configuration approach:

```typescript
import cors from 'cors';

// Load allowed origins from environment variable (comma-separated list)
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,       // Set to true only if cookies/auth headers are required
    maxAge: 86400,            // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));   // Handle preflight for all routes
```

#### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `https://myapp.com,https://admin.myapp.com` |

#### Security Considerations

- **Never use `origin: '*'` in production if `credentials: true`** — this combination is forbidden by the CORS spec and browsers will block it.
- **Validate the allowlist** — origins must be exact URL scheme+host+port strings. Avoid wildcard subdomains unless the `cors` package subdomain matching is used carefully.
- **Log rejected origins** — helps diagnose configuration issues without leaking policy details to clients.

---

### Phase 3 — Content Security Policy

**Goal:** Restrict which resources the Arguing web UI may load, mitigating XSS attacks.

#### Recommended Approach

Use the `helmet` middleware package (MIT), which sets multiple security-related headers including CSP.

```bash
npm install helmet
```

#### CSP Directives for Arguing

The following policy is appropriate for a server-rendered HTML application with no inline scripts and no third-party dependencies:

```typescript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],           // No inline scripts; add nonce if needed
            styleSrc:       ["'self'"],
            imgSrc:         ["'self'", "data:"],  // Allow data URIs for inline SVG graphs
            fontSrc:        ["'self'"],
            connectSrc:     ["'self'"],            // API calls only to same origin
            frameSrc:       ["'none'"],            // No iframes
            objectSrc:      ["'none'"],            // No plugins
            baseUri:        ["'self'"],
            formAction:     ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    // Other helmet defaults also set: X-Frame-Options, X-Content-Type-Options, etc.
}));
```

#### CSP Nonce for Inline Scripts (if required)

If inline `<script>` blocks are unavoidable (e.g., injected JSON-LD), use a per-request nonce:

```typescript
import { randomBytes } from 'crypto';

app.use((req, res, next) => {
    res.locals.cspNonce = randomBytes(16).toString('base64');
    next();
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            scriptSrc: ["'self'", (req, res) => `'nonce-${(res as any).locals.cspNonce}'`],
        },
    },
}));
```

In the HTML template:

```html
<script type="application/ld+json" nonce="<%= cspNonce %>">
{ ... }
</script>
```

#### Reporting

Add a `report-uri` or `report-to` directive to collect CSP violation reports:

```typescript
directives: {
    // ...
    reportUri: ['/csp-report'],
}
```

```typescript
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    logger.warn('CSP violation', req.body);
    res.status(204).end();
});
```

---

### Phase 4 — Additional Security Headers (via `helmet`)

`helmet` automatically configures several other important headers. The defaults are appropriate for Arguing:

| Header | Default value set by `helmet` | Purpose |
|--------|-------------------------------|---------|
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `no-referrer` | Limits referrer leakage |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Enforces HTTPS |
| `X-DNS-Prefetch-Control` | `off` | Reduces DNS leakage |
| `Permissions-Policy` | (feature restrictions) | Restricts browser features |

No additional configuration is needed for these — `helmet` defaults are correct for the Arguing use case.

---

### Phase 5 — Testing

#### CORS Tests

1. **Unit test** the `origin` callback with allowed and disallowed origins.
2. **Integration test:** Send `OPTIONS` preflight requests and assert correct `Access-Control-Allow-Origin` header.
3. **Negative test:** Assert that requests from non-allowlisted origins do **not** receive the `Access-Control-Allow-Origin` response header. Note: CORS enforcement is performed by the browser — the server simply omits the header, causing the browser to block the response. The server may return a `403` if it actively rejects the origin, but the typical behavior is a `200` response with no CORS headers (the browser blocks the response body client-side).

#### CSP Tests

1. **Integration test:** Fetch a generated HTML page and assert `Content-Security-Policy` header is present and contains `'self'` in `default-src`.
2. **Regression test:** Verify that the CSP does not unintentionally block required resources (scripts, styles).
3. Use the [CSP Evaluator](https://csp-evaluator.withgoogle.com/) for manual verification of the policy string.

---

## Configuration Summary

All CORS and CSP configuration should be driven by **environment variables** to support different policies in development, staging, and production:

| Variable | Purpose | Development default | Production recommendation |
|----------|---------|---------------------|--------------------------|
| `CORS_ALLOWED_ORIGINS` | Allowlisted origins | `http://localhost:3000` | Explicit list of production domains |
| `CSP_REPORT_URI` | CSP violation reporting URL | _(empty)_ | Internal reporting endpoint |
| `NODE_ENV` | Enables/disables strict mode | `development` | `production` |

---

## Recommendation

| Phase | Action | Priority | Dependency |
|-------|--------|----------|------------|
| 1 | Add HTTP server (Express) | High (for web layer) | None |
| 2 | CORS via `cors` middleware | High | Phase 1 |
| 3 | CSP via `helmet` middleware | High | Phase 1 |
| 4 | Additional `helmet` defaults | High (automatic) | Phase 3 |
| 5 | CORS and CSP tests | High | Phases 2–3 |

CORS and CSP are **not optional** for any web-facing deployment. They must be implemented from the first commit that adds an HTTP server, not retrofitted later.

---

## References

- [CORS — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Content Security Policy — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [cors (npm)](https://www.npmjs.com/package/cors)
- [helmet (npm)](https://helmetjs.github.io/)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [WHATWG Fetch — CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)
