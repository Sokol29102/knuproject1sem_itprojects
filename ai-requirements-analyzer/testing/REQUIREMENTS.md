# Requirements and test coverage

The current release scope is `docs/V1_SCOPE.md`. Later user requests make theme selection available only after sign-in, in the project chooser, through a top-right `Theme:` color circle opening Light above Dark. Explicit Gemini board requests apply directly; the older Apply/Discard workflow is superseded. Original functional requirements remain a historical baseline and are not all implemented.

“Automated” below describes checks of the named layer. Browser event wiring, visual layout and real model quality need the additional manual checks; a green unit/API test alone is not full browser acceptance.

## Current v1.0 requirements

| Requirement | Automated checks in `tests/` | Additional acceptance / limits |
| --- | --- | --- |
| V1-01 Registration, sign-in/out and invalid credentials | `test_accounts.py`: `test_registration_login_cookie_logout_and_no_plaintext_secrets`, `test_authentication_and_same_origin_are_required`, `test_expired_sessions_and_auth_throttling` | M-01 checks the browser forms and session navigation. |
| V1-02 Owned projects and restart persistence | `test_accounts.py`: `test_projects_and_boards_are_owned_and_persist_across_sessions`; `test_release_acceptance.py`: `test_restart_retains_every_object_type_and_owner_access` | M-01/M-02 check creation, reopening and isolation through the UI. Real process restart is automated. |
| V1-03 Cards, visual objects, selection, movement, copy/paste, undo/redo, Delete and pins | `board.test.mjs`, `board-actions.test.mjs`, `board-ai.test.mjs`; `release-flow.test.mjs`: `a complete AI batch undoes and redoes once without changing locked objects or image content`; restart test saves all seven object types | M-03/M-04 check pointer gestures, keyboard wiring, editing, image upload/decoding and visual rendering. |
| V1-04 Safe saves, JSON backup and conflicting revisions | `test_release_acceptance.py`: `test_invalid_boards_never_replace_the_last_saved_revision`, `test_simultaneous_saves_accept_one_writer_and_preserve_its_complete_board`; `release-flow.test.mjs`: export/import round trip and paste-limit rejection; `board.test.mjs` import/storage cases | M-04/M-05 check actual file download/import and visible conflict feedback. Concurrency test asserts exactly one HTTP 200, one HTTP 409 and the winning complete board. |
| V1-05 Gemini context, direct actions, validation and failures | `test_gemini.py`, `board-ai.test.mjs`, AI history test in `release-flow.test.mjs`; `test_release_acceptance.py`: missing-key case | Transport responses are controlled, not live Google replies. M-06 checks real model operations and one-step undo in the browser. |
| V1-06 Text/TXT validation and correction | `test_app.py`: normalization, code-point length, BOM, upload, invalid input, literal HTML and retry cases | M-07 checks the actual form, pending state, counters and preview invalidation. |
| V1-Q1 Account isolation | `test_accounts.py`: two-account list/read/write assertions; authentication/origin checks; owned project lookup in `test_gemini.py` | These checks cover owner permissions, not separate administrator/reviewer roles, which are excluded. |
| V1-Q2 Database recovery | `test_release_acceptance.py`: `test_stopped_database_backup_restores_accounts_and_exact_board` | Actually backs up a stopped synthetic database, copies it to a new path, starts another server, signs in and compares the complete restored board/revision. |
| V1-Q3 Reproducible startup without AI configuration | All real-server tests start a new interpreter; missing-key test checks health, accounts, board saving and readable chat failure | Partial: clean-machine dependency installation, independent handover and Docker execution still require M-08. |

## Additional board and assistant requirements

