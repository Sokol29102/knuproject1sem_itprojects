# Version 1.0 scope and acceptance

**Release status:** candidate scope; v1.0 has not yet been tagged or accepted. The release will contain the current application with targeted backend corrections and tests. Team: two students. The teammate will upload the release after verification.

## Goal

A student or junior analyst can create a private project, organize requirements on a persistent visual board, and use Gemini to discuss or change that board. The same application provides a separate text/TXT validation and preview flow.

This document defines the current v1.0 product scope. The older Sprint 1/2 requirements remain a historical planning baseline; the dedicated source-linked analysis screen (FR-06–FR-14) was added to this scope on 19 November 2026.

## Included scope

- Username/password registration, sign-in/out and account-owned projects.
- Light and dark themes selected in the project chooser and remembered in the browser; light preserves the original appearance.
- Project boards saved in SQLite, including cards, positions, shapes, drawings and embedded images.
- Board navigation, selection, moving/resizing, copy/paste, undo/redo, deletion and manual pinning.
- Server-side Gemini dialogue using project and board context; explicit board requests can add, edit, move, resize or delete unlocked objects.
- Pasted text and UTF-8 TXT validation/preview at `/prototype`.
- Source-linked Gemini analysis of the accepted text at `/prototype` for signed-in users: functional, non-functional and ambiguous findings, each with an exact source excerpt and line, explanation and clarification question. Excerpts not found in the text are listed separately as unsupported.
- Native Windows startup instructions, Docker configuration, backend and board tests, and configuration without committed secrets.

## Acceptance criteria

Use two separate test accounts, two projects and synthetic board content. Record the tested commit, environment, expected/actual result and pass/fail. Criteria below are release checks, not claims that checks have already been performed.

| ID | User outcome | Acceptance criteria |
| --- | --- | --- |
| V1-01 | Access my own projects | A valid registration signs the user in; sign-out blocks access to protected project endpoints. Correct credentials allow sign-in again. Duplicate usernames, invalid registration and incorrect passwords produce clear errors without creating another account or a session. |
| V1-02 | Create and reopen a project | A signed-in user creates a named project and receives an empty board. After adding a note and seeing save confirmation, a refresh and server restart preserve the project's identity, note text and position. Account B cannot list, read or save account A's project, including through direct API requests. |
| V1-03 | Organize a visual board | Create/edit a note, requirement and decision; add a shape, drawing and local image. Select and move two objects together, copy/paste them, delete the copies, undo and redo. Pinned objects stay protected. Panning and cursor-centered wheel zoom work beyond the original viewport; Fit board brings the content back into view. |
| V1-04 | Save safely and recover board content | JSON export/import restores text, positions and an embedded image. Invalid import/save data is rejected without replacing the last valid board. If two tabs save from the same revision, the second stale save is rejected and reports the conflict instead of overwriting newer data. |
| V1-05 | Use a real Gemini assistant | With a valid server key and accessible configured model, a board question receives a live contextual reply without editing the board. An explicit add/move/delete request changes the intended unlocked objects and is reversible as one undo batch. Missing configuration, provider failure or invalid model actions show a readable error, end the loading state and preserve the board; no example answer substitutes for a live reply. |
| V1-06 | Validate a requirements sample | Valid pasted text and UTF-8 TXT produce an accepted preview preserving wording and paragraph breaks. Blank text, invalid UTF-8, unsupported file types and input over 20,000 normalized Unicode code points are rejected. Correcting the input permits a successful retry without restarting the app. |

For V1-05, check missing-key/provider-failure handling with controlled configuration or responses. Also perform at least one genuine successful model request and one genuine board action; controlled responses alone do not establish live integration. Judge the requested outcome rather than exact generated wording.

## Quality checks

| ID | Condition and acceptance target | Evidence to retain |
| --- | --- | --- |
| V1-Q1 Access | Using two accounts, all attempted cross-account project list/read/write operations reveal no foreign project contents and make no foreign changes. | Automated API assertions and their result for the release commit. |
| V1-Q2 Recovery | With the server stopped, back up the test SQLite database, restore a copy into a separate test location, then start with that database. The account can sign in and reopen the expected project with matching object IDs, text and embedded image data. | Actual backup/restore steps and comparison result; use synthetic data and retain the original database. |
| V1-Q3 Reproducible startup | On Windows with Python 3.12 already installed, follow the README in a clean project directory, install the pinned dependencies, start the app and obtain HTTP 200 from `/health`. Without a Gemini key, account/project/board functions remain usable and dialogue reports missing configuration. | Tool versions, commands, actual outcome and any corrected instruction. Do not claim Docker execution unless separately checked. |

## Release boundary

Excluded from v1.0: team sharing, separate administrator/reviewer permissions, formal approval workflows, persistent conversation history, project deletion/renaming, password recovery, PDF/DOCX extraction, Jira integration inside the app, public hosting and a defined v2.0 migration. New board features are deferred until these acceptance checks pass.

Keep the existing use-case diagram as the minimal visual reference. No new diagram set, paid documentation service or additional team ceremonies are included in this release scope. These are scope choices, not evidence that every requirement of the separate laboratory brief has been satisfied.

## Backend and test work before upload

1. Run the existing backend and board suites against the exact candidate commit. Fix failures and add focused regression checks for any corrected behavior; avoid rewriting working parts for the release.
2. Perform the acceptance scenarios above, especially real restart persistence, isolated backup restoration, conflicting saves and live Gemini operations. Existing automated checks can supply evidence where they exercise the same scenario.
3. Record the configured model name and live request outcome without the API key. Earlier Gemini outages are defect/diagnostic evidence. A failed-then-successful CI demonstration, if performed, needs actual CI run links and a corresponding correction.
4. Upload the verified source and tests, identify the submitted commit, and tag `v1.0` after acceptance. Keep `.env`, user databases and local environment folders out of the upload. Record actual implementation and review contributions.

The teammate's upload, a future v2.0 change and any additional Git reviews remain planned until performed. No release, review, incident or test history is implied by this scope document.
