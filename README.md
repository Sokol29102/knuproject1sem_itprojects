# AI Requirements Analyzer

AI Requirements Analyzer is a university project for a web application that helps people review software requirements before implementation. It uses AI to identify candidate requirements and ambiguous statements, explain concerns, and suggest questions that a human reviewer can resolve.

**Project status:** the first two sprints are planned in Jira. This README describes their intended scope; it does not claim that the application is implemented or that its checks have passed.

## Problem

Early requirements often contain statements such as “the system should respond quickly.” These statements communicate an intention but leave developers without a measurable target. Students and inexperienced analysts may struggle to find these gaps during a manual review.

The application supports a first-pass review by connecting each finding to the original text. It helps the reviewer ask a better question rather than automatically deciding what the requirement should be.

## Audience and value

The initial audience is **university software-project teams and junior business analysts** working with short English requirements documents. Their main task is to identify unclear expectations before development starts.

Developers and supervisors can use the findings to discuss missing decisions. Experienced analysts and project managers are a possible later audience; enterprise workflows are outside the first two sprints.

The audience is a starting assumption to validate with a peer or supervisor during Sprint 1.

## Example

**Input:** “The system should respond quickly.”

**Expected review:**

- Source excerpt: “The system should respond quickly.”
- Concern: “quickly” does not specify a measurable response-time target or the conditions under which it applies.
- Clarification question: “What response time is acceptable, for which operation, and under what load?”

A numerical target must come from the stakeholder. The application must not present an invented value as an approved requirement. This example illustrates intended behavior, not a recorded test result.

## First two sprints

Each sprint extends the same application and ends with a demonstrable increment. The workload assumes one student developer: **11 estimated hours plus 2 hours of contingency per sprint**.

| Sprint | Goal | Working increment | Presentation deliverables |
| --- | --- | --- | --- |
| 1 — Plan and input prototype | Establish a focused product scope and demonstrate the project plan | Paste text or import a UTF-8 TXT file, validate it through the backend, and preview the accepted text in the browser | Jira epics/tasks/subtasks, estimates and deadlines, repository/documentation links, textual project blueprint, Gantt schedule, and planning-meeting rehearsal |
| 2 — AI review and evidence | Turn the input prototype into a first-pass AI reviewer | Analyze the accepted text and display candidate categories and source-linked ambiguity findings, including loading and error states | Demonstrated commit, run instructions, observed check results, planned-versus-actual comparison, and retrospective rehearsal |

Sprint 1 is active in Jira and is due on **30 October 2026**. Sprint 2 is planned for **2–6 November 2026**. The original work schedule allocated Sprint 1 tasks to 26–30 October; Jira records its actual start on 24 October. Dates are planning assumptions, not supplied university deadlines.

## Committed scope

- One user running the application locally.
- Pasted English text or a single UTF-8 `.txt` file, up to 20,000 decoded characters.
- A browser preview of the text accepted by the backend.
- AI-assisted identification of candidate functional requirements, candidate non-functional requirements, and ambiguous statements.
- Findings with source excerpts, explanations, and clarification questions.
- Clear feedback for invalid input, failed analysis, and an empty result.
- Human review of all AI suggestions.

The application is a review aid. Its output is not an approved specification, and it is not expected to detect every problem.

## Later scope

The following ideas from the original project vision are outside these two sprints:

- PDF and DOCX processing.
- Broader risk and constraint analysis.
- Conversational questions about the document.
- Saved analyses, conversation history, and persistent project decisions.
- SQLite storage and conversation memory.
- Accounts, team collaboration, deployment, and advanced document retrieval.

Detailed project diagrams are a separate follow-up. The functional requirements for the two committed increments are defined in [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md).

## Planned implementation

The browser provides a simple input, preview, and results interface. A FastAPI backend validates input, calls the Gemini API from the server, and checks the response structure and source excerpts before returning findings to the browser.

| Component | Responsibility | Sprint |
| --- | --- | --- |
| Simple HTML/browser interface | Input, preview, results, and user feedback | 1, extended in 2 |
| FastAPI backend | Input validation and application endpoints | 1, extended in 2 |
| UTF-8 TXT reader | Decode and validate uploaded text | 1 |
| Gemini integration | Produce the first-pass analysis | 2 |
| Response validation | Check required fields and source grounding | 2 |

API credentials belong in server-side environment configuration and must not be committed or exposed in the browser. A database and conversation-memory component are not needed for these increments.

## Running the application

Verified installation and launch commands have not yet been established in the materials used for this plan. Sprint 1 includes repository setup and a reproducible local run guide. Add the actual prerequisites, dependency-installation command, launch command, and local URL once they have been checked against the implementation.

Sprint 2 also requires server-side Gemini access. Document the actual environment variable and selected model when the integration is implemented.

## Verification and demonstrations

Sprint 1 must demonstrate pasted text, TXT import, a successful preview, and rejected invalid input. Sprint 2 must demonstrate a real analysis request, a source-linked finding, and controlled failures.

Record expected versus actual outcomes and link them to the demonstrated commit. If a recorded response is used when the API is unavailable, label it as recorded; it does not demonstrate a successful live request.

A work item is Done when its acceptance criteria have been checked, its evidence is linked, and the integrated increment can be demonstrated from the run guide. Writing a ticket or this README does not complete implementation.

## Project documents

- [Functional requirements and acceptance criteria](FUNCTIONAL_REQUIREMENTS.md)
