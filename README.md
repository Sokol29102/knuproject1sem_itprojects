# AI Requirements Analyzer

AI Requirements Analyzer is a web application that helps analyze software project requirements using a large language model.

The system allows users to upload a requirements document, automatically extract important information, and discuss the document through a conversational interface.

Problem:

Software requirements are often vague, incomplete, contradictory, or difficult to review manually.

Primary audience:

Business analysts, project managers, and software development teams who need to review early-stage software requirements.

Goal:

Help a user perform a first-pass analysis of a software requirements document and discuss detected problems with an AI assistant.

## Main Features

- Upload software requirements documents
- Extract text from documents
- Identify:
  - Functional requirements
  - Non-functional requirements
  - Risks
  - Constraints
  - Ambiguous or unclear requirements
- Ask questions about the uploaded document
- Suggest clearer requirement formulations
- Store conversation history
- Maintain conversation context and important project decisions

## Example

A requirement such as:

> The system should respond quickly.

can be detected as ambiguous because it does not define a measurable response time.

The assistant can suggest a clearer version:

> The system shall return search results within 2 seconds.

## Planned Architecture

```text
User
  |
  v
Web Interface
  |
  v
FastAPI Backend
  |
  +----> Document Processing
  |
  +----> Gemini API
  |
  +----> Conversation Memory
  |
  v
SQLite Database
