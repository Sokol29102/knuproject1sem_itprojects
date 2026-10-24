# Functional requirements — Sprints 1 and 2

**Baseline:** 24 October 2026. These requirements define planned behavior for the two Jira increments. They are not claims of implementation or successful verification.

**Primary actor:** a student or junior analyst reviewing a short English software requirements sample in a local browser application.

**Boundary:** one user, pasted text or UTF-8 TXT, at most 20,000 decoded characters. No accounts, persistent history, chat, PDF/DOCX, or deployment in these sprints. All requirements below are committed scope unless explicitly described as a future extension.

“Shall” identifies required application behavior. Acceptance criteria describe observable checks. Technical enablers appear separately from functional requirements. Product planning, Gantt preparation, presentations, and retrospectives are project deliverables rather than application functions.

## Sprint 1 — Plan and input prototype

**User outcome:** provide a requirements sample and inspect the text accepted by the application. AI analysis is introduced in Sprint 2.

### FR-01 — Enter requirements text

The application shall allow the reviewer to enter and edit requirements text in the browser and submit it for validation.

**Acceptance criteria:**

- Given a non-empty sample within the limit, the reviewer can enter it and submit it without using an API client.
- The submitted content retains its wording and paragraph structure in the accepted preview.

### FR-02 — Import a TXT sample

The application shall allow the reviewer to select a single UTF-8 `.txt` file and use its decoded text as the requirements input.

**Acceptance criteria:**

- Given a valid UTF-8 TXT file within the limit, its text can be submitted and previewed in the browser.
- A UTF-8 byte-order mark, when present, is treated as encoding metadata rather than requirement text.
- Import does not silently combine the file with previously entered text; the active input is clear to the reviewer.

### FR-03 — Reject unsupported or invalid input

The application shall validate input on the backend and reject empty or whitespace-only text, text above 20,000 decoded characters, files with an extension other than `.txt` (case-insensitive), and files that cannot be decoded as UTF-8.

**Acceptance criteria:**

- Empty and whitespace-only samples are rejected with a clear reason.
- A non-empty 20,000-character sample is accepted; a 20,001-character sample is rejected rather than silently truncated.
- A non-TXT file and a TXT file containing invalid UTF-8 bytes are rejected with appropriate messages.
- Invalid input does not produce a successful preview or proceed to AI analysis.

For consistent boundary checks, count Unicode code points after decoding, excluding any UTF-8 byte-order mark. Normalize CRLF/CR line endings to LF before counting; the preview and analysis use that same normalized text. Normalization must not change the wording.

### FR-04 — Preview accepted text

The application shall display the text accepted by the backend in the browser and distinguish that preview from validation errors.

**Acceptance criteria:**

- A valid pasted sample and a valid uploaded sample each produce a readable preview.
- The preview shows the accepted content, including paragraph breaks, rather than a fixed demonstration response.
- A failed validation is not displayed as a successful acceptance of the new input.

### FR-05 — Correct and resubmit input

The application shall allow the reviewer to correct or replace input and submit it again after either a successful preview or a validation error.

**Acceptance criteria:**

- After an invalid submission, the reviewer can correct the problem and obtain a successful preview without restarting the application.
- After accepting a second sample, the application shows the second sample as the current input.

## Sprint 2 — AI review and evidence

**User outcome:** extend the same input prototype to obtain and inspect a first-pass AI analysis. Sprint 1 requirements remain applicable.

### FR-06 — Request an analysis

The application shall provide an Analyze action that sends the current valid requirements text through the backend to the configured AI service.

**Acceptance criteria:**

- The reviewer can start analysis from the browser using a valid sample.
- The backend validates the submitted input before making a model request, even if browser validation is bypassed.
- A successful live demonstration uses a real model response for the submitted sample.

### FR-07 — Show analysis progress

The application shall indicate that analysis is in progress and prevent repeated activation of Analyze while the current request is pending.

**Acceptance criteria:**

- While a request is pending, the browser shows a loading state and disables the Analyze action.
- On success or failure, the pending state ends and the reviewer can submit another request.

### FR-08 — Display candidate requirement categories

The application shall display candidate functional and non-functional requirements returned by the analysis, with a category label and a source excerpt for each displayed item.

**Acceptance criteria:**

- A controlled valid response containing both categories produces readable entries under the corresponding labels.
- A category with no returned items is shown as empty rather than filled with invented content.
- Candidate classifications are presented as suggestions for human review.

### FR-09 — Display ambiguity findings

The application shall display each accepted ambiguity finding with its source excerpt, an explanation of the concern, and a clarification question.

**Acceptance criteria:**

- A controlled valid response for “The system should respond quickly.” displays the excerpt, a concern about an unspecified measurable target, and a question seeking the missing target or conditions.
- The reviewer can read all three fields in the browser.
- The application does not automatically replace the input with a proposed interpretation.

