# AI Requirements Analyzer

AI Requirements Analyzer is a university project for helping students and junior analysts review software requirements before implementation. Its goal is to connect unclear statements to their source, explain concerns, and suggest questions for human review.

**Current status — 19 November 2026:** the repository contains the v1.0 candidate defined in [V1_SCOPE.md](ai-requirements-analyzer/docs/V1_SCOPE.md). It adds local accounts, account-owned projects saved in SQLite, and a server-side Gemini dialogue that can discuss the board and apply undoable board changes. The text-input page at `/prototype` validates requirements and, for signed-in users, runs a source-linked Gemini analysis (Sprint 2, FR-06–FR-14). v1.0 has not been tagged or accepted.

## Implemented input prototype

Open `/prototype` to use the working browser-to-backend flow:

- Paste and edit requirements text or upload one UTF-8 `.txt` file.
- Validate input through FastAPI and preview the accepted text, source, character count, and line count.
- Reject blank input, unsupported file types, invalid UTF-8, and samples above 20,000 Unicode code points.
- Remove one leading BOM and normalize line endings while preserving wording and paragraph breaks.
- Correct input and submit again; editing input clears the previous preview.

This increment covers **FR-01–FR-05** in [the functional requirements](FUNCTIONAL_REQUIREMENTS.md).

## Board workspace

Open `/`, create an account or sign in, then create a project or open one you own. Projects open directly on the board, with floating tools and a dialogue panel on the right.

- Register with a username and password; sign in and out. Each project belongs to its account, and another account cannot list, open or save it.
- Work on an open-ended canvas with notes, requirements, decisions, file cards, rectangles, ellipses, arrows, freehand drawings and local images.
- Select several objects, move them together, copy/paste them, delete them and use undo/redo (Ctrl+Z / Ctrl+Y). Pinned objects stay locked.
- Board contents save automatically to the project in the server database. A save from an outdated tab is rejected instead of overwriting newer work. JSON export/import provides a portable backup.
- Open the dialogue to ask Gemini about the project and current board. Explicit requests can add, edit, move, resize or delete unlocked objects; each reply's changes apply as one batch that Ctrl+Z reverses. Questions alone do not change the board.
- Choose a light or dark theme in the project chooser.

Dialogue and undo history are session-only. Project renaming/deletion, team sharing, password reset and review history remain outside this version.

See the [application run guide](ai-requirements-analyzer/README.md) for limits and details, and the [presentation walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md) for a board-focused demonstration.

## Product purpose

The initial audience is university software-project teams and junior business analysts reviewing short English requirements documents. For example, “The system should respond quickly” leaves the response-time target and operating conditions unresolved.

The planned AI reviewer will show the source excerpt, explain what is missing, and ask a clarification question such as “What response time is acceptable, for which operation, and under what load?” The analysis at `/prototype` does this for a whole requirements text, and the board dialogue can discuss individual statements. A stakeholder supplies the target; AI suggestions require human review.

## Delivery plan and Jira status

The Jira project **AI Requirements Analyzer (SCRUM)** contains three epics and 39 work items as of 19 November 2026. Each sprint assumes one student developer, with 11 committed hours plus 2 hours of contingency. Dates are provisional planning assumptions.

| Increment | Current status |
| --- | --- |
| Sprint 1 — plan and input prototype, through 30 October | Input, validation, and preview are implemented. Jira parent tasks SCRUM-42–SCRUM-45 are marked Done. Planning subtask SCRUM-53 remains In Progress, so the tracker still needs reconciliation. |
| Sprint 2 — AI review, 2–6 November | The server-side Gemini connection, configuration and error handling are implemented and shared with the dialogue. **Analyze with Gemini** at `/prototype` returns functional, non-functional and ambiguous findings, each with an exact source excerpt and line, explanation and clarification question; excerpts are validated against the input. SCRUM-46–SCRUM-49 are marked Done in Jira. |
| Sprint 3 — Gemini dialogue and controlled board actions, 9–13 November | Live dialogue using the project and board context is implemented. Board changes apply directly as one undoable batch per reply, and Gemini may also move, resize or delete unlocked objects. This differs from the planned preview-then-apply flow and the add/edit-only limit in SCRUM-69; the acceptance criteria need to be updated or the behavior changed. |

