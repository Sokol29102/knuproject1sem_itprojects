# Project testing

This folder explains how the current requirements are checked and contains repeatable run results. Executable test cases live in `../tests/`. Current release scope is defined in `../docs/V1_SCOPE.md`; the older Sprint 1/2 requirements in `../docs/FUNCTIONAL_REQUIREMENTS.md` are reviewed separately in [REQUIREMENTS.md](REQUIREMENTS.md).

See [RESULTS.md](RESULTS.md) for the recorded outcome and its limits.

## Run all automated checks

From the main application folder in PowerShell:

```powershell
.\.venv\Scripts\python.exe testing\run_tests.py
```

Use Python 3.12 and Node.js 24, the versions used for the recorded run. Install Python development dependencies with `.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt` if this is a fresh environment. Node supplies its own test runner; no npm installation is needed. Node is required for testing, not for running the app.

The runner works from another current directory when invoked using its full path. It runs both suites even if one fails, exits with a nonzero status on failure, and writes:

- `results/summary.json`: exit codes, test counts, durations, tool versions and SHA-256 hashes of the checked application, tests and scope files.
- `results/backend.log`: Python API and real-server acceptance checks.
- `results/board-and-theme.log`: JavaScript board, editing, AI-action and theme checks.

Results describe the source hashes in the report. Rerun after changing code; the current workspace has no Git metadata, so the report does not invent a release commit or tag. The next full run replaces the three current result files. `initial-backup-cleanup-failure.log` preserves the initial failed test run and is not a CI run.

## What runs

- Backend/API tests: text/TXT boundaries, authentication, account ownership, persistence, request validation, Gemini context/action contracts and controlled provider failures.
- Real-server acceptance tests: isolated Uvicorn processes on dynamically allocated loopback ports, server restart, SQLite backup/restoration, simultaneous revision-conflicting saves, invalid-board preservation and operation without a Gemini key.
- JavaScript tests: import/export validation, drawing/image data, selection geometry, group movement, copy/paste, history, cursor-centered zoom, open-ended coordinates, atomic Gemini actions and theme persistence.

Tests use synthetic accounts and disposable databases. They do not access the user's project database or stop an existing app. The real-server checks explicitly disable Gemini. Provider transport tests use controlled responses, so the default run sends no requests to Google and requires no API key.

Each phase has a five-minute timeout. Timeout or keyboard interruption stops that phase's owned process tree, including temporary servers; partial timeout output is retained in the phase log. A regression test exercises this cleanup with a real parent and child process.

## Additional acceptance work

[MANUAL_CHECKS.md](MANUAL_CHECKS.md) covers browser wiring, keyboard and pointer interactions, visual appearance, live model quality and clean-machine startup. Those checks are distinct from passing API/model tests. A live response, a browser screenshot, an offline suite and a successful CI build establish different facts.

Optional live diagnostic, run separately from the offline suite:

```powershell
.\.venv\Scripts\python.exe diagnose_gemini.py
```

It loads the configured server key or prompts with hidden input and makes a small real Google request. It can consume quota. Keep the key out of saved reports. This checks connectivity and structured response handling; it does not replace the browser board-action acceptance scenario.
