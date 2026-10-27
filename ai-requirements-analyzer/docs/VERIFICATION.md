# Open-ended board — 27 October 2026

The board now uses signed world coordinates and an unbounded camera instead of a fixed scrolling rectangle. Notes, images and drawings can move in every direction, including past the former top/left origin. Camera movement no longer clamps against board edges. Cursor-anchored wheel zoom works from 1% to 200%. Pan mode and middle-drag move the camera. New objects appear in the visible working area; Board → Fit board and initial opening fit saved objects with space for the top controls and bottom toolbar. Import/reset also refit content. Existing saved board JSON remains compatible, including signed/distant object positions.

Fresh evidence: **21 board-model tests passed**, covering unrestricted positions, signed-coordinate import, screen/world mapping, zoom anchoring without boundary clamping, drawing resize preserving its origin, and fit margins. All browser scripts pass syntax checks. An independent read-only review found no blocking issues.

Browser checks against the rebuilt Docker app: initial saved-board fit; Pan moving the camera past the old top-left boundary; wheel zoom at a fixed cursor point; and Board → Fit board restoring content to the safe working area. Computed transforms confirmed the cursor's world coordinate remained stable during the wheel change. Existing board objects were retained. Middle-button pan and new object creation in distant locations were not separately browser-tested; their common coordinate paths are covered by model checks.

Screenshot: [infinite-board-preview.jpg](infinite-board-preview.jpg). Older entries below record earlier implementations.

---

# Cursor-anchored wheel zoom — 27 October 2026

Removed the canvas scrollbars. Wheel up/down zooms around the cursor between 25% and 200%; Pan mode still moves around the board. The percentage selector uses the same zoom path, anchored at viewport center. Cursor anchoring is clamped at the finite board edges. The wheel interaction applies across the canvas, including objects, as requested; long card text can still be accessed through its scrollbar/keyboard or editor.

Fresh automated evidence: 18 board-model tests pass, including world-coordinate preservation during zoom-in/zoom-out and scale/edge bounds. JavaScript syntax checks pass. Docker Compose rebuilt and started the updated app. Final browser interaction verification was unavailable because the browser tool returned “browser.user is unavailable”; earlier screenshots below show the previous navigation behavior.

---

# Visual canvas update — 27 October 2026

Implemented: full-window board beside right-hand dialogue; floating canvas tools and Board menu; 6,000 × 4,000 canvas; pan and 25–150% zoom; rectangle/ellipse/arrow tools; freehand strokes; local image upload/re-encoding; object drag-resize and exact dimension editor; editable stroke color/width/fill. Existing manual pins, search, duplication, deletion undo and saving remain.

Fresh automated checks: **16 board-model tests passed**; syntax checks passed for board.js, board-visuals.js, demo.js and projects.js. Added checks cover visual round trips, safe raster data, point bounds, resizing/scaling without modifying the original, enlarged canvas bounds and export/import size consistency.

Browser checks succeeded against the rebuilt Docker app at localhost:8000 after the temporary static server proved unreachable. Observed: the canvas fills the available window beside dialogue; rectangle drawing; exact size and fill editing; a freehand stroke without a viewport jump; local PNG upload/re-encoding; image movement; zoom; and shape/stroke/image persistence after reload. The browser showed the expected object controls and retained the uploaded PNG. Exact pointer-based resize, ellipse/arrow gestures and narrow-screen layouts were not separately exercised.

`docker compose up --build -d` rebuilt the image and started the app successfully. A request to `/health` inside the container returned `{"status":"ok","sprint":1}`. Backend implementation was not changed; the historical Python acceptance checks below were not rerun for this visual update.

Screenshot: [visual-board-preview.jpg](visual-board-preview.jpg). Earlier results below are historical.

---

# Board workspace update — 27 October 2026

Implemented: board-first navigation; legacy links redirect to board; manual-only pinning; title/body search plus type filters; card duplication; session-only deletion undo; local browser saving with visible failure reporting. JSON export/import remains available.

Current automated evidence:

- `node --test tests/board.test.mjs`: **9 passed, 0 failed**. Includes literal search/type filtering, unpinned duplication, local-storage round trips (including empty boards and manual pins), malformed saved data and denied/quota-failed storage, plus existing bounds/import/proposal checks.
- `node --check static/board.js`, `static/demo.js`, and `static/projects.js`: passed.
- Backend unittest run using the existing environment stalled on its first request and was stopped. The bundled Python fallback lacks FastAPI. The 13-test result below is historical, not a new result for this update. Backend implementation was not changed.
- UI verification was attempted but stopped by Computer Use because it could not determine Chrome's current URL confidently enough to enforce its policy. No browser success is claimed for this update.

