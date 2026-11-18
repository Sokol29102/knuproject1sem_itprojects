# Board workspace walkthrough

Open `/`, create an account or sign in, then select **New project** or open a project you own. Projects open directly on the board, with floating tools and a dialogue panel on the right.

The canvas fills the workspace beside dialogue. The main tools float at the bottom; Board actions float at the top. Close dialogue to expand the canvas further.

1. Open the Card menu in the floating toolbar. Add a requirement and a decision. Edit their contents; drag a card or use its header's arrow keys to move it.
2. Search for a word in a title or card body, then select a type filter. No matches shows an explicit empty state.
3. Duplicate a card. The copy retains text, gets a new identity and starts unpinned. Pin a card manually to lock its position; unpin to move it again.
4. Delete a card and use Restore to restore it. Deletion undo is session-only and resets on import/reset.
5. Check Saved to your account, refresh and reopen the project. Card text, positions, images and manual pins restore from the server database. A failed save shows a warning instead of claiming success. Create a second project to show its separate board.
6. Open dialogue, type a discussion note and click Add notes to board. It adds an unpinned draft only when requested. With GEMINI_API_KEY configured, replies come from Gemini using board text and recent dialogue; missing configuration shows a setup error.
7. Open Board → Ask Gemini for board drafts. Inspect the generated cards, then add or discard them. Existing cards and pins are protected; source text is not automatically rewritten.
8. Board → Export board to download JSON. Import board validates it and asks before replacing the current board. Export a backup before resetting sample data.

## What is real and what is simulated

Accounts, project creation, owner checks and per-project board persistence are implemented. The server uses SQLite; native startup creates data/analyzer.sqlite3, while Docker uses a persistent volume. Only the owner can list/open/save a project. Existing browser boards can be imported when creating a new project. Export JSON for a portable copy.

Dialogue replies and new-card proposals call Gemini through the server when configured. Board text and recent dialogue go to Google on request; image pixels save with the project but are not sent to Gemini; file binaries are not parsed. Drafts require human review. Dialogue is session-only. Review history remains illustrative. Project creation and account ownership are implemented; password recovery and team sharing are not included. See the application README for key/model setup.

File cards accept up to 1 MB; UTF-8 TXT/Markdown can provide text excerpts, while other formats store reference information only. Use `/prototype` for the separately implemented text/TXT validation and preview flow.

## Drawing and images

- Select Rectangle, Ellipse or Arrow, then drag on the canvas. Style sets color, stroke width and shape fill. Select Draw and drag to sketch. Each stroke is a separate object. Escape returns to Select.
- Select Image and choose a local PNG/JPEG/WebP/GIF (up to 12 MB). The board embeds a locally resized/re-encoded image; GIFs use one still frame.
- Drag an object's bottom-right handle to resize; Edit / resize also accepts exact dimensions. Object captions and drawing style can be changed in the editor.
- Select Pan to drag around the open-ended canvas. Zoom is in the lower-right corner. All visual objects are included in server saving and board JSON, subject to storage capacity and the 8 MB board limit.

![Visual board preview](visual-board-preview.jpg)

Mouse-wheel navigation: point at the canvas and scroll up to zoom in or down to zoom out around that point (1–200%, without edge clamping). Scrollbars are hidden; use Pan to drag around the board. The percentage control also remains available. Use Board → Fit board to bring your objects back into view with space around the floating controls.
