# Sprint 1 prototype implementation plan

Goal: implement FR-01–FR-05 from the parent FUNCTIONAL_REQUIREMENTS.md as a local web application, packaged for Windows Docker Desktop using Linux containers.

Architecture: FastAPI serves static HTML/CSS/JavaScript and two validation endpoints. The same normalization/validation function handles pasted text and decoded TXT files. No database, external calls, or AI simulation.

## Constraints

- At most 20,000 Unicode code points after BOM removal and newline normalization.
- Preserve wording and paragraph structure; reject blank input and unsupported/invalid uploads.
- Uploaded input replaces pasted input; the UI clearly identifies the active source.
- Treat previews as text, never HTML. Invalidate stale previews when input changes.
- Bind the Docker published port to localhost. Run the container as a non-root user.

## Tasks

- [x] Write HTTP acceptance tests for normalization, valid TXT, blank input, size boundaries, invalid UTF-8, unsupported extensions, malformed JSON, source replacement prerequisites, and HTML-like text. Confirm failures against a minimal app.
- [x] Implement main.py validation endpoints: POST /api/preview (JSON text), POST /api/upload (multipart file), GET /health; return accepted text, character/line counts and source. Add a bounded request-body guard and controlled JSON errors.
- [x] Implement accessible static/index.html, style.css and app.js with explicit Paste / Upload source selection, sample/reset controls, busy/error states and real backend preview. Test a complete browser flow, including correction after rejection, Unicode and replacement.
- [x] Package with a pinned dependency lock, Dockerfile, compose.yaml, Windows start/stop helpers, example TXT, local-run guide and demo instructions.
- [x] Run the complete acceptance suite and browser checks; validate YAML and package a clean source ZIP. Attempt Docker checks if the engine becomes available; otherwise disclose that container execution was not verified.

## Review focus

1. UTF-8 BOM, CRLF and supplementary Unicode characters must count consistently.
2. A file switch or edit must not leave a previous success labelled as current.
3. Invalid encoding must not be replaced silently with substitute characters.
4. Uploaded HTML-like text must not execute as markup.
5. Huge requests and missing multipart fields must return controlled errors.

Scope: the user requested the previously defined first prototype and delegated implementation choices; proceed inline. The earlier project design and requirements supply the baseline. AI analysis remains Sprint 2.
