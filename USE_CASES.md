# AI Requirements Analyzer — use-case model

## Diagram files

- `AI-Requirements-Analyzer-Use-Cases.drawio`: editable diagrams.net file. Open it using **File → Open from → Device** in diagrams.net.
- `AI-Requirements-Analyzer-Use-Cases.svg`: scalable diagram for documents and presentations.
- `AI-Requirements-Analyzer-Use-Cases.png`: image preview.

The diagram covers the planned full product vision. Blue represents Sprint 1, green Sprint 2, and gray future scope. Future use cases need their own requirements and estimates before implementation; showing them does not add them to either committed sprint.

## Actors

**Reviewer (primary):** the person reviewing requirements. Students and junior analysts are the initial audience; developers and supervisors may perform the same role. They are one actor because the planned system does not give them distinct permissions or workflows.

**AI service (supporting):** the external Gemini service participating in classification, ambiguity checks, later risk review, reformulation, and document discussion. It is outside the application's boundary.

FastAPI, the browser interface, document parsing, and a future database are internal implementation components rather than actors. Jira and the university assessor belong to project management and assessment, not the application workflow. No administrator or authentication actor is introduced by this model.

## Use-case catalogue and requirements mapping

| ID | Use case | Delivery | Relevant requirements / purpose |
| --- | --- | --- | --- |
| UC-01 | Enter / edit text | Sprint 1 | FR-01, FR-05; submit a requirements sample and correct it |
| UC-02 | Import requirements | Sprint 1; more formats later | FR-02; UTF-8 TXT initially, PDF/DOCX remain future |
| UC-03 | Preview accepted text | Sprint 1 | FR-04; inspect the accepted sample |
| UC-04 | Validate input | Sprint 1, reused in Sprint 2 | FR-03; reject invalid, empty, unsupported, or oversized input |
| UC-05 | Analyze requirements | Sprint 2 | FR-06, FR-07, FR-10–FR-12; request a real analysis and handle its result |
| UC-06 | Identify candidate functional / non-functional items | Sprint 2 | FR-08; suggest categories, not approved requirements |
| UC-07 | Check for ambiguity | Sprint 2 | FR-09; identify concerns and generate clarification questions |
| UC-08 | Review risks and constraints | Future | Optional broader analysis; no formal requirement ID assigned yet |
| UC-09 | Review findings | Sprint 2 | FR-08–FR-14; inspect results in relation to their submitted sample |
| UC-10 | Inspect source excerpts, explanations and questions | Sprint 2 | FR-08–FR-10; review supporting text and reasoning; questions apply to ambiguity findings |
| UC-11 | Request clearer wording | Future | Optional reformulation for human review, never an automatically approved change |
| UC-12 | Discuss the document | Future | Ask contextual questions and receive AI answers |
| UC-13 | Save project, analysis and conversation | Future | Persist original requirements, analysis and discussion context as part of the discussion workflow |
| UC-14 | Use saved requirements and project decisions | Future | Retrieve stored project information when available |
| UC-15 | Open saved project and conversation history | Future | Resume review of an existing project and its recorded discussion |

## Relationship semantics

- **Actor association (solid, no arrow):** the actor participates in that use case. It does not indicate execution order or data flow.
- **«include» (dashed arrow toward the included use case):** required reusable behavior. Entering/importing means submitting the input for validation; merely typing a character does not require a backend request. Analysis validates the submitted sample again.
- **«extend» (dashed arrow toward the base use case):** optional behavior added under a stated condition. UC-08 extends UC-05 when broader risk/constraint review is requested. UC-11 extends UC-09 when the reviewer requests a reformulation. Both extensions are future scope.

UC-05 and UC-09 are separate user goals: generating an analysis and reviewing its result. The diagram does not use «include» simply to imply that review happens after generation. Likewise, previewing text is available independently after input acceptance rather than being a mandatory extra step in every analysis request.

The AI actor connects to the specific AI-assisted use cases. Shared connector routing outside the system boundary keeps its participation readable; it does not represent an internal service bus.

## Main success scenarios

### Sprint 1: supply and inspect a sample

1. Reviewer enters text or imports a UTF-8 TXT file.
2. Application validates the submitted sample.
3. Application displays the accepted text.
4. Reviewer checks it and may edit or replace it.

### Sprint 2: analyze and review

1. Reviewer requests analysis of the current valid sample.
2. Application validates the sample and indicates progress.
3. AI service produces candidate categories and ambiguity findings.
4. Application validates the response structure and source excerpts.
5. Reviewer inspects results, explanations and clarification questions.
6. Reviewer decides what further clarification is needed. The application does not approve changes on their behalf.

### Future: continue a project discussion

1. Reviewer discusses the current document or opens an existing saved project.
2. Application retrieves the available requirements and project decisions.
3. AI service answers a question using that context.
4. Application stores the project, analysis and conversation for later continuation.

For a first conversation, the current document is available and saved history may be empty. The context use case does not require a pre-existing conversation. Saved decisions represent decisions supplied or confirmed by a human, not guesses promoted automatically into project facts.

## Alternate flows and constraints

These belong in use-case descriptions and acceptance criteria rather than separate goal-level ovals:

- Invalid input: explain the rejection and let the reviewer correct and resubmit it.
- Request in progress: show loading and prevent duplicate Analyze activation.
- Missing configuration, timeout, service error, malformed response, or unsupported source excerpt: show a controlled error and allow retry.
- Valid empty response: show no findings without claiming the sample has no problems.
- New sample accepted: clear or distinguish earlier findings so they are not attributed to the new input.
- Recorded presentation output: label it as recorded if used; it is not a live analysis result.

Input is English text or UTF-8 TXT, capped at 20,000 decoded characters for the committed increments. Human review, source validation and advisory labelling apply to Sprint 2. Accounts, collaboration and deployment are not implied by the diagram. Project planning meetings, a Gantt chart, and retrospectives are course deliverables, not software use cases.
