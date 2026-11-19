# AI Requirements Analyzer

A working browser application for submitting software requirements as pasted text or a UTF-8 TXT file, validating the sample on a FastAPI backend, and previewing the accepted content.

**Implemented:** text/TXT validation and preview, accounts, owner-assigned projects and server-saved boards, and server-side Gemini dialogue and direct board actions. Gemini requires your own server API key. Project details, board text/geometry/selection and the last ten dialogue turns are sent to Google only when you send a message or request drafts. Embedded images save with the project and are not sent to Gemini. Dialogue and the input preview are session-only; the dedicated `/prototype` flow still validates and previews without AI analysis.

See the [v1.0 scope and acceptance criteria](docs/V1_SCOPE.md) for the two-person team's release boundary, practical checks and backend/test work before upload. The release is a candidate until those checks are completed.

This folder is the main working copy; the original sibling folder is retained as a snapshot. After signing in, click the color circle beside **Theme:** at the top right of the project chooser to choose **Light** or **Dark**. The setting is saved in this browser and applies to projects, board tools, dialogue and the input prototype. Light is the default and keeps the original appearance.

## Choose how to run

For test commands, requirement coverage, browser/live acceptance checks and recorded results, see the separate [testing folder](testing/README.md).

- **With Docker:** use [Docker Desktop startup](#start-with-docker-desktop-windows); local Python is not required.
- **Without Docker:** use [Python startup](#start-without-docker-windows).

Both options serve the same app at **http://localhost:8000/**. Run commands from the folder containing `main.py` and `compose.yaml`.

## Start with Docker Desktop (Windows)

1. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/) if necessary. Start Docker Desktop and wait until its engine is running. Use **Linux containers** (the usual default); this project uses a Linux Python image on the Windows host. Docker Desktop includes Compose.
2. Extract the ZIP completely and open the `ai-requirements-analyzer` folder.
3. Double-click **`start-windows.cmd`**. It builds the image and starts the application. The first build needs internet access to download the base image and Python dependencies.
4. Open **[http://localhost:8000](http://localhost:8000)**. The app also appears in Docker Desktop under `ai-requirements-analyzer`.

To stop it, double-click **`stop-windows.cmd`**, or stop the app in Docker Desktop. Re-running the start file rebuilds it after source changes. No local Python or Node.js installation is required for the Docker route.

Equivalent commands from PowerShell inside this folder:

```powershell
docker compose up --build -d
```

To view startup logs:

```powershell
docker compose logs -f
# Press Ctrl+C to stop following logs; the app keeps running.
```

To stop the app:

```powershell
docker compose down
```

The host port is bound to `127.0.0.1`, so the Compose setup is for local use. It runs the app as a non-root user with a read-only container filesystem and a temporary `/tmp` mount. A persistent Docker volume, `project-data`, stores the SQLite database. Do not remove the volume if you want to keep accounts and projects.

### If startup fails

- **Docker not found:** install Docker Desktop and reopen the terminal; the launcher also checks this condition.
- **Cannot connect to Docker:** open Docker Desktop and wait for the engine to finish starting.
- **Image / OS mismatch:** switch Docker Desktop to Linux containers.
- **Port 8000 already in use:** run `$env:APP_PORT = '8001'` followed by `docker compose up --build -d`, then open `http://localhost:8001`. The double-click launcher prints the default 8000 URL; use the terminal route for a custom port.
- **Page unavailable just after startup:** allow a few seconds and refresh. Check `docker compose ps` and `docker compose logs` if it stays unavailable.

## Start without Docker (Windows)

Install Python 3.12 with the Windows Python launcher (`py`). Extract the ZIP completely, open the `ai-requirements-analyzer` folder, then right-click inside it and choose **Open in Terminal** (PowerShell). Run the following commands one at a time. The first setup needs internet access to install dependencies:

### First-time setup

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Start the app (each time)

Open PowerShell in the same project folder and run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Open **[http://localhost:8000/](http://localhost:8000/)** for the project chooser or **[http://localhost:8000/prototype](http://localhost:8000/prototype)** for the working input prototype. Keep the terminal open; press Ctrl+C to stop the server. Virtual-environment activation is not required, avoiding PowerShell execution-policy changes.

If `py` is not recognized, install Python with its launcher and reopen PowerShell. If Python 3.12 is missing, install it before running `py -3.12`. If port 8000 is occupied, change `--port 8000` to `--port 8001` and open `http://localhost:8001/`. Do not run the Docker and Python versions on the same port at the same time.

You only need to create `.venv` once. Repeat the dependency-install command after updating `requirements.txt`. No Node.js or separate database service is required; SQLite is included with Python. Gemini setup is below; the board and input preview also work without a key.

## Configure Gemini

Create a key in [Google AI Studio](https://aistudio.google.com/apikey). Keep it on the server; never put it in browser code, board cards, screenshots or Git. The integration uses Google's [generateContent REST API](https://ai.google.dev/api/generate-content) and [structured JSON output](https://ai.google.dev/gemini-api/docs/structured-output), using the built-in HTTP client. A small configuration loader reads local settings.

For settings that survive a new terminal, copy `.env.example` to `.env` in the application folder once, then edit it locally:

```text
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Replace `your_actual_key_here` with your key. Keep an existing `.env` rather than overwriting it. Native Python loads this file at startup; it is excluded from Git and the Docker build. Restart after editing it. Run `pip install -r requirements.txt` through your virtual environment after this update to install the configuration loader.

For **temporary native Python settings**, set the variables in the same PowerShell window before starting the app. This prompt hides the key while you enter it:

```powershell
$geminiSecret = Read-Host 'Gemini API key' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $geminiSecret).Password
$env:GEMINI_MODEL = 'gemini-3.5-flash-lite'
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

For **Docker Compose**, copy `.env.example` to `.env`, fill in `GEMINI_API_KEY` locally, then run `docker compose up --build -d`. Compose passes the settings to the server; `.env` is excluded from Git and the Docker build. Native Python also reads `.env` from the application folder automatically. Explicit environment variables take precedence over the file. Restart/recreate the server after changing settings.

`GEMINI_MODEL` can be set to another model available to your key; the default is `gemini-3.5-flash-lite`, which successfully generated a live reply during project testing. `gemini-3.8-flash` also passed a live planning check; earlier requests to that model returned provider service errors. Missing keys, rejected keys/models, rate limits, network failures, blocked responses and timeouts produce readable errors. There is no canned-answer fallback. Requests have a 60-second provider timeout. Limits are 2,000 characters per message, the last 20 history messages (80,000 characters total), and 60,000 characters of board text. Larger contexts are rejected rather than silently truncated. The current project name/description, object IDs/types/text/pins, positions, dimensions, shape styles, selection, visible world rectangle and nearby-object relationships are transmitted; image pixels, drawings and local file binaries are excluded. TXT/Markdown card excerpts are included; embedded image pixels and drawing paths are not.

This is a local-use app. Keep the supplied loopback binding; public hosting needs deployment hardening and per-account Gemini usage limits in addition to the basic accounts included here. The key-presence status is not proof of a successful Google response.

## Accounts and projects

1. Open the app and choose **Create an account**. Pick a username (3–40 letters, numbers, underscores or hyphens) and password (10–128 characters). Sign in is case-insensitive for usernames. Registration signs you in automatically.
2. Choose **New project**, enter its name and description, and create it. Every new project starts with an empty board and belongs to the signed-in account. If a legacy browser-saved board exists on this site address, an optional checkbox imports it into the new project; the original browser copy is kept.
3. Add cards, drawings or images. **Saved to your account** means the project database accepted them. Reopen the project after a refresh or sign-in to restore its own board. Another account cannot list, open or save it, even if given the project URL.
4. Use **Projects** to return to the project list and **Sign out** there. Dialogue and undo/redo state reset across project/account changes and are not stored as conversation history. Save useful dialogue explicitly as a board note.

The database is `data/analyzer.sqlite3` for native startup, or the persistent `project-data` Docker volume. `APP_DATABASE` can override its path. Database files are excluded from Git and the Docker build. Back up the database while the server is stopped, or export individual board JSON files. Native and Docker installations use separate databases unless explicitly configured otherwise.

Passwords use salted scrypt hashes. Sessions use random tokens in HttpOnly, SameSite=Strict cookies, expire after seven days, and are invalidated on sign-out. Session tokens are hashed in the database. Authentication attempts are limited per IP to 20 per 15 minutes. Requests from other website origins are rejected. For HTTPS deployment, cookies are Secure automatically; `APP_COOKIE_SECURE=1` forces Secure cookies behind a correctly configured HTTPS proxy. The supplied loopback setup supports HTTP locally.

If a session expires during saving, sign in again in the same tab. A **Download unsaved board from expired session** button appears in Projects for the same account; download it and import it into the intended project. This recovery snapshot is in memory: refreshing or closing the tab removes it. On a conflicting save, export first, then return to Projects and reopen the project to load its latest revision.

This is a basic local account system. Email verification, password reset/change, account deletion, team sharing and public hosting controls are outside this increment. Project renaming/deletion is not included. Keep the supplied local binding for this version.

## Board workspace and Gemini dialogue

If Gemini requests fail, stop the server with Ctrl+C and run `.\.venv\Scripts\python.exe diagnose_gemini.py` from the same terminal. It uses that terminal's existing key, or prompts with hidden input; it never saves or prints the key. It checks authenticated model access, lists available Flash models, then sends a tiny request using the exact application request format. Share the diagnostic output, never the key. Restart the server afterward. Server errors now include Google's original HTTP code; HTTP 503 suggests provider unavailability, while a timeout alone does not establish its cause.

Open **http://localhost:8000/**, create an account or sign in, then create a project or open one you own. The workspace opens directly on its board, with floating tools and a dialogue panel on the right. All projects returns to the chooser.

- The board fills the window beside the right-hand dialogue panel on wide screens. Close the panel for more canvas space. The floating bottom toolbar holds Select, Pan, Card, Rectangle, Ellipse, Arrow, Draw, Image, Style, Undo, Redo and Delete. The floating **Board** menu holds Fit board, search/type filters, JSON import/export, direct Gemini board actions, history and reset.
- The canvas has no fixed edges; pan freely in any direction. Drag with **Pan**, or middle-drag anywhere on the canvas, to explore; use the lower-right zoom control (1–200%). **Select** restores normal object dragging; Escape also returns to Select.
- Draw a rectangle, ellipse or arrow by selecting the tool and dragging on the canvas. Draw saves each freehand stroke as a separate editable object. Style sets color, line width and optional shape fill. Object editing can change stroke color/width and fill later.
- **Image** opens local PNG/JPEG/WebP/GIF files up to 12 MB. Images are resized to at most 1,200 pixels on the long edge and re-encoded locally; GIFs become a still frame. Embedded images are stored in your project database; they are not sent to Gemini. Embedded image data is limited to 1.5 million characters per image; the complete board file is limited to 8 MB.
- Move visual objects by dragging them, or move cards by their header. Hover/focus shows object actions and a bottom-right resize handle. **Edit / resize** offers exact width/height (24–1,600 pixels), title and caption. Keyboard users can activate the resize control to open the editor.
- Add notes, requirements, decisions and file cards. Edit titles/content, duplicate cards, or delete selected objects. Undo/redo is session-only and resets on refresh or when opening another project.
- With **Select**, drag empty canvas space to draw a selection box. Click an object to select it; Shift-click or Shift-drag to add/remove objects. Drag any selected object to move the group. Pinned objects stay locked. Click empty space or press Escape to clear selection.
- **Ctrl+A** selects all objects matching the current filters. **Ctrl+C / Ctrl+V** copies/pastes selected board objects, including images and drawings, with new IDs. Copies start unpinned and keep their relative positions. Paste uses the last cursor position on the canvas, or the visible working area. The Board menu also has Copy selected and Paste objects.
- **Ctrl+Z** undoes board changes; **Ctrl+Y** or **Ctrl+Shift+Z** redoes them. The toolbar offers Undo/Redo too. Movement, resizing, card edits, drawing, paste, deletion, pin changes, imports and sample resets are included. History is capped at 50 changes with a memory budget; it does not survive refresh or project switching.
- Press **Delete** or **Backspace**, or use the toolbar Delete button, to remove the selected unlocked objects. Undo restores a group deletion in one step. Arrow keys move a selection by 10 pixels, or 50 with Shift. Shortcuts inside text fields keep their normal text-editing behavior.
- Search titles/body text and combine the search with a card type filter. Adding/duplicating/restoring a card clears filters so the card is visible.
- Drag card headers, or focus a header and use arrow keys (10 pixels; Shift+arrow 50). Pin/unpin manually to lock/unlock position. Starter cards, duplicates and notes from dialogue start unpinned.
- Changes to cards, positions, images and manual pins save automatically to the project in the server database. Read the save status at the top of the canvas. Failed saves remain visible; export JSON before discarding unsaved work. Conflicting updates from another tab are rejected instead of silently overwriting it.
- **Board → Export board** downloads JSON; **Import board** validates and restores it after confirmation. An import replaces the current board. Boards are assigned to an account-owned project on this server. Sign in to the same server to reopen them. JSON export remains a portable backup.
- **Add file** accepts up to 1 MB. UTF-8 TXT/Markdown contents appear as card text, with labelled excerpts for longer text. Other formats produce filename/size references only. Board JSON has an 8 MB import limit, at most 100 cards, and at most 12,000 content characters per card.
- **Open dialogue** sends your message, project name/description, current board text, geometry and recent conversation to Gemini. It can explain controls, discuss project ideas and directly add, edit, move, resize or delete unlocked board objects. It follows the latest message language unless you request another language.
- Requested changes apply automatically without an Add/Discard confirmation. Each reply's changes are one undoable batch and save to the current project. The reply reports actual add/change/delete counts and save status. **Ctrl+Z** reverses the batch. Pinned objects cannot be changed or deleted by Gemini.
- Gemini receives each object's position, dimensions, aspect ratio, selected object IDs, the visible world rectangle and up to five nearby objects with distance/direction/overlap information. It can arrange groups, locate neighbors and preserve proportions. It does not see image pixels, drawing paths or your screen.
- If you manually change the board while Gemini is working, or keep an object editor/resize open, the AI action batch is rejected rather than overwriting your work. Finish the manual edit and ask again. Invalid/stale targets or invalid geometry reject the batch; no partial changes are applied.
- **Board → Ask Gemini to improve board** directly adds useful requirements or clarification notes based on project context. Ordinary questions and brainstorming do not edit the board unless you request changes. Dialogue remains session-only; **Add notes to board** separately saves discussion as a note.


**Board → Reset demo** asks before replacing the current project board with sample cards. Export first to retain your work. Clearing browser storage does not remove server-saved projects. Review history remains an illustrative preview; project creation is implemented.

The separate working input flow is at **http://localhost:8000/prototype**. See the [presentation walkthrough](docs/PRODUCT-DEMO.md).

## Project planning with Gemini

Gemini has focused planning guidance for goals and MVP scope, stakeholder questions, requirement review, user journeys, small delivery slices, backlog acceptance criteria, priorities, effort estimates, team capacity, dependencies, iteration/release plans, risks, research spikes, quality checks, progress and decisions. It chooses the methods relevant to your question and uses the current project and board. Estimates, proposed owners and assumptions should stay clearly labelled; unknown facts are not commitments.

Try these prompts:

- “We have two people with six hours each this week. Tasks A, B and C need 4, 5 and 5 hours; B depends on A. Prioritize A, B, C and show what fits.”
- “Review these requirements for ambiguity and missing failure cases. Suggest testable acceptance criteria.”
- “Break this MVP into three small working deliveries, with dependencies, effort ranges and the main risks.”
- “Add three planning notes to the board: the MVP goal and two deliverables with acceptance checks. Leave unknown owners unassigned.”

Questions produce advice; explicit board requests apply changes directly with undo. The browser supplies today's local date for relative planning dates. This is curated planning guidance, not a live Jira, calendar or web connection.

The guidance draws on the [Scrum Guide](https://scrumguides.org/scrum-guide.html), [GOV.UK user stories](https://www.gov.uk/service-manual/agile-delivery/writing-user-stories) and [prioritization](https://www.gov.uk/service-manual/agile-delivery/deciding-on-priorities), [GAO scheduling guidance](https://www.gao.gov/products/gao-16-89g), [Welsh Government delivery planning](https://digitalpublicservices.gov.wales/guidance-and-standards/service-manual/delivering-services-agile-way/planning-and-managing-delivery-in-an-agile-way), the [Orange Book on risk](https://www.gov.uk/government/publications/orange-book/the-orange-book-management-of-risk-principles-and-concepts), the [Kanban Guide](https://kanbanguides.org/the-kanban-guide/) and [NASA systems engineering guidance](https://www.nasa.gov/reference/2-0-fundamentals-of-systems-engineering/). These methods do not guarantee accurate estimates or deadlines.

## Demonstrate the prototype

Open `/prototype` for these working input checks.

1. Click **Try a sample**, then **Validate & preview**. Show the accepted text, character count, line count, and `Pasted text` source.
2. Edit the text. Show that the old preview clears until the new content is validated.
3. Submit only spaces. Show the error, enter valid text, and submit again without restarting.
4. Choose **Upload TXT** and select `examples/requirements.txt`. Submit and show its filename and content in the preview. The selected source replaces the other source for that submission.
5. Upload a non-TXT file or a file that is not UTF-8 and show the rejection. The API also validates file type; the browser's file filter is only a convenience.
6. Sign in on the home page, return to `/prototype`, validate the sample and choose **Analyze with Gemini**. Show a finding's category, exact source excerpt and line, explanation and clarification question, and the label that these are AI suggestions requiring human review. Edit the text and show that the findings clear.

Analysis calls Gemini once per click through the same server-side connection as the dialogue, so it needs the same key and an account. Excerpts that do not appear exactly in the submitted text are not shown as findings; they are listed separately as unsupported. At most 20 findings are returned.

## Validation rules

- Accept non-empty pasted text or a single UTF-8 `.txt` file; `.TXT` is also accepted.
- Remove a leading UTF-8 BOM and normalize CRLF / CR newlines to LF.
- Reject whitespace-only input, unsupported extensions and invalid UTF-8.
- Accept up to **20,000 Unicode code points** after normalization. Reject larger samples without truncating them.
- Preserve wording, spaces and paragraph breaks. Rendering uses text content so HTML-looking input stays literal.
- Limit raw HTTP request bodies to 1 MiB and raw file content to 80,003 bytes before decoding, bounding memory while allowing the full valid character range.

English is the supported demonstration language, but validation does not attempt language detection. The preview/upload endpoints do not persist documents or send them to an external AI service. Content added to a project board is stored in the account database. Sending board dialogue or requesting board drafts sends the board text and recent dialogue to Google. Runtime multipart handling may use temporary files until the request is closed.

Framework/container setup follows the official [FastAPI container guide](https://fastapi.tiangolo.com/deployment/docker/) and [Docker Compose guidance](https://docs.docker.com/compose/install/).

Mouse-wheel navigation: point at the canvas and scroll up to zoom in or down to zoom out around that point (1–200%, without edge clamping). Scrollbars are hidden; use Pan to drag around the board. The percentage control also remains available. Use Board → Fit board to bring your objects back into view with space around the floating controls.
