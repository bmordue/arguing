## 2025-05-15 - [Input Validation and Error Handling Enhancement]
**Vulnerability:** Lack of input validation in the data import pipeline allowed malformed or malicious data to be processed, potentially leading to application crashes or database corruption. Additionally, unhandled exceptions exposed internal stack traces to users.
**Learning:** Even when validation logic exists in a codebase, it may not be consistently applied across all data entry points, especially in multi-format importers.
**Prevention:** Integrate validation at the lowest possible layer before data persistence (e.g., in the database insertion logic) and use global `try-catch-finally` blocks at the application entry point to sanitize errors and manage resources.

## 2025-05-16 - [CSV Injection (Formula Injection) Prevention]
**Vulnerability:** Data exported to CSV was not sanitized, allowing fields starting with characters like `=`, `+`, `-`, or `@` to be interpreted as formulas by spreadsheet applications. This could lead to arbitrary command execution on the user's machine.
**Learning:** Security focus often leans heavily toward input validation (inbound), but data sanitization for specific export formats (outbound) is equally critical to protect downstream consumers of the data.
**Prevention:** Implement a dedicated sanitization step for CSV exports that prefixes potentially dangerous starting characters with a single quote (`'`), ensuring they are treated as literal text by spreadsheet engines.
