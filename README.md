# AI Requirements Analyzer

AI Requirements Analyzer is a university project for helping students and junior analysts review software requirements before implementation. Its goal is to connect unclear statements to their source, explain concerns, and suggest questions for human review.

**Current status — 19 November 2026:** text/TXT input validation, username/password accounts, owner-assigned project creation, server-saved project boards, and Gemini dialogue with reviewed draft-card proposals are implemented. Configure a server API key to enable Gemini. The separate input prototype still validates and previews without model analysis.

## Implemented input prototype

Open `/prototype` to use the working browser-to-backend flow:

- Paste and edit requirements text or upload one UTF-8 `.txt` file.
- Validate input through FastAPI and preview the accepted text, source, character count, and line count.
- Reject blank input, unsupported file types, invalid UTF-8, and samples above 20,000 Unicode code points.
- Remove one leading BOM and normalize line endings while preserving wording and paragraph breaks.
- Correct input and submit again; editing input clears the previous preview.

This increment covers **FR-01–FR-05** in [the functional requirements](FUNCTIONAL_REQUIREMENTS.md).

## Board workspace

Open `/` or `/demo`, then sign in or create an account and open an owned project. Projects open directly on the board, with floating tools and a dialogue panel on the right.

- Work on an open-ended canvas that fills the workspace beside the right-hand dialogue panel. Use the floating toolbar and Board menu instead of stacked page controls.
- Add and edit notes, requirements, decisions, and file cards. Draw rectangles, ellipses, arrows and freehand sketches with color, line-width and fill controls.
- Upload local PNG, JPEG, WebP or GIF images; they are resized/re-encoded in the browser and embedded in the board.
- Drag objects to move them, drag their bottom-right handle to resize, or enter dimensions in the editor. Use the mouse wheel to zoom toward the cursor (1–200%); use Pan to move around. The canvas has no scrollbars or fixed edges. Use Board → Fit board to find your notes again; new objects appear in the visible working area.
- Search card titles and contents and filter by card type.
- Duplicate a card or undo card deletions during the current session.
- Move cards by dragging or keyboard; pin/unpin manually. Starter cards, duplicates, and dialogue notes start unpinned.
- Board contents, images and positions save automatically to the account-owned project in SQLite. A visible status reports saving failures; JSON export/import provides a portable backup.
- Add TXT/Markdown excerpts or references to other files. PDF/DOCX contents are not parsed.
- Use server-side Gemini dialogue with board text and recent conversation; explicitly save its notes to the board.
- Preview and add/discard Gemini-generated draft cards. Existing cards and pins remain protected.

Each project belongs to its creator. Accounts can only list, open and save their own projects; board changes persist in the server database across sessions. Native startup stores data in `ai-requirements-analyzer/data/analyzer.sqlite3`; Docker uses a persistent volume. Dialogue and deletion undo remain session-only. Existing browser boards can be imported when creating a project. Export JSON for a portable backup. Review history remains illustrative; team sharing and password recovery are not implemented.

See the [presentation walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md) for a board-focused demonstration.

## Product purpose

The initial audience is university software-project teams and junior business analysts reviewing short English requirements documents. For example, “The system should respond quickly” leaves the response-time target and operating conditions unresolved.

The planned dedicated document-review flow will show the source excerpt, explain what is missing, and ask a clarification question such as “What response time is acceptable, for which operation, and under what load?” A stakeholder supplies the target; AI suggestions require human review.

## Delivery increments

The project is tracked in Jira as **AI Requirements Analyzer (SCRUM)**. The table describes the current application; it does not claim that Jira statuses have been updated.

| Increment | Current status |
| --- | --- |
| Sprint 1 — input prototype | Text/TXT input, validation and preview are implemented at `/prototype`. |
| Sprint 2 — AI review | Board dialogue can review supplied text through Gemini. A dedicated source-linked document-analysis screen remains planned. |
| Sprint 3 — dialogue and board actions | Live Gemini dialogue and reviewed new-card proposals are implemented. Existing cards and manual pins stay protected. |
| Accounts and projects | Registration, sign-in/out, account-owned project creation and persistent project boards are implemented. |

See [Sprint 1 planning](https://knuprojectus.atlassian.net/browse/SCRUM-40), [Sprint 2 analysis](https://knuprojectus.atlassian.net/browse/SCRUM-41), and [Sprint 3 dialogue](https://knuprojectus.atlassian.net/browse/SCRUM-66).

PDF/DOCX extraction, source-linked document findings, saved review history, persistent conversation history, password recovery, project renaming/deletion, team collaboration and advanced retrieval remain future scope.

## Accounts and projects

Open the app, select **Create an account**, then choose **New project**. Projects are assigned to the signed-in account. Passwords are hashed with scrypt; sessions use HttpOnly cookies. SQLite requires no separate service or new Python dependency. See [account and storage details](ai-requirements-analyzer/README.md#accounts-and-projects) for migration, backups and limits.

## Gemini connection

Dialogue and **Board → Ask Gemini for board drafts** now call Gemini through the FastAPI server. Set `GEMINI_API_KEY` before startup; `GEMINI_MODEL` defaults to `gemini-3.8-flash` and can be changed. Use `gemini-3.5-flash-lite` for the configuration successfully tested in this project; generation with `gemini-3.8-flash` returned provider service errors during testing. For Docker, copy `ai-requirements-analyzer/.env.example` to `.env` in that folder and fill in your key. For native Python, set environment variables in the startup shell. See [Gemini setup](ai-requirements-analyzer/README.md#configure-gemini) for the hidden-key prompt and restart steps.

Sending a message or requesting drafts sends board text and recent dialogue to Google. Image pixels save with project boards and are not sent to Gemini; file binaries are not parsed. Responses are drafts; new cards require explicit review and application. Missing keys or provider failures show errors and never fall back to sample answers. The input preview at `/prototype` remains independent of Gemini.

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

Docker configuration and launchers are included. Accounts and project boards are kept in the persistent `project-data` volume; keep that volume when rebuilding or stopping the app.

See the [application run guide](ai-requirements-analyzer/README.md) for prerequisites, troubleshooting, limits, and API details.

## Current behavior and limits

Accounts and projects are stored on this application server, not in a shared cloud service. Project boards survive refreshes and sign-in sessions. A project starts empty; an existing browser-saved board can be imported during creation. Export JSON for a portable backup.

Gemini uses the server key and sends board text plus recent dialogue to Google only when requested. Image pixels are saved with the board and are not sent to Gemini. Suggestions stay drafts until a person adds them. Conversation history is session-only; save useful discussion as a board note.

The board supports up to 100 objects and an 8 MB board file. The input prototype accepts up to 20,000 characters. See the application guide for account rules, storage, recovery and setup.

## Project documents

- [Functional requirements and acceptance criteria](FUNCTIONAL_REQUIREMENTS.md)
- [Use-case model and diagram explanation](USE_CASES.md)
- [Editable use-case diagram](AI-Requirements-Analyzer-Use-Cases.drawio)
- [Use-case diagram (SVG)](AI-Requirements-Analyzer-Use-Cases.svg)
- [Application setup and usage](ai-requirements-analyzer/README.md)
- [Product-demo walkthrough](ai-requirements-analyzer/docs/PRODUCT-DEMO.md)

The functional requirements retain the original planning baseline. Current application behavior is described above and in the application guide.
