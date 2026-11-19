"""Release checks against a real, disposable server and SQLite database."""
from contextlib import closing
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII='
PASSWORD = 'release-test-password'


def objects():
    base = dict(title='Literal <text>', body='Keep exactly\nSecond line', x=-800, y=1200,
                width=260, height=260, pinned=False)
    return [dict(base, id='note', type='note'), dict(base, id='req', type='requirement', pinned=True),
            dict(base, id='decision', type='decision'), dict(base, id='file', type='file'),
            dict(base, id='shape', type='shape', shape='ellipse', color='#386b56', fill='none', strokeWidth=4),
            dict(base, id='drawing', type='drawing', color='#386b56', strokeWidth=4, points=[[0, 0], [20, 30]]),
            dict(base, id='image', type='image', src=PNG)]


class ReleaseAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'release.sqlite3'
        self.process = None
        self.addCleanup(self.stop)
        self.start(self.path)
        status, _, headers = self.call('/api/auth/register', {'username': 'release', 'password': PASSWORD})
        self.assertEqual(status, 201)
        self.cookie = headers['Set-Cookie'].split(';')[0]
        status, self.project, _ = self.call('/api/projects', {'name': 'Release sample', 'description': 'Synthetic data'}, cookie=self.cookie)
        self.assertEqual(status, 201)
        self.project_url = '/api/projects/' + self.project['id']

    def start(self, database):
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            port = listener.getsockname()[1]
        self.base = f'http://127.0.0.1:{port}'
        env = {**os.environ, 'APP_DATABASE': str(database), 'GEMINI_API_KEY': '', 'PYTHONIOENCODING': 'utf-8'}
        self.process = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1',
                                         '--port', str(port)], cwd=ROOT, env=env,
                                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                self.fail(f'Disposable server exited with {self.process.returncode}')
            try:
                if self.call('/health')[0] == 200:
                    return
            except (URLError, OSError):
                time.sleep(.05)
        self.fail('Disposable server did not become ready within 15 seconds')

    def stop(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=8)

    def call(self, path, payload=None, *, cookie=None, method=None):
        headers = {'Content-Type': 'application/json'}
        if cookie:
            headers['Cookie'] = cookie
        request = Request(self.base + path, data=None if payload is None else json.dumps(payload).encode(),
                          headers=headers, method=method or ('POST' if payload is not None else 'GET'))
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            return response.status, json.loads(response.read()), response.headers

    def save(self, cards, revision=0):
        return self.call(self.project_url + '/board', {'version': 1, 'revision': revision, 'cards': cards},
                         method='PUT', cookie=self.cookie)

    def test_restart_retains_every_object_type_and_owner_access(self):
        cards = objects()
        self.assertEqual(self.save(cards)[0], 200)
        self.stop()
        self.start(self.path)
        status, _, headers = self.call('/api/auth/login', {'username': 'release', 'password': PASSWORD})
        self.assertEqual(status, 200)
        self.cookie = headers['Set-Cookie'].split(';')[0]
        status, restored, _ = self.call(self.project_url, cookie=self.cookie)
        self.assertEqual(status, 200)
        self.assertEqual(restored['id'], self.project['id'])
        self.assertEqual(restored['board']['cards'], cards)
        self.assertEqual(restored['revision'], 1)
        self.assertEqual(self.call(self.project_url)[0], 401)

    def test_stopped_database_backup_restores_accounts_and_exact_board(self):
        cards = objects()
        self.assertEqual(self.save(cards)[0], 200)
        self.stop()
        backup = Path(self.temp.name) / 'backup.sqlite3'
        with closing(sqlite3.connect(self.path)) as source, closing(sqlite3.connect(backup)) as destination:
            source.backup(destination)
        restored_path = Path(self.temp.name) / 'restored.sqlite3'
        shutil.copy2(backup, restored_path)
        self.start(restored_path)
        status, _, headers = self.call('/api/auth/login', {'username': 'release', 'password': PASSWORD})
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie'].split(';')[0]
        status, project, _ = self.call(self.project_url, cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(project['board']['cards'], cards)
        self.assertEqual(project['revision'], 1)
        with closing(sqlite3.connect(self.path)) as original:
            self.assertEqual(original.execute('SELECT revision FROM projects').fetchone()[0], 1)

    def test_simultaneous_saves_accept_one_writer_and_preserve_its_complete_board(self):
        barrier = threading.Barrier(2)
        def writer(label):
            cards = [dict(objects()[0], body=label)]
            barrier.wait(timeout=5)
            return label, self.save(cards)[0]
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(writer, ['first writer', 'second writer']))
        self.assertEqual(sorted(status for _, status in results), [200, 409])
        winner = next(label for label, status in results if status == 200)
        status, saved, _ = self.call(self.project_url, cookie=self.cookie)
        self.assertEqual(status, 200)
        self.assertEqual(saved['revision'], 1)
        self.assertEqual(saved['board']['cards'], [dict(objects()[0], body=winner)])

    def test_invalid_boards_never_replace_the_last_saved_revision(self):
        cards = objects()
        self.assertEqual(self.save(cards)[0], 200)
        cases = [cards + [cards[0]], [dict(cards[0], width=23)], [dict(cards[0], x='invalid')],
                 [dict(cards[0], title='x' * 121)], [dict(cards[0], body='x' * 12001)],
                 [dict(cards[5], points=[[0, 0], [999, 0]])],
                 [dict(cards[6], src='https://example.com/image.png')],
                 [dict(cards[0], id=f'n{i}') for i in range(101)]]
        for candidate in cases:
            with self.subTest(candidate_type=candidate[0]['type']):
                self.assertEqual(self.save(candidate, revision=1)[0], 422)
                _, saved, _ = self.call(self.project_url, cookie=self.cookie)
                self.assertEqual(saved['revision'], 1)
                self.assertEqual(saved['board']['cards'], cards)

    def test_missing_gemini_key_does_not_disable_project_or_board_operations(self):
        self.assertEqual(self.call('/health')[0], 200)
        self.assertFalse(self.call('/api/ai/status')[1]['configured'])
        self.assertEqual(self.save(objects())[0], 200)
        status, reply, _ = self.call('/api/chat', {'message': 'Hello', 'project_id': self.project['id']}, cookie=self.cookie)
        self.assertEqual(status, 503)
        self.assertIn('not configured', reply['detail'])
        self.assertNotIn('reply', reply)
        self.assertEqual(self.call(self.project_url, cookie=self.cookie)[1]['board']['cards'], objects())


if __name__ == '__main__':
    unittest.main()