Jira status records tracking decisions; it does not by itself prove that acceptance criteria or a live model demonstration have passed. See [Sprint 1 planning](https://knuprojectus.atlassian.net/browse/SCRUM-40), [Sprint 2 analysis](https://knuprojectus.atlassian.net/browse/SCRUM-41), and [Sprint 3 dialogue](https://knuprojectus.atlassian.net/browse/SCRUM-66).

PDF/DOCX extraction, broader risk analysis, review history, conversation memory, collaboration, and advanced retrieval remain future scope.

## Running the application

The source is in `ai-requirements-analyzer/`. Both startup options serve the app at **http://localhost:8000/**; the working input prototype is at **http://localhost:8000/prototype**.

### Windows with Python 3.12

Run these commands from the repository root in PowerShell. Dependency installation needs internet access.

```powershell
cd ai-requirements-analyzer
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Create the environment and install dependencies on first setup; use the final command for subsequent starts. Keep the terminal open and press Ctrl+C to stop the server.

For Gemini, copy `ai-requirements-analyzer/.env.example` to `.env` in the same folder and set `GEMINI_API_KEY`, or set the variable in the environment, which takes precedence. `.env` and the `data/` database folder are excluded from Git; never commit a real key. Without a key, accounts, projects and boards still work and the dialogue reports the missing configuration.

### Windows with Docker Desktop

Start Docker Desktop using Linux containers, then open `ai-requirements-analyzer/` and double-click `start-windows.cmd`. Use `stop-windows.cmd` to stop the app. Alternatively, from that folder:

```powershell
docker compose up --build -d
```

Docker configuration and launchers are included. Compose reads the same `.env` file and keeps the database in the `project-data` volume. An earlier version was rebuilt and started with Docker Compose on 27 October 2026; the v1.0 candidate has not been checked with Docker.

See the [application run guide](ai-requirements-analyzer/README.md) for prerequisites, troubleshooting, limits, and API details.

## Verification evidence

The [recorded results](ai-requirements-analyzer/testing/RESULTS.md) list 85 passing automated tests from 19 November 2026: 47 backend, API and real-server acceptance checks, and 38 JavaScript board, editing, AI-action and theme checks. They cover account ownership, restart persistence, SQLite backup/restoration, conflicting saves and operation without a Gemini key. Both suites also passed when rerun after the code was added to this repository. The source-linked analysis added later brings the Python suite to 55 tests (`test_analysis.py`); all 55 Python and 38 JavaScript tests pass locally, and the recorded results above predate it. Provider responses in these tests are controlled, so they make no live Google requests; live model behavior, browser interaction and clean-machine startup are covered by the [manual checks](ai-requirements-analyzer/testing/MANUAL_CHECKS.md).

Run all automated checks from `ai-requirements-analyzer/` after setting up the Python environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe testing\run_tests.py
```

The runner executes the Python suite and the Node.js board tests and writes logs to `testing/results/`. Node.js is needed for these tests, not for running the application. See the [testing guide](ai-requirements-analyzer/testing/README.md) for details.

## Project documents

- [Functional requirements and acceptance criteria](FUNCTIONAL_REQUIREMENTS.md)
- [Use-case model and diagram explanation](USE_CASES.md)
- [Editable use-case diagram](AI-Requirements-Analyzer-Use-Cases.drawio)
- [Use-case diagram (SVG)](AI-Requirements-Analyzer-Use-Cases.svg)
- [Version 1.0 scope and acceptance criteria](ai-requirements-analyzer/docs/V1_SCOPE.md)
- [Application setup and usage](ai-requirements-analyzer/README.md)
- [Product-demo walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md)
- [Testing guide](ai-requirements-analyzer/testing/README.md), [recorded results](ai-requirements-analyzer/testing/RESULTS.md) and [manual checks](ai-requirements-analyzer/testing/MANUAL_CHECKS.md)

The original two-sprint planning baseline, `AI-Requirements-Analyzer-Sprint-Plan.md`, was removed from the tree in commit `e9f38ac`; it remains available in the Git history. Current implementation details are described above and in the application guide; Sprint 3 is tracked in Jira under SCRUM-66.
