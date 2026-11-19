"""Run offline checks from any directory and save logs plus source identity."""
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
RESULTS = Path(__file__).resolve().parent / 'results'


def run_phase(command, env, timeout=300):
    options = {'creationflags': subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == 'nt' else {'start_new_session': True}
    process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               text=True, encoding='utf-8', errors='replace', **options)
    try:
        output, _ = process.communicate(timeout=timeout)
        return output, process.returncode
    except (subprocess.TimeoutExpired, KeyboardInterrupt) as failure:
        if os.name == 'nt':
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], check=True, capture_output=True)
        else:
            os.killpg(process.pid, signal.SIGKILL)
        output, _ = process.communicate()
        if isinstance(failure, KeyboardInterrupt):
            raise
        return output + f'\nTest phase timeout after {timeout} seconds; the owned process tree was stopped.\n', 124


def main():
    RESULTS.mkdir(exist_ok=True)
    node = shutil.which('node')
    if not node:
        print('Node.js is required for the board/theme checks. Install it and run again.', file=sys.stderr)
        return 1
    env = {**os.environ, 'PYTHONIOENCODING': 'utf-8', 'GEMINI_API_KEY': ''}
    node_version = subprocess.check_output([node, '--version'], text=True).strip()
    sources = sorted([*ROOT.glob('*.py'), *ROOT.glob('requirements*.txt'), *ROOT.glob('static/*'),
                      *ROOT.glob('tests/*.py'), *ROOT.glob('tests/*.mjs'), Path(__file__),
                      ROOT / 'docs/V1_SCOPE.md', ROOT / 'docs/FUNCTIONAL_REQUIREMENTS.md'])
    manifest = {str(p.relative_to(ROOT)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sources if p.is_file()}
    phases = [('backend', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v']),
              ('board-and-theme', [node, '--test', '--test-reporter=tap', *map(str, sorted(ROOT.glob('tests/*.test.mjs')))])]
    report = {'started_utc': datetime.now(timezone.utc).isoformat(), 'python': platform.python_version(),
              'node': node_version, 'platform': platform.platform(), 'source_sha256': manifest,
              'live_google_requests': False, 'phases': []}
    for name, command in phases:
        print(f'Running {name} checks...', flush=True)
        started = time.monotonic()
        output, code = run_phase(command, env)
        (RESULTS / f'{name}.log').write_text(output, encoding='utf-8')
        count = re.search(r'Ran (\d+) tests?', output) if name == 'backend' else re.search(r'^# tests (\d+)', output, re.M)
        report['phases'].append({'name': name, 'exit_code': code, 'test_count': int(count[1]) if count else None,
                                 'seconds': round(time.monotonic() - started, 2), 'log': f'{name}.log'})
        print(f'{name}: {"PASS" if code == 0 else "FAIL"}; see testing/results/{name}.log', flush=True)
    report['passed'] = all(phase['exit_code'] == 0 for phase in report['phases'])
    report['finished_utc'] = datetime.now(timezone.utc).isoformat()
    (RESULTS / 'summary.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print('Report: testing/results/summary.json')
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
