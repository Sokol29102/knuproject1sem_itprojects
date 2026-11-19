"""Source-linked analysis (SCRUM-46/47): the provider call (main.urlopen) is controlled,
so these tests send no requests to Google. A live call is a manual check."""
import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from fastapi.testclient import TestClient
from main import app

SAMPLE = 'Library\n\n1. A student shall be able to search books by title.\n2. The system should respond quickly.'


def upstream(findings, finish='STOP'):
    return io.BytesIO(json.dumps({'candidates': [{'finishReason': finish, 'content': {
        'parts': [{'text': json.dumps({'findings': findings})}]}}]}).encode())


class AnalysisTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.client = TestClient(app)
        env = patch.dict(os.environ, {'GEMINI_API_KEY': 'test-secret', 'GEMINI_MODEL': 'test-model', 'APP_DATABASE': self.temp.name + '/test.sqlite3'})
        env.start()
        self.addCleanup(env.stop)
        self.client.post('/api/auth/register', json={'username': 'reviewer', 'password': 'correct horse battery'})

    def analyze(self, findings=None, text=SAMPLE, **kwargs):
        with patch('main.urlopen', return_value=upstream(findings or []), **kwargs) as send:
            response = self.client.post('/api/analyze', json={'text': text})
        return response, send

    def test_findings_are_linked_to_exact_source_lines(self):
        response, send = self.analyze([
            {'category': 'functional', 'excerpt': 'A student shall be able to search books by title.', 'explanation': 'Search capability.', 'question': 'Which fields?'},
            {'category': 'ambiguous', 'excerpt': ' The system should respond quickly. ', 'explanation': '"Quickly" is not measurable.', 'question': 'What response time, under what load?'},
        ])
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual((body['mode'], body['model']), ('live', 'test-model'))
        self.assertEqual([f['category'] for f in body['findings']], ['functional', 'ambiguous'])
        self.assertEqual(body['findings'][1]['excerpt'], 'The system should respond quickly.')
        self.assertEqual(body['findings'][1]['line'], 4)
        self.assertEqual(SAMPLE[body['findings'][1]['start']:].split('\n')[0], 'The system should respond quickly.')
        self.assertEqual(body['unsupported'], [])
        self.assertIn('review', body['notice'])
        request = send.call_args.args[0]
        self.assertEqual(request.get_header('X-goog-api-key'), 'test-secret')
        self.assertNotIn('test-secret', request.full_url + response.text)
        sent = json.loads(request.data)
        self.assertIn('respond quickly', sent['contents'][0]['parts'][0]['text'])
        self.assertEqual(sent['generationConfig']['responseJsonSchema']['properties']['findings']['items']['properties']['category']['enum'], ['functional', 'non-functional', 'ambiguous'])

    def test_invented_or_incomplete_findings_are_flagged_not_shown(self):
        response, _ = self.analyze([
            {'category': 'ambiguous', 'excerpt': 'The system shall answer within 2 seconds.', 'explanation': 'x', 'question': 'y'},
            {'category': 'risk', 'excerpt': 'The system should respond quickly.', 'explanation': 'x', 'question': 'y'},
            {'category': 'functional', 'excerpt': '', 'explanation': 'x', 'question': 'y'},
            'not an object',
        ])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['findings'], [])
        reasons = [entry['reason'] for entry in response.json()['unsupported']]
        self.assertEqual(len(reasons), 4)
        self.assertIn('does not appear exactly', reasons[0])
        self.assertIn('Unknown category', reasons[1])

    def test_no_findings_and_finding_cap(self):
        response, _ = self.analyze([])
        self.assertEqual((response.status_code, response.json()['findings']), (200, []))
        many = [{'category': 'functional', 'excerpt': 'Library', 'explanation': 'x', 'question': 'y'}] * 50
        response, _ = self.analyze(many)
        self.assertEqual(len(response.json()['findings']), 20)

    def test_sign_in_is_required_before_spending_quota(self):
        self.client.post('/api/auth/logout')
        response, send = self.analyze([])
        self.assertEqual(response.status_code, 401)
        send.assert_not_called()

    def test_invalid_input_cross_origin_and_missing_key_do_not_call_google(self):
        for text in ['   ', 'x' * 20001]:
            with self.subTest(length=len(text)):
                response, send = self.analyze([], text=text)
                self.assertEqual(response.status_code, 400)
                send.assert_not_called()
        with patch('main.urlopen') as send:
            response = self.client.post('/api/analyze', json={'text': SAMPLE}, headers={'origin': 'https://other.example'})
        self.assertEqual(response.status_code, 403)
        send.assert_not_called()
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            response, send = self.analyze([])
        self.assertEqual(response.status_code, 503)
        send.assert_not_called()

    def test_provider_failures_reuse_the_dialogue_error_handling(self):
        for error, status in [(HTTPError('https://x', 429, 'test-secret', {}, None), 429),
                              (HTTPError('https://x', 503, 'test-secret', {}, None), 502),
                              (TimeoutError(), 504), (URLError('offline'), 502)]:
            with self.subTest(error=repr(error)), patch('main.urlopen', side_effect=error):
                response = self.client.post('/api/analyze', json={'text': SAMPLE})
                self.assertEqual(response.status_code, status)
                self.assertNotIn('test-secret', response.text)

    def test_malformed_blocked_or_truncated_output_is_rejected(self):
        for data in [{}, {'candidates': []},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': 'not json'}]}}]},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': '{"findings": "x"}'}]}}]},
                     {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': '[1, 2]'}]}}]},
                     {'candidates': [{'finishReason': 'MAX_TOKENS', 'content': {'parts': [{'text': '{"findings": []}'}]}}]},
                     {'candidates': [{'finishReason': 'SAFETY', 'content': {'parts': []}}]}]:
            with self.subTest(data=data), patch('main.urlopen', return_value=io.BytesIO(json.dumps(data).encode())):
                self.assertEqual(self.client.post('/api/analyze', json={'text': SAMPLE}).status_code, 502)

    def test_prototype_offers_labelled_analysis(self):
        page = self.client.get('/prototype').text
        self.assertIn('id="analyze"', page)
        self.assertIn('human review required', page)
        script = self.client.get('/static/app.js').text
        self.assertIn("'/api/analyze'", script)
        self.assertNotIn('innerHTML = result', script)


if __name__ == '__main__':
    unittest.main()
