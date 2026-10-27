# AI Requirements Analyzer — Sprint 1 prototype

A working browser application for submitting software requirements as pasted text or a UTF-8 TXT file, validating the sample on a FastAPI backend, and previewing the accepted content.

**Implemented:** FR-01–FR-05, the first sprint's input increment. **Planned for Sprint 2:** real AI analysis and source-linked findings. This version makes no AI calls, requires no API key, and stores no document history. The input preview disappears when its input changes. Board cards save locally in this browser; dialogue and the input preview are session-only.

## Choose how to run

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

The host port is bound to `127.0.0.1`, so the Compose setup is for local use. It runs the app as a non-root user with a read-only container filesystem and a temporary `/tmp` mount. No volume or database is required.

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

You only need to create `.venv` once. Repeat the dependency-install command after updating `requirements.txt`. No Node.js, API key or database setup is needed for either startup option.

## Board workspace and dialogue demo

Open **http://localhost:8000/** and choose **AI Requirements Analyzer**. The workspace opens directly on its board, with floating tools and a dialogue panel on the right. All projects returns to the chooser.

- The board fills the window beside the right-hand dialogue panel on wide screens. Close the panel for more canvas space. The floating bottom toolbar holds Select, Pan, Card, Rectangle, Ellipse, Arrow, Draw, Image, Style and Restore. The floating **Board** menu holds Fit board, search/type filters, JSON import/export, sample proposals, history and reset.
- The canvas has no fixed edges; pan freely in any direction. Drag with **Pan**, or middle-drag anywhere on the canvas, to explore; use the lower-right zoom control (1–200%). **Select** restores normal object dragging; Escape also returns to Select.
- Draw a rectangle, ellipse or arrow by selecting the tool and dragging on the canvas. Draw saves each freehand stroke as a separate editable object. Style sets color, line width and optional shape fill. Object editing can change stroke color/width and fill later.
- **Image** opens local PNG/JPEG/WebP/GIF files up to 12 MB. Images are resized to at most 1,200 pixels on the long edge and re-encoded locally; GIFs become a still frame. No image is sent to an external service. Embedded image data is limited to 1.5 million characters per image; the complete board file is limited to 8 MB.
- Move visual objects by dragging them, or move cards by their header. Hover/focus shows object actions and a bottom-right resize handle. **Edit / resize** offers exact width/height (24–1,600 pixels), title and caption. Keyboard users can activate the resize control to open the editor.
- Add notes, requirements, decisions and file cards. Edit titles/content, duplicate cards, or delete and use **Restore**. Undo is session-only and clears after importing a board or resetting samples.
- Search titles/body text and combine the search with a card type filter. Adding/duplicating/restoring a card clears filters so the card is visible.
- Drag card headers, or focus a header and use arrow keys (10 pixels; Shift+arrow 50). Pin/unpin manually to lock/unlock position. Starter cards, duplicates and notes from dialogue start unpinned.
- Changes to cards, positions and manual pins save automatically in this browser. Read the save status below the canvas. If browser storage is unavailable/full, export JSON to keep changes.
- **Board → Export board** downloads JSON; **Import board** validates and restores it after confirmation. An import replaces the current board. Browser saving is specific to this browser and site address and is not a server/database save or cloud backup.
- **Add file** accepts up to 1 MB. UTF-8 TXT/Markdown contents appear as card text, with labelled excerpts for longer text. Other formats produce filename/size references only. Board JSON has an 8 MB import limit, at most 100 cards, and at most 12,000 content characters per card.
- **Open dialogue** provides guided example replies. **Add notes to board** creates an unpinned draft; it does not run automatically. Dialogue itself is session-only.
- **Board → Sample model proposal** demonstrates a simulated proposal with apply/discard. No live model is connected. Pinned cards remain protected from sample proposals.

**Board → Reset demo** asks before replacing the locally saved board with sample cards. Export first to retain your work. Clearing browser storage also removes the saved board. Project creation/settings and review history remain visual previews.

The separate working input flow is at **http://localhost:8000/prototype**. See the [presentation walkthrough](docs/PRODUCT-DEMO.md) and [verification notes](docs/VERIFICATION.md).

## Demonstrate the prototype

Open `/prototype` for these working input checks.

1. Click **Try a sample**, then **Validate & preview**. Show the accepted text, character count, line count, and `Pasted text` source.
2. Edit the text. Show that the old preview clears until the new content is validated.
3. Submit only spaces. Show the error, enter valid text, and submit again without restarting.
4. Choose **Upload TXT** and select `examples/requirements.txt`. Submit and show its filename and content in the preview. The selected source replaces the other source for that submission.
5. Upload a non-TXT file or a file that is not UTF-8 and show the rejection. The API also validates file type; the browser's file filter is only a convenience.
6. Explain the next increment: AI analysis will build on this same input flow. No generated findings are simulated in this prototype.

## Validation rules

- Accept non-empty pasted text or a single UTF-8 `.txt` file; `.TXT` is also accepted.
- Remove a leading UTF-8 BOM and normalize CRLF / CR newlines to LF.
- Reject whitespace-only input, unsupported extensions and invalid UTF-8.
- Accept up to **20,000 Unicode code points** after normalization. Reject larger samples without truncating them.
- Preserve wording, spaces and paragraph breaks. Rendering uses text content so HTML-looking input stays literal.
- Limit raw HTTP request bodies to 1 MiB and raw file content to 80,003 bytes before decoding, bounding memory while allowing the full valid character range.

English is the supported demonstration language, but validation does not attempt language detection. No document content is written to a database or application file, and no external AI service receives it. Runtime multipart handling may use temporary files until the request is closed.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` or `/demo` | Project chooser and visual project workspace |
| GET | `/prototype` | Working Sprint 1 input prototype |
| POST | `/api/preview` | Validate JSON `{"text": "requirements here"}` |
| POST | `/api/upload` | Validate multipart field `file` |
| GET | `/health` | Health check |
| GET | `/docs` | Interactive API documentation |

Successful previews return `text`, `characters`, `lines`, and `source`. Invalid samples return HTTP 400; malformed/missing fields return 422; oversized requests return 413. Error responses include a readable `detail` string.

## Run the acceptance tests

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

See [verification notes](docs/VERIFICATION.md) for the observed results and the Docker verification limitation. Tests exercise real application requests, not mocked server responses.

## Project layout

```text
main.py                   FastAPI routes and bounded input validation
static/                   Browser interface, styles, and behavior
tests/test_app.py         HTTP acceptance checks
examples/requirements.txt Demonstration input
Dockerfile                Linux container image for Docker Desktop
compose.yaml              Local Docker deployment
start-windows.cmd         Windows Docker launcher
stop-windows.cmd          Windows stop helper
requirements.txt          Pinned runtime dependencies
requirements-dev.txt      Test and packaging-check dependencies
docs/                     Requirements, plan and verification notes
```

Framework/container setup follows the official [FastAPI container guide](https://fastapi.tiangolo.com/deployment/docker/) and [Docker Compose guidance](https://docs.docker.com/compose/install/).

Mouse-wheel navigation: point at the canvas and scroll up to zoom in or down to zoom out around that point (1–200%, without edge clamping). Scrollbars are hidden; use Pan to drag around the board. The percentage control also remains available. Use Board → Fit board to bring your objects back into view with space around the floating controls.
