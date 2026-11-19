"""Run from the startup terminal to test its key without displaying or saving it."""
import getpass
import json
import os
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen

from fastapi import HTTPException, Request
from main import ChatInput, chat, gemini_model


def diagnose():
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        if '--no-prompt' in sys.argv or not sys.stdin.isatty():
            print('No key in this terminal. Run in the terminal used to start port 8001.')
            return 2
        key = getpass.getpass('Gemini API key (hidden; not saved): ').strip()
        if not key:
            print('No key supplied.')
            return 2
        os.environ['GEMINI_API_KEY'] = key
    model = gemini_model()
    print(f'Testing model: {model}', flush=True)
    request = URLRequest('https://generativelanguage.googleapis.com/v1beta/models',
                         headers={'x-goog-api-key': key})
    try:
        with urlopen(request, timeout=15) as response:
            data = json.load(response)
        models = data.get('models', [])
        match = next((m for m in models if m.get('name') == f'models/{model}'), None)
        print('Key authentication: OK', flush=True)
        if match:
            print('Configured model is available to this key.', flush=True)
        elif data.get('nextPageToken'):
            print('Configured model not on first models page; generation will verify access.', flush=True)
        else:
            print('Configured model is not listed for this key.', flush=True)
        alternatives = [m['name'].removeprefix('models/') for m in models
                        if 'flash' in m.get('name', '') and 'generateContent' in m.get('supportedGenerationMethods', [])]
        print('Available Flash models:', ', '.join(alternatives) or '(none on first page)', flush=True)
    except HTTPError as error:
        print(f'Model listing failed: Google HTTP {error.code}. Check key restrictions, API access and project settings.')
        try:
            detail = json.loads(error.read(8192)).get('error', {})
            message = str(detail.get('message', '')).replace(key, '[redacted]')
            message = re.sub(r'AIza[A-Za-z0-9_-]+', '[redacted]', message)
            reasons = [str(item.get('reason', '')) for item in detail.get('details', []) if isinstance(item, dict)]
            safe_codes = [code for code in [detail.get('status', ''), *reasons] if isinstance(code, str) and re.fullmatch(r'[A-Z_]{1,80}', code)]
            if safe_codes:
                print('Google status:', ', '.join(safe_codes))
            if message:
                print('Google explanation:', message[:1000])
        except (ValueError, TypeError, AttributeError):
            pass
        return 1
    except (URLError, TimeoutError):
        print('Model listing failed: network connection or timeout.')
        return 1
    except (ValueError, TypeError, KeyError):
        print('Model listing returned an invalid response.')
        return 1
    print('Testing the exact app request format with an empty board...', flush=True)
    started = time.monotonic()
    request = Request({'type': 'http', 'scheme': 'http', 'server': ('127.0.0.1', 8001),
                       'path': '/api/chat', 'query_string': b'', 'headers': []})
    try:
        answer = chat(ChatInput(message='Say hello in one short sentence.'), request)
        print(f'Generation: OK ({time.monotonic() - started:.1f}s)')
        print('Reply:', answer['reply'])
        return 0
    except HTTPException as error:
        print(f'Generation failed after {time.monotonic() - started:.1f}s: {error.detail}')
        return 1


if __name__ == '__main__':
    raise SystemExit(diagnose())
