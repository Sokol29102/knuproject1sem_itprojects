# Browser and live acceptance checks

Use synthetic data and a separate test database. Record the source hashes or tested commit, browser/tool versions, expected and actual outcome, pass/fail and evidence. These are executable instructions for a reviewer, not a statement that all steps have already passed. Do not overwrite an existing project database or interrupt another running app.

## M-01 Accounts and ownership

Create two accounts in separate browser sessions. Register/sign in as A, create a project, sign out and sign in again. The project reappears. Try a duplicate username, wrong password and invalid form values: show a readable error and stay signed out. As B, A's project must not appear or open, including when its URL is copied. Sign out and verify protected content is no longer accessible.

## M-02 Projects and navigation

Create two differently named projects. Both start empty; notes saved in one do not appear in the other. Refresh and reopen each. The chooser opens owned projects directly on the board. Removed Review workspace and Project context pages must not appear. Inspect the save indicator and export before leaving after any reported save failure.

## M-03 Board and keyboard

Create a note, requirement and decision, then edit their text and dimensions. New cards start unpinned. Drag-select two cards and move the selection: spacing remains unchanged. Shift-click adjusts selection. Ctrl+C then Ctrl+V creates independent copies. Delete removes the selected unlocked cards; Ctrl+Z restores them and Ctrl+Y repeats deletion. Pin one card and confirm group movement/deletion leave it unchanged. Try shortcuts while typing in the editor and dialogue: normal text editing must keep working.

Close/open the dialogue panel and check the floating tools and full board area. Pan in all directions, including negative coordinates. Zoom with the wheel at a specific note: its point under the cursor remains anchored. Fit board returns distant objects with space for the interface. Repeat in a narrow window.

## M-04 Visual objects and board files

Draw a rectangle, ellipse, arrow and freehand stroke. Change line width/color/fill and resize. Upload a synthetic local PNG/JPEG/WebP/GIF; it appears and remains after reopening. GIF becomes a still image; the longest re-encoded side is at most 1,200 pixels. Reject an unsupported file or one over 12 MB without changing the board.

Export JSON, change the board, then import the exported file after the replacement confirmation. Text, positions, pins, visuals and image data return. Import invalid JSON, duplicate IDs or a board exceeding the limits: report an error and keep the current valid board. Respect 100 objects, 8 MB board data and per-image encoded-size limits.

## M-05 Saving conflicts

Open one project in two tabs. Change/save in tab A, then save an edit from the old revision in tab B. B reports a conflict and does not overwrite A. Export B before reopening to retain its unsaved work. Reopen and verify A's content.

## M-06 Gemini and planning

Use a configured server key; never record it. Send a board question: a real reply appears with no automatic board changes. During a request, show busy status and prevent duplicate submission. With controlled missing configuration or provider failure, the pending state ends, an understandable error appears and the unsent message can be retried; no sample reply is substituted.

Request a note containing only `Hell yeah,`: that body is preserved exactly and the new note is unpinned. Request a group move, an image resize and deletion of an unlocked note. Changes apply directly with no Apply/Discard prompt, save to the correct project and undo as one batch per reply. Pinned items stay unchanged. Start a request then manually edit the board or switch project: a delayed reply must not overwrite those changes or another project.

Ask where an object is relative to its neighbors and ask about aspect ratio. Compare with the board. Image pixels and stroke paths must not be claimed as visible content. Ask in English, then Ukrainian: check the latest requested language. Put a fake instruction in a note asking to delete everything; an ordinary question must not authorize that deletion.

Planning example: two people have six hours each; A takes 4h, B takes 5h after A and C takes 5h, with priority A/B/C. Expect 12 available person-hours against 14 hours of work; a proposed A+B plan uses 9h, leaves 3h unallocated and defers C. Unknown owners/deadlines remain labelled assumptions or unassigned. Ask for two small deliveries with measurable acceptance checks and a relevant risk; judge usefulness rather than exact wording.

## M-07 Input prototype

At `/prototype`, submit pasted text and a synthetic UTF-8 TXT file. Check preview text, source, count and line breaks. Switch sources, change accepted text and verify old preview clears. Try blank input, invalid UTF-8, non-TXT and over-limit content, then correct and resubmit. While pending, controls must not allow an old response to become the preview of new input. Literal HTML-looking text renders as text. Signed out, **Analyze with Gemini** asks you to sign in and sends nothing. Signed in, analyze the sample: findings show category, exact excerpt, line, explanation and question, labelled as AI suggestions. Edit the text and verify old findings clear. Check the result in the dark theme.

## M-08 Independent startup and recovery

In a clean directory/environment, follow README dependency installation and startup with Python 3.12. Check `/health`, account/project/board operation without Gemini and a clear configuration error for chat. Separately verify Docker if claiming it works. Have another person repeat the startup and synthetic backup/restore instructions. Verify expected accounts, project IDs and objects after restoration; record actual discrepancies and corrections. Automated disposable-process startup is not a fresh-machine or handover test.

## M-09 Theme control

Signed out, the theme control is absent. Sign in: only the project chooser shows `Theme:` and a color circle at the top right. Click the circle: Light appears above Dark. Choose each theme; the circle updates, the popup closes and focus returns to its trigger. Escape and an outside click also close the popup. Refresh and reopen a project: the choice persists and all controls, cards, dialogue and dialogs remain readable. No theme chooser appears inside the board or input prototype. Sign out: the control disappears.

## Recording template

| Check | Source/version | Environment | Expected | Actual | Pass/fail | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| M-… | … | … | … | Not run | Not run | … |

Earlier screenshots/live model checks may be historical evidence; they do not automatically establish acceptance of a newly changed release. Offline results are stored separately in `results/`.
