# AI Requirements Analyzer

AI Requirements Analyzer is a university project for helping students and junior analysts review software requirements before implementation. Its goal is to connect unclear statements to their source, explain concerns, and suggest questions for human review.

**Current status — 27 October 2026:** the Sprint 1 text-input and validation prototype is implemented. The board is the main workspace, with editable cards and a simulated dialogue/proposal demo. Real Gemini analysis and dialogue remain planned. The current application makes no AI requests and needs no API key.

## Implemented input prototype

Open `/prototype` to use the working browser-to-backend flow:

- Paste and edit requirements text or upload one UTF-8 `.txt` file.
- Validate input through FastAPI and preview the accepted text, source, character count, and line count.
- Reject blank input, unsupported file types, invalid UTF-8, and samples above 20,000 Unicode code points.
- Remove one leading BOM and normalize line endings while preserving wording and paragraph breaks.
- Correct input and submit again; editing input clears the previous preview.

This increment covers **FR-01–FR-05** in [the functional requirements](FUNCTIONAL_REQUIREMENTS.md).

## Board workspace

Open `/` or `/demo`, then choose **AI Requirements Analyzer → Open workspace**. Projects open directly on the board, with floating tools and a dialogue panel on the right.

- Work on a open-ended canvas that fills the workspace beside the right-hand dialogue panel. Use the floating toolbar and Board menu instead of stacked page controls.
- Add and edit notes, requirements, decisions, and file cards. Draw rectangles, ellipses, arrows and freehand sketches with color, line-width and fill controls.
- Upload local PNG, JPEG, WebP or GIF images; they are resized/re-encoded in the browser and embedded in the board.
- Drag objects to move them, drag their bottom-right handle to resize, or enter dimensions in the editor. Use the mouse wheel to zoom toward the cursor (1–200%); use Pan to move around. The canvas has no scrollbars or fixed edges. Use Board → Fit board to find your notes again; new objects appear in the visible working area.
- Search card titles and contents and filter by card type.
- Duplicate a card or undo card deletions during the current session.
- Move cards by dragging or keyboard; pin/unpin manually. Starter cards, duplicates, and dialogue notes start unpinned.
- Board contents and positions save automatically in this browser. A visible status reports saving failures; JSON export/import provides a portable backup.
- Add TXT/Markdown excerpts or references to other files. PDF/DOCX contents are not parsed.
- Use the guided dialogue demo and explicitly add its notes to the board.
- Preview and apply/discard simulated model proposals. No model is connected.

Browser saving is specific to the browser and site address; there is no server database or cloud sync. Dialogue and deletion undo history remain session-only. Clearing browser data removes the saved board, so export JSON for a backup. Project creation/settings and review history remain illustrative previews.

See the [presentation walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md) for a board-focused demonstration.

## Product purpose

The initial audience is university software-project teams and junior business analysts reviewing short English requirements documents. For example, “The system should respond quickly” leaves the response-time target and operating conditions unresolved.

The planned AI reviewer will show the source excerpt, explain what is missing, and ask a clarification question such as “What response time is acceptable, for which operation, and under what load?” A stakeholder supplies the target; AI suggestions require human review.

## Delivery plan and Jira status

The Jira project **AI Requirements Analyzer (SCRUM)** contains three epics and 39 work items as of 27 October 2026. Each sprint assumes one student developer, with 11 committed hours plus 2 hours of contingency. Dates are provisional planning assumptions.

| Increment | Current status |
| --- | --- |
| Sprint 1 — plan and input prototype, through 30 October | Input, validation, and preview are implemented. Jira parent tasks SCRUM-42–SCRUM-45 are marked Done. Planning subtask SCRUM-53 remains In Progress, so the tracker still needs reconciliation. |
| Sprint 2 — AI review, 2–6 November | Planned real Gemini analysis, candidate functional/non-functional categories, ambiguity findings, source-excerpt validation, loading/error/empty states, and integrated evidence. SCRUM-46–SCRUM-49 remain In Progress in Jira; the backend does not yet implement these features. |
| Sprint 3 — Gemini dialogue and controlled board actions, 9–13 November | Planned live dialogue using selected context and add/edit card proposals that a person previews and applies or discards. Epic SCRUM-66 depends on Sprint 2. Current dialogue and proposals are simulated. |

Jira status records tracking decisions; it does not by itself prove that acceptance criteria or a live model demonstration have passed. See [Sprint 1 planning](https://knuprojectus.atlassian.net/browse/SCRUM-40), [Sprint 2 analysis](https://knuprojectus.atlassian.net/browse/SCRUM-41), and [Sprint 3 dialogue](https://knuprojectus.atlassian.net/browse/SCRUM-66).

PDF/DOCX extraction, broader risk analysis, database-backed history, conversation memory, accounts, collaboration, and advanced retrieval remain future scope.

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

### Windows with Docker Desktop

Start Docker Desktop using Linux containers, then open `ai-requirements-analyzer/` and double-click `start-windows.cmd`. Use `stop-windows.cmd` to stop the app. Alternatively, from that folder:

```powershell
docker compose up --build -d
```

Docker configuration and launchers are included. The image was rebuilt and the app started successfully with Docker Compose on 27 October 2026; see the verification notes for the checked scope.

See the [application run guide](ai-requirements-analyzer/README.md) for prerequisites, troubleshooting, limits, and API details.

## Verification evidence

The [verification notes](ai-requirements-analyzer/docs/VERIFICATION.md) distinguish earlier browser/backend evidence from the current board change. The current board-model suite has 21 passing tests, including search/type filters, duplication, browser storage round trips, invalid data, and storage failures. Live Gemini integration remains unimplemented. Browser checks against the rebuilt Docker app verified the full-window layout, rectangle creation/style/resize, freehand strokes, local PNG upload, object movement, zoom and refresh persistence. The temporary preview server was unreachable, so checks used the actual app at localhost:8000.

Run the backend checks from `ai-requirements-analyzer/` after setting up the Python environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The board-model tests use Node.js:

```powershell
node --test tests/board.test.mjs
```

Node.js is needed for these board tests, not for running the application.

## Project documents

- [Functional requirements and acceptance criteria](FUNCTIONAL_REQUIREMENTS.md)
- [Use-case model and diagram explanation](USE_CASES.md)
- [Editable use-case diagram](AI-Requirements-Analyzer-Use-Cases.drawio)
- [Use-case diagram (SVG)](AI-Requirements-Analyzer-Use-Cases.svg)
- [Original two-sprint planning baseline](AI-Requirements-Analyzer-Sprint-Plan.md)
- [Application setup and usage](ai-requirements-analyzer/README.md)
- [Product-demo walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md)
- [Recorded verification evidence](ai-requirements-analyzer/docs/VERIFICATION.md)

The two-sprint plan is a planning baseline. Current implementation details are described above and in the application guide; Sprint 3 is tracked in Jira under SCRUM-66.
