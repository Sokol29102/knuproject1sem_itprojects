# AI Requirements Analyzer — first two sprints

Prepared 24 October 2026. This is a replacement planning baseline, not evidence that the application has been implemented. Dates and capacity are planning assumptions: one student developer, 11 committed hours plus 2 contingency hours each week. Course deadlines were not supplied.

## Product definition

**Primary audience:** university software-project teams and junior business analysts reviewing short English requirements documents. The first audience is deliberately narrow; validate it with one peer or supervisor during Sprint 1. Experienced business analysts and project managers are secondary audiences, not an enterprise MVP commitment.

**Problem:** inexperienced reviewers struggle to spot vague statements and turn them into specific clarification questions before coding begins.

**Value:** provide a first-pass review that connects each finding to an exact source excerpt, explains the concern and suggests a clarification question. The user decides what to change.

**Success scenario:** a reviewer submits a small requirements sample, sees a concern such as “respond quickly,” locates its source and can ask what response-time target is actually needed. The app must not invent that target as an approved requirement.

## Scope and progression

Sprint 1: a running browser-to-backend input and preview flow, plus the project management artefacts required for Task 1.
Sprint 2: extend that same application with real Gemini analysis and a readable findings view, then demonstrate actual deliverables and a retrospective.

Support pasted English text and UTF-8 TXT input, capped at 20,000 characters. One local user; no deployment requirement in these two sprints. Start with ambiguity and candidate functional/non-functional classification; broader risk/constraint analysis can follow.

Later scope: PDF/DOCX parsing, conversational questions, saved history, SQLite persistence, project decisions and context memory. Accounts, collaboration, advanced retrieval and automatic approval are excluded from these two sprints.

The functional requirements for these increments are now defined in [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md). The capability map below summarizes their supporting enablers. Project diagrams remain deferred for a later discussion; if the instructor requires diagrams in Task 1, resolve that before presentation.

## Capability-to-enabler map (provisional)

| User capability | Technical enabler | Delivery |
| --- | --- | --- |
| Provide and inspect requirements text | Simple HTML input, TXT decoding, FastAPI validation, text preview | Sprint 1 |
| Request first-pass AI review | Server-side Gemini configuration, bounded request, analysis prompt | Sprint 2 |
| Inspect meaningful findings against source | Structured response schema, exact-excerpt checks, finding cards | Sprint 2 |
| Understand a failed request | Input validation, timeout/API handling, loading/error/empty states | Both |
| Ask questions and reopen history | Conversation context and SQLite persistence | Later |

An enabler is implementation work supporting a user outcome; it is not itself a functional requirement. No need for a separate frontend framework or database to demonstrate the first two increments.

## Sprint 1 — work schedule 26–30 October 2026

Jira records the actual sprint start on 24 October 2026. The task schedule below retains the planned work dates and the 30 October deadline.

**Goal:** demonstrate a focused plan and a working text-input prototype.
**Prototype:** browser input -> FastAPI validation -> visible accepted-text preview.
**Task 1 evidence:** Jira hierarchy and all subtasks; estimates and dates; repository and wiki/README links; textual blueprint; Gantt schedule; rehearsed planning meeting.
**Load:** 11 hours plus 2 hours contingency. 6 provisional story points at parent level only.
**Demo:** paste sample text, import a TXT file, show clear rejection of empty/invalid input, then explain the plan and dependencies.

## Sprint 2 — 2–6 November 2026

**Goal:** review the same input with AI and demonstrate source-linked findings and observed results.
**Prototype:** existing input -> Gemini -> validated findings -> browser result cards.
**Task 2 evidence:** running increment, demonstrated commit, run instructions, sample-case results, screenshots, planned-versus-actual table and retrospective notes.
**Load:** 11 hours plus 2 hours contingency. 7 provisional story points at parent level only.
**Demo:** analyze a sample live, inspect an exact source excerpt and clarification question, show an error path, explain limitations, then emulate the retrospective. Any recorded fallback output must be labelled as recorded.

## Work breakdown and deadlines

