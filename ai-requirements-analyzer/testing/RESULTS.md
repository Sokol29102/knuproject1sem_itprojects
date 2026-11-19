# Recorded automated results

On 19 November 2026, the offline runner completed successfully on Windows 11 with Python 3.12.14 and Node.js v24.22.3.

| Suite | Tests | Outcome | Duration |
| --- | --- | --- | --- |
| Backend, API and disposable real-server acceptance | 47 | Passed | 44.61 seconds |
| JavaScript board, editing, AI batches and themes | 38 | Passed | 0.24 seconds |
| Total | 85 | Passed | 44.85 seconds across test phases |

The authoritative machine-readable record is [results/summary.json](results/summary.json). It contains the exact checked source hashes and environment. Detailed assertions and outcomes are in [backend.log](results/backend.log) and [board-and-theme.log](results/board-and-theme.log). Rerunning the runner updates these files; this written summary describes the recorded run above.

## Added coverage

Eleven new tests extend the existing 74 checks:

- Five real-server checks: restart with all object types intact; stopped-database backup and restoration; simultaneous save conflict; malformed-board rejection preserving the saved revision; usable accounts/projects/boards without Gemini configuration.
- Two Gemini API contract checks: owner-derived project metadata with spoofed fields rejected; provider failure followed by retry with the saved board unchanged.
- Three JavaScript flow checks: every object type survives JSON export/import; a whole AI batch undoes/redoes once while preserving pins and image data; an over-limit group paste rejects all copies.

An additional runner regression test forces a timeout in a real parent/child process, verifies that partial output is retained, and checks that the child is stopped.

The new backup test initially failed during Windows cleanup because its SQLite connection was still open. The test now explicitly closes the connection. The initial result is retained in [initial-backup-cleanup-failure.log](results/initial-backup-cleanup-failure.log). This was a test cleanup correction; no application behavior was changed. This local red/green sequence is not a CI demonstration.

## What this run does not establish

- No live Google calls were made. Provider transport/error responses are controlled. Live response quality, language and board actions require M-06 or the separately invoked diagnostic.
- Browser pointer/keyboard wiring, appearance, local image decoding and the signed-in theme popup are not exercised by the Node model tests. Follow the manual acceptance checklist for those layers. Earlier browser checks are not silently counted as part of this run.
- No clean-machine dependency installation, Docker build, independent handover, release tagging, incident exercise or v2.0 migration was performed.
- The older dedicated Analyze/source-linked findings requirements remain planned. Passing dialogue and board tests do not establish those features.

All acceptance databases used synthetic data in temporary directories. The runner did not use the user's saved project database, and its disposable servers were confirmed closed after the run.
