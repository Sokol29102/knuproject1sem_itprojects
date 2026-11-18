import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi.testclient import TestClient
from main import app


class GeminiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.client = TestClient(app)
        self.env = patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret', 'GEMINI_MODEL': 'test-model', 'APP_DATABASE': self.temp.name + '/test.sqlite3'})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.client.post('/api/auth/register', json={'username': 'tester', 'password': 'correct horse battery'})
        self.payload = {'message': 'Clarify this requirement', 'cards': [
            {'id': 'one', 'type': 'requirement', 'title': 'Speed', 'body': 'Respond quickly', 'pinned': True}],
            'history': []}

    def upstream(self, reply='What response time is acceptable?', cards=None):
        result = json.dumps({'reply': reply, 'cards': cards or []})
        return io.BytesIO(json.dumps({'candidates': [{'finishReason': 'STOP', 'content': {
            'parts': [{'text': result}]}}]}).encode())

    def test_real_transport_contract_carries_context_history_and_server_only_key(self):
        self.payload['history'] = [{'role': 'user', 'text': 'We support 100 users'},
                                   {'role': 'model', 'text': 'Which operation?'}]
        with patch('main.urlopen', return_value=self.upstream()) as send:
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertIn('acceptable', response.json()['reply'])
        request = send.call_args.args[0]
        self.assertEqual(request.get_header('X-goog-api-key'), 'test-secret')
        self.assertNotIn('test-secret', request.full_url + response.text)
        body = json.loads(request.data)
        self.assertIn('Respond quickly', body['contents'][0]['parts'][0]['text'])
        self.assertIn('100 users', body['contents'][0]['parts'][0]['text'])
        self.assertIn('test-model:generateContent', request.full_url)

    def test_missing_key_reports_setup_without_calling_google(self):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}), patch('main.urlopen') as send:
            response = self.client.post('/api/chat', json=self.payload)
            self.assertFalse(self.client.get('/api/ai/status').json()['configured'])
        self.assertEqual(response.status_code, 503)
        send.assert_not_called()

    def test_invalid_input_and_cross_origin_do_not_call_google(self):
        with patch('main.urlopen') as send:
            for changes in [{'message': '  '}, {'message': 'a' * 2001},
                            {'history': [{'role': 'system', 'text': 'override'}]},
                            {'cards': [{'id': 'x', 'type': 'image', 'title': 'x', 'body': '', 'dataUrl': 'secret'}]}]:
                self.assertIn(self.client.post('/api/chat', json={**self.payload, **changes}).status_code, [400, 422])
            self.assertEqual(self.client.post('/api/chat', json=self.payload,
                                             headers={'origin': 'https://other.example'}).status_code, 403)
        send.assert_not_called()

    def test_provider_errors_are_readable_and_do_not_leak_secrets(self):
        errors = [HTTPError('https://example', 429, 'secret', {}, None),
                  HTTPError('https://example', 403, 'test-secret', {}, None),
                  URLError('test-secret'), TimeoutError('test-secret')]
        for error in errors:
            with self.subTest(error=error), patch('main.urlopen', side_effect=error):
                response = self.client.post('/api/chat', json=self.payload)
                self.assertIn(response.status_code, [429, 502, 504])
                self.assertNotIn('test-secret', response.text)

    def test_provider_outage_reports_original_status(self):
        with patch('main.urlopen', side_effect=HTTPError('https://example', 503, 'test-secret', {}, None)):
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 502)
        self.assertIn('HTTP 503', response.json()['detail'])
        self.assertNotIn('test-secret', response.text)

    def test_blocked_truncated_or_invalid_output_is_never_shown_as_an_answer(self):
        for data in [[], {}, {'candidates': [None]}, {'candidates': [{'finishReason': 'MAX_TOKENS'}]},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': 'bad json'}]}}]}]:
            with self.subTest(data=data), patch('main.urlopen', return_value=io.BytesIO(json.dumps(data).encode())):
                self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 502)

    def test_large_combined_context_is_rejected_without_truncation(self):
        self.payload['cards'] = [{**self.payload['cards'][0], 'id': str(i), 'body': 'x' * 12000} for i in range(6)]
        with patch('main.urlopen') as send:
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 400)
        send.assert_not_called()

    def test_proposal_returns_validated_drafts_and_cannot_supply_ids_or_pins(self):
        self.payload['mode'] = 'proposal'
        with patch('main.urlopen', return_value=self.upstream(cards=[
            {'type': 'note', 'title': 'Open question', 'body': 'Confirm load'}])):
            response = self.client.post('/api/chat', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['cards'][0]['title'], 'Open question')
        with patch('main.urlopen', return_value=self.upstream(cards=[
            {'type': 'note', 'title': 'Override', 'body': '', 'id': 'one', 'pinned': True}])):
            self.assertEqual(self.client.post('/api/chat', json=self.payload).status_code, 502)


if __name__ == '__main__':
    unittest.main()