| Jira | Work item | Estimate | Start | Deadline |
| --- | --- | --- | --- | --- |
| [SCRUM-42](https://knuprojectus.atlassian.net/browse/SCRUM-42) | Confirm audience, problem and MVP boundary | 2h | 2026-10-26 | 2026-10-26 |
| [SCRUM-43](https://knuprojectus.atlassian.net/browse/SCRUM-43) | Prepare tracker, wiki, repository and sprint plan | 2h | 2026-10-26 | 2026-10-27 |
| [SCRUM-44](https://knuprojectus.atlassian.net/browse/SCRUM-44) | Enter requirements and preview validated text in the browser | 5h | 2026-10-27 | 2026-10-29 |
| [SCRUM-45](https://knuprojectus.atlassian.net/browse/SCRUM-45) | Demonstrate Sprint 1 prototype and Task 1 planning artefacts | 2h | 2026-10-30 | 2026-10-30 |
| [SCRUM-46](https://knuprojectus.atlassian.net/browse/SCRUM-46) | Enable bounded Gemini analysis with validated output | 3h | 2026-11-02 | 2026-11-03 |
| [SCRUM-47](https://knuprojectus.atlassian.net/browse/SCRUM-47) | Analyze a sample and inspect source-linked findings | 4h | 2026-11-03 | 2026-11-05 |
| [SCRUM-48](https://knuprojectus.atlassian.net/browse/SCRUM-48) | Verify the integrated prototype against sample cases | 2h | 2026-11-05 | 2026-11-05 |
| [SCRUM-49](https://knuprojectus.atlassian.net/browse/SCRUM-49) | Demonstrate Task 2 deliverables and rehearse retrospective | 2h | 2026-11-06 | 2026-11-06 |

Each parent has two Jira subtasks. Their hours add to the parent estimate; never count both levels. Story points express relative uncertainty and are not hours. Owner role for this planning baseline is the student developer; Jira assignees remain unset until the actual team allocation is known.

## Gantt schedule

Working-day schedule; filled cells indicate planned activity, not full-day effort. Weekend 31 October–1 November is uncommitted.

| Work item | Oct 26 | 27 | 28 | 29 | 30 | Nov 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Audience and MVP boundary | ■ | | | | | | | | | |
| Tracker, wiki, repo and plan | ■ | ■ | | | | | | | | |
| Input prototype | | ■ | ■ | ■ | | | | | | |
| Task 1 demo | | | | | ◆ | | | | | |
| Gemini and output validation | | | | | | ■ | ■ | | | |
| Findings UI | | | | | | | ■ | ■ | ■ | |
| Integrated verification | | | | | | | | | ■ | |
| Task 2 demo and retrospective | | | | | | | | | | ◆ |

Dependencies: scope and environment precede input work; Sprint 1 runnable input precedes AI integration; validated AI output precedes completed findings UI; integrated checks precede the Task 2 demo. UI layout can begin with a labelled fixture while the service is being implemented.

## Textual project blueprint

A simple browser page collects requirements and displays preview/results. FastAPI validates text and TXT input, calls Gemini from the server and validates the returned findings before sending them to the page. Each displayed finding includes an exact source excerpt, concern explanation and clarification question. Gemini credentials stay in environment configuration. Persistence and conversation memory are later components.

Jira is the work tracker. Use the actual Git repository for source and demonstrable commits, with a wiki or repository README for run instructions, product brief and evidence. Repository setup remains a Sprint 1 task because no repository was verified in this planning request. Confluence lookup returned unavailable on this site, so the planning baseline is stored in Jira and this local document.

## Definition of Ready and Done

Ready: a small outcome, estimate, deadline, dependencies and testable acceptance criteria exist; required credentials or fallback demo arrangements are understood.

Done: relevant acceptance criteria have been checked; the integrated increment runs from the documented instructions; important invalid-input and service-failure paths have been checked; code/docs and evidence are linked; no known demo-blocking defect remains. A planned ticket is never marked Done merely because its description was written.

## Meetings and presentation scripts

**Planning rehearsal, 10 minutes:** state the weekly goal (1m), show selected tasks and subtasks (3m), explain estimates/capacity/dependencies (3m), discuss risks and what to cut (2m), state the demo and Done criteria (1m).

**Sprint review, 5–7 minutes:** state planned outcome, run the prototype, show expected versus actual evidence, identify unfinished work and explain what changed in the next increment.

**Retrospective rehearsal, 15 minutes:** inspect actual evidence (3m); identify one practice to keep, one mistake and one risk (5m); choose two concrete improvements (5m); give each an owner and due date (2m). Do not fabricate lessons before implementation. Suggested prompts: Was the slice small enough? Did AI output stay grounded? Did estimates include verification and preparation?

Planned-versus-actual template: deliverable | planned acceptance | observed result | evidence/commit | follow-up.
Improvement template: observed problem | change to try | owner | deadline | how to check improvement.

## Risks and scope control

- API/key/quota failure: check access at the start of Sprint 2; retain a clearly labelled recorded output for presentation, while recording whether live analysis succeeded.
- Invented findings: validate source excerpts and require human review; no claim of perfect detection or automatic approval.
- Unknown existing code or actual availability: verify in Sprint 1 and revise estimates using actual progress.
- Scope growth: cut polish first, then optional formats/history/chat. Preserve one end-to-end demo and review evidence every week.
- Diagram expectations: detailed functional requirements are now documented separately; discuss the remaining diagrams and resolve any instructor-required gap before the Task 1 presentation.

The first review should replace these assumptions with observed results; it should not expand either sprint just to match the README's longer-term feature list.
