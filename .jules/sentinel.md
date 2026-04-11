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

## 2025-05-18 - [Input Length Limits and XML Robustness]
**Vulnerability:** Lack of input length limits on node and edge fields posed a Denial of Service (DoS) risk through resource exhaustion. Additionally, the XML importer would crash if certain expected tags (like <edges>) were missing, further impacting availability.
**Learning:** Security is not just about preventing unauthorized access; it's also about ensuring availability. Robustness against malformed inputs is a key part of "failing securely".
**Prevention:** Enforce strict maximum length limits in the validation layer for all user-provided strings. Use defensive programming patterns like optional chaining and default values when parsing hierarchical data structures like XML.

## 2025-05-19 - [Comprehensive DoS Protection and Type Enforcement]
**Vulnerability:** Lack of collection size limits (nodes/edges) and file size checks made the application vulnerable to memory exhaustion and Denial of Service (DoS) attacks. Additionally, loose type checking on core fields could lead to unexpected behavior or validation bypasses.
**Learning:** Security validation must extend beyond string lengths to encompass entire collection sizes and physical file properties (like size on disk) to prevent resource exhaustion before data is processed.
**Prevention:** Implement resource-aware validation: check file size using `stat` before reading, and enforce maximum counts for all collection types. Strictly validate data types for all user-provided inputs to ensure consistency and prevent exploitation of dynamic type systems.
