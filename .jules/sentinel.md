## 2025-05-15 - [Input Validation and Error Handling Enhancement]
**Vulnerability:** Lack of input validation in the data import pipeline allowed malformed or malicious data to be processed, potentially leading to application crashes or database corruption. Additionally, unhandled exceptions exposed internal stack traces to users.
**Learning:** Even when validation logic exists in a codebase, it may not be consistently applied across all data entry points, especially in multi-format importers.
**Prevention:** Integrate validation at the lowest possible layer before data persistence (e.g., in the database insertion logic) and use global `try-catch-finally` blocks at the application entry point to sanitize errors and manage resources.

## 2025-05-16 - [CSV Injection (Formula Injection) Prevention]
**Vulnerability:** Data exported to CSV was not sanitized, allowing fields starting with characters like `=`, `+`, `-`, or `@` to be interpreted as formulas by spreadsheet applications. This could lead to arbitrary command execution on the user's machine.
**Learning:** Security focus often leans heavily toward input validation (inbound), but data sanitization for specific export formats (outbound) is equally critical to protect downstream consumers of the data.
**Prevention:** Implement a dedicated sanitization step for CSV exports that prefixes potentially dangerous starting characters with a single quote (`'`), ensuring they are treated as literal text by spreadsheet engines.

## 2025-05-17 - [SQLite Foreign Key Enforcement and XML Robustness]
**Vulnerability:** SQLite does not enforce foreign key constraints by default, allowing orphan records (edges pointing to non-existent nodes) which compromises data integrity. Additionally, XML parsing of single-element arrays resulted in TypeErrors/crashes.
**Learning:** Security and stability often depend on library-specific defaults (like SQLite's FKs or fast-xml-parser's array handling) that may not align with application expectations.
**Prevention:** Explicitly enable `PRAGMA foreign_keys = ON;` upon every database connection. Use `isArray` configuration in XML parsers to guarantee consistent data structures regardless of element count.
