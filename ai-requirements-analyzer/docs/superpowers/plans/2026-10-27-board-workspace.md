# Board Workspace Implementation Plan

**Goal:** Make the board the useful default workspace, using the scope approved in chat.
**Architecture:** Keep the existing browser UI and board JSON schema. Use localStorage for this sample project's board; preserve manual pinning and JSON export/import. No dependencies or backend changes.
**Approved design:** Use the board as the main workspace and remove obsolete screens. Remove automatic pinning. Add search/type filters, duplication, undo deletion, and browser saving. Keep the separate input prototype and existing history navigation.

- [x] Add model checks for search/type filtering, duplication, and browser storage validation/failures. Run them before implementation.
- [x] Remove obsolete screens, sample review logic and links; redirect old review/context routes to board. Keep dialogue and route history to the board.
- [x] Extend board controls and save every board mutation, including drag, keyboard movement, pin, import, proposal, and dialogue notes. Report save failures; preserve invalid saved data rather than overwriting it automatically.
- [ ] Check meaningful model/backend tests and browser flows, including refresh, legacy links, empty filters, delete/undo, and manual-only pins. Update README and walkthrough.

Review focus: blocked/full browser storage; malformed saved boards; duplicates at the 100-card limit; undo after import/reset; old links and browser Back. Undo is session-only, clears on import/reset, and respects capacity. Browser saving is local to this origin and browser; JSON remains portable backup. Reset requires confirmation because the board now persists.

Execution: implemented inline using existing files; no Git checkout available. Model suite: 9 pass; script syntax checks pass. Backend run stalled and was stopped; UI verification blocked by Computer Use URL-policy check. See VERIFICATION.md for remaining manual checks.