Manual verification still needed: open project onto board; search and empty filter; add/edit/duplicate/delete/undo; drag and keyboard position save; manual pins; dialogue notes unpinned; refresh persistence; legacy hashes and Back; JSON import/export; failure status when storage is unavailable. Earlier browser evidence below describes the previous interface.

---

# Sprint 1 verification

Date: 24 October 2026. Scope: functional requirements FR-01–FR-05 plus the separately labelled visual product demo.

## Automated acceptance checks

`python -m unittest discover -s tests -v`

13 test methods pass against the real FastAPI application. They cover:

- Pasted input, leading BOM removal, CRLF/CR normalization and retained spaces.
- Exactly 20,000 Unicode code points accepted; 20,001 rejected, including supplementary characters.
- Blank input rejected, followed by a successful corrected submission.
- UTF-8 TXT upload with uppercase extension and BOM.
- Consistent single-BOM removal for pasted and uploaded text, preserving a second leading U+FEFF as content.
- Invalid UTF-8 and unsupported/missing extensions rejected.
- File length checked after newline normalization.
- HTML-looking text preserved as JSON data.
- Malformed JSON, absent fields, wrong types and missing uploads return readable errors.
- An oversized request returns HTTP 413 before JSON parsing.
- Browser entrypoint and health endpoint respond successfully.
- The project chooser is available at / and /demo; the working input is accessible at /prototype.

## Browser checks

Observed in the app's browser against the running local Uvicorn server:

| Scenario | Observed outcome |
| --- | --- |
| Sample text → validation | Accepted; 283 characters, 6 lines; source is Pasted text |
| Edit after acceptance | Previous preview clears immediately |
| Whitespace-only input | Readable rejection; old result not shown as current |
| Correction with emoji and HTML-looking text | Accepted as literal text; 45 characters, 2 lines |
| Switch to Upload TXT | Preview clears; upload source becomes active |
| Upload bundled requirements.txt | Accepted; 521 characters, 13 lines; filename shown; replaces pasted preview |

## Packaging checks and limits

The source includes a Dockerfile, Compose file, runtime dependency lock, Windows start/stop helpers and an example input. Compose YAML is parsed and checked for the expected build context and localhost port mapping.

**Docker image build and container execution are not verified:** Docker is not installed in the execution environment. The browser and API were tested on native Windows Python 3.12. The package targets Python 3.12 in a Linux container on Docker Desktop for Windows; a real `docker compose up --build -d` remains the deployment check.

This is evidence for the application increment, not a declaration that all Sprint 1 management tasks, repository publication, presentation or peer validation are complete. AI analysis and its tests belong to Sprint 2.

## Independent review

The first read-only review found no blocking defects. It identified a double-BOM normalization discrepancy between pasted and uploaded text. A regression check reproduced it, the decoder was changed to let the shared validator remove the BOM exactly once, and all 11 checks then passed. No review findings remained deferred.

## Free board and typed-dialogue increment

Five Node built-in tests pass (`node --test tests/board.test.mjs`), covering canvas bounds, malformed/duplicate board imports, literal imported text, proposal isolation before approval, and pinned-card preservation. The 13 backend checks pass.

Browser checks verified card creation and literal text rendering, arrow-key movement, pin/unpin, edit/save focus restoration, typed messages, guided replies, notes pinned from dialogue, proposal preview/application and a real JSON download/import round trip. The exported board restored all 8 test cards, positions, pin states and dialogue notes.

Independent review identified silent truncation of long dialogue notes and keyboard focus loss on card rerender. Both were reproduced. Oversized dialogue notes now show a rejection and leave the conversation intact; pin/edit actions retain the corresponding card-control focus. The browser recheck confirmed the visible warning and restored focus. No model integration or server persistence was added.


Project chooser increment: browser checks confirmed visual-only creation/settings dialogs, one Library platform workspace, retained board edits on chooser round trips, persistent dialogue access, and heading focus on screen transitions. Legacy #board links canonicalize without trapping browser Back. Independent review identified the history and focus issues; both were fixed and browser-rechecked. All 13 backend and 5 board-model tests pass.