| Requested behavior | Automated evidence | Remaining browser/live check |
| --- | --- | --- |
| No Review workspace or Project context pages; board opens directly | `test_app.py`: project chooser and separate prototype route checks | M-02: verify visible navigation and opening an owned project. |
| Canvas fills space beside dialogue; floating tools | No geometric layout assertion | M-03 on desktop and a narrow window. |
| Open-ended panning and cursor-centered wheel zoom | `board.test.mjs`: distant/negative positions, cursor anchoring, zoom limits, screen-to-world and Fit board padding | M-03 checks actual wheel/pan events and controls not covering reachable notes. |
| New/duplicated/pasted/AI cards do not automatically pin | `board.test.mjs`: duplicate starts unpinned; `board-actions.test.mjs`: paste unpins copies; `release-flow.test.mjs`: AI addition starts unpinned | M-03 checks the normal card creation path. |
| Images, shapes, drawings, styles and proportions | `board.test.mjs`: visual object round trip, forbidden image formats/URLs, geometry limits and drawing resize; `board-ai.test.mjs`: resize preserves pixels and scales stroke points | M-04 checks browser resizing/re-encoding and actual rendering. |
| Group selection/movement and Ctrl+C/V, Ctrl+Z/Y, Delete | `board-actions.test.mjs`: selection rectangles, group spacing/pins, copy identity/data, history limits/reset; `release-flow.test.mjs`: whole-group capacity rejection | M-03 checks shortcuts do not intercept typing in a text field. |
| Atomic direct Gemini add/edit/move/resize/delete, protected pins and stale context | `test_gemini.py`: action schema/targets/pins; `board-ai.test.mjs`: atomic rejection and limits; `release-flow.test.mjs`: single batch undo/redo | M-06 checks pending manual edits and project switching while a reply is outstanding. |
| Gemini sees positions, proportions, selection and neighboring objects | `test_gemini.py`: `test_gemini_receives_geometry_selection_and_nearby_objects` | M-06 asks a spatial question. Image pixels and drawing paths are not part of assistant context. |
| Owned project metadata, real conversation roles and latest message | `test_gemini.py`: project metadata cannot be spoofed, history roles and bounded context | Language consistency and ignoring instructions embedded in cards need M-06; no deterministic guarantee of model behavior is claimed. |
| Useful planning guidance and local date reference | `test_gemini.py`: `test_planning_request_includes_reference_date_and_concrete_planning_guidance` | M-06 evaluates real capacity arithmetic, useful acceptance criteria and labelled assumptions. The automated test verifies prompt/date delivery, not reasoning quality. |
| `.env` loading, explicit overrides, server-only key and readable diagnostics | `test_settings.py`, `test_diagnose_gemini.py`, Gemini transport/error tests | Live provider/model availability needs the optional diagnostic or M-06. |
| Light default, remembered dark/light choice and blocked-storage fallback | `theme.test.mjs` | M-09 checks the color circle, Light/Dark order, signed-in chooser visibility, Escape/outside-click closing and contrast. |

## Original Sprint 1/2 baseline

| IDs | Current interpretation and evidence |
| --- | --- |
| FR-01, FR-02 | Implemented text entry and TXT upload. `test_app.py` verifies accepted text, decoding and file type handling; M-07 verifies UI entry/upload. |
| FR-03 | Implemented backend rejection of blank, oversized, invalid UTF-8 and unsupported files. Code-point, line-ending and BOM boundaries are automated. |
| FR-04, FR-05 | Accepted preview and retry API behavior are tested; M-07 verifies rendering and clearing old preview after edits. |
| FR-06 | Dedicated Analyze action from the input prototype remains planned. Board dialogue is a separate implemented feature. No passing “Analyze” test is claimed. |
| FR-07 | Dedicated analysis progress remains planned. Chat pending behavior needs M-06; preview pending behavior needs M-07. |
| FR-08 | Structured candidate functional/non-functional findings with source excerpts remain planned. Existing card types do not satisfy this requirement. |
| FR-09 | Dedicated ambiguity findings containing excerpt, explanation and clarification question remain planned. Conversational advice is not that findings screen. |
| FR-10 | Exact source-excerpt validation for dedicated findings is not implemented. Existing Gemini JSON/action validation does not establish source traceability. |
| FR-11 | Failure and retry are implemented/tested for dialogue; dedicated analysis failure handling remains planned. |
| FR-12 | Dedicated valid-empty-analysis/no-findings state remains planned. `actions: []` is an ordinary chat response, not an analysis no-findings result. |
| FR-13 | Input-preview invalidation needs M-07; stale board-action protection needs M-06. Source-linked analysis/result association remains planned. |
| FR-14 | Live dialogue identifies Gemini and reports applied actions. Dedicated analysis advisory labels remain planned. Explicit board changes now apply without Apply/Discard by the later user instruction. |

## Laboratory and later product work

Test infrastructure has its own regression check in `test_test_runner.py`: a forced timeout preserves captured output and terminates the owned parent/child process tree. This protects test cleanup; it is not counted as a product feature or a CI result.

The separate laboratory brief also calls for CI, release artifacts/tags, architecture/ADR evidence, an incident, a v2.0 migration and handover. These are not made complete by an offline test run. The chosen product is the requirements analyzer, so room-booking overlap/approval tests are not applicable to this scope. Administrator/reviewer permissions, persistent dialogue, PDF/DOCX parsing, sharing, source-linked findings and a v2.0 migration are excluded or planned; tests for nonexistent features are not silently marked passing or skipped.