The example is an evaluation target for a live model run; its wording need not match exactly. A controlled response checks rendering and is not evidence that the model reliably detects the issue.

### FR-10 — Validate results against the source

The application shall validate the analysis response structure and ensure that every displayed source excerpt occurs in the text used for that analysis. It shall reject a malformed response or one containing unsupported excerpts and show a controlled analysis error.

**Acceptance criteria:**

- A response with all required fields and matching excerpts can be displayed.
- A response with missing required fields, an unsupported category, or an excerpt absent from the input is rejected rather than presented as a successful analysis.
- A candidate requirement entry requires a category and source excerpt. An ambiguity finding additionally requires a non-empty explanation and clarification question.

Exact-excerpt checks establish traceability; they do not prove that a classification or explanation is correct. Response rejection is the baseline choice for the existing Jira task's allowed “reject or flag” handling, avoiding extra partial-result behavior.

### FR-11 — Report analysis failures and allow retry

The application shall show a readable failure message when analysis cannot complete because configuration is missing, the AI service fails, the request times out, or the response fails validation. The reviewer shall be able to retry with the current input.

**Acceptance criteria:**

- Each failure condition can be exercised with a controlled configuration or response and produces an error state rather than a successful result.
- The loading state ends, the entered text remains available, and Analyze can be used again.
- User-facing messages do not expose credentials or internal stack traces.

### FR-12 — Handle an empty analysis result

The application shall distinguish a valid response containing no candidate items or ambiguity findings from a failed request.

**Acceptance criteria:**

- A valid empty response produces an explicit no-findings state.
- The message does not claim that the input is complete, correct, or free of problems.
- The reviewer can revise the input or request another analysis.

### FR-13 — Keep results associated with their input

The application shall display findings as results for the submitted sample and shall not present findings from an earlier sample as the analysis of newly accepted text.

**Acceptance criteria:**

- After a different sample is accepted, earlier findings are cleared or visibly marked as belonging to the earlier sample.
- A failed analysis of new text does not appear as a successful result simply because an old result exists.

This is consistency behavior within the current page, not persistent project history.

### FR-14 — Identify AI suggestions and recorded examples

The application shall identify analysis output as AI-generated suggestions requiring human review. Any recorded demonstration output shown in the application shall be explicitly labelled as recorded.

**Acceptance criteria:**

- The findings view includes a visible human-review notice.
- If recorded output is used, it is visibly labelled before it can be mistaken for a live response.
- The interface does not label generated classifications, questions, or numerical targets as stakeholder-approved requirements.

Recorded-output support is not a required additional feature. This rule applies if such a fallback is included.

## Technical enablers and traceability

| Enabler | Supports | Jira |
| --- | --- | --- |
| Browser input and FastAPI validation | FR-01, FR-03–FR-05 | SCRUM-54 |
| UTF-8 decoding, TXT import, preview, and error feedback | FR-02–FR-05 | SCRUM-55 |
| Server-side Gemini configuration and bounded request | FR-06, FR-11 | SCRUM-58 |
| Structured response validation and source-excerpt checks | FR-08–FR-12 | SCRUM-59 |
| Analyze action and findings view | FR-06, FR-08–FR-10, FR-13–FR-14 | SCRUM-60 |
| Loading, empty-result, retry, and error states | FR-07, FR-11–FR-13 | SCRUM-61 |

FastAPI, Gemini, server-side credentials, a finite request timeout, and response schemas are implementation constraints/enablers rather than user-facing requirements. The exact model and timeout must be recorded during integration. Authentication, a database, conversation memory, and a separate frontend framework are not prerequisites for this scope.

## Sprint acceptance and evidence

| Sprint | Required application behavior | Verification work | Evidence |
| --- | --- | --- | --- |
| 1 | FR-01–FR-05 | SCRUM-56; parent SCRUM-45 | Runnable commit and guide; paste and TXT demonstrations; invalid-input and length-boundary checks |
| 2 | FR-01–FR-14, subject to the conditional recorded-output rule | SCRUM-62 and SCRUM-63; parent SCRUM-48 | Full browser-to-model demonstration; source checks; invalid/malformed/empty responses; failure and retry checks; source-change consistency |

Record each check as: **requirement ID | input/condition | expected result | actual result | pass/fail | evidence/commit**. Controlled responses may test application handling; at least one real model request is required to demonstrate the live integration. Assess model relevance separately from UI and validation correctness.

Planning materials and the Sprint 1 meeting rehearsal are covered by SCRUM-42, SCRUM-43, and SCRUM-45. The Sprint 2 review and retrospective are covered by SCRUM-49. They are required project deliverables but do not add application functions.

## Future requirements

Chat, persistent history, saved decisions, PDF/DOCX extraction, wider risk analysis, and collaboration require separate requirements and estimates before entering a later sprint. They are not implied by these requirements.
