import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app


class AccountProjectTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / 'accounts.sqlite3')
        self.env = patch.dict(os.environ, {'APP_DATABASE': self.path})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.alice = TestClient(app)
        self.bob = TestClient(app)

    def register(self, client, username):
        response = client.post('/api/auth/register', json={'username': username, 'password': 'correct horse battery'})
        self.assertEqual(response.status_code, 201, response.text)
        return response

    def test_registration_login_cookie_logout_and_no_plaintext_secrets(self):
        response = self.register(self.alice, 'Alice')
        self.assertIn('httponly', response.headers['set-cookie'].lower())
        self.assertIn('samesite=strict', response.headers['set-cookie'].lower())
        self.assertEqual(self.alice.get('/api/auth/me').json()['username'], 'Alice')
        self.assertEqual(self.alice.post('/api/auth/logout').status_code, 200)
        self.assertEqual(self.alice.get('/api/auth/me').status_code, 401)
        self.assertEqual(self.alice.post('/api/auth/login', json={'username': 'alice', 'password': 'wrong password'}).status_code, 401)
        self.assertEqual(self.alice.post('/api/auth/login', json={'username': 'ALICE', 'password': 'correct horse battery'}).status_code, 200)
        with sqlite3.connect(self.path) as db:
            value = db.execute('SELECT password_hash FROM users').fetchone()[0]
            self.assertNotIn('correct horse battery', value)
        db.close()

    def test_projects_and_boards_are_owned_and_persist_across_sessions(self):
        self.register(self.alice, 'Alice')
        self.register(self.bob, 'Bob')
        created = self.alice.post('/api/projects', json={'name': 'My project', 'description': 'Requirements'})
        self.assertEqual(created.status_code, 201, created.text)
        project = created.json()
        url = f"/api/projects/{project['id']}"
        self.assertEqual(self.bob.get('/api/projects').json(), [])
        self.assertEqual(self.bob.get(url).status_code, 404)
        self.assertEqual(self.bob.put(url + '/board', json={'version': 1, 'cards': [], 'revision': 0}).status_code, 404)
        card = {'id': 'note-1', 'type': 'note', 'title': 'Saved', 'body': '<literal text>', 'x': -500, 'y': 300, 'pinned': True}
        saved = self.alice.put(url + '/board', json={'version': 1, 'cards': [card], 'revision': 0})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.assertEqual(self.alice.put(url + '/board', json={'version': 1, 'cards': [], 'revision': 0}).status_code, 409)
        self.alice.post('/api/auth/logout')
        self.alice.post('/api/auth/login', json={'username': 'alice', 'password': 'correct horse battery'})
        restored = self.alice.get(url).json()
        self.assertEqual(restored['board']['cards'][0]['body'], '<literal text>')
        self.assertEqual(restored['revision'], 1)
        self.assertEqual(len(self.alice.get('/api/projects').json()), 1)

    def test_authentication_and_same_origin_are_required(self):
        self.assertEqual(self.alice.get('/api/projects').status_code, 401)
        self.assertEqual(self.alice.post('/api/chat', json={'message': 'hello'}).status_code, 401)
        self.assertEqual(self.alice.post('/api/auth/register', json={'username': 'alice', 'password': 'correct horse battery'}, headers={'origin': 'https://evil.example'}).status_code, 403)
        self.assertEqual(self.alice.post('/api/auth/register', json={'username': 'alice', 'password': 'short'}).status_code, 422)
        self.register(self.alice, 'Alice')
        self.assertEqual(self.bob.post('/api/auth/register', json={'username': 'alice', 'password': 'correct horse battery'}).status_code, 409)

    def test_bad_board_cannot_overwrite_saved_board(self):
        self.register(self.alice, 'Alice')
        project = self.alice.post('/api/projects', json={'name': 'One', 'description': ''}).json()
        url = f"/api/projects/{project['id']}/board"
        bad = {'id': 'x', 'type': 'image', 'title': 'x', 'body': '', 'x': 0, 'y': 0, 'src': 'https://external.example/image.png'}
        response = self.alice.put(url, json={'version': 1, 'cards': [bad], 'revision': 0})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.alice.get(url.removesuffix('/board')).json()['board']['cards'], [])

    def test_expired_sessions_and_auth_throttling(self):
        self.register(self.alice, 'Alice')
        with sqlite3.connect(self.path) as db:
            db.execute('UPDATE sessions SET expires=0')
            db.executemany('INSERT INTO auth_attempts VALUES (?,?)', [('testclient', __import__('time').time())] * 20)
        db.close()
        self.assertEqual(self.alice.get('/api/projects').status_code, 401)
        self.assertEqual(self.alice.post('/api/auth/login', json={'username': 'alice', 'password': 'correct horse battery'}).status_code, 429)

    def test_embedded_images_can_save_above_input_preview_request_limit(self):
        self.register(self.alice, 'Alice')
        project = self.alice.post('/api/projects', json={'name': 'Images'}).json()
        cards = [{'id': str(i), 'type': 'image', 'title': 'image', 'body': '', 'x': i*100, 'y': 0,
                  'width': 260, 'height': 260, 'src': 'data:image/png;base64,' + 'A'*600000} for i in range(2)]
        response = self.alice.put(f"/api/projects/{project['id']}/board", json={'version': 1, 'revision': 0, 'cards': cards})
        self.assertEqual(response.status_code, 200, response.text)


if __name__ == '__main__':
    unittest.main()
