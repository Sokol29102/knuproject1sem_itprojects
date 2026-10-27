import unittest

from fastapi.testclient import TestClient
from main import app


class PreviewAcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_paste_normalizes_bom_and_newlines_without_trimming_wording(self):
        response = self.client.post('/api/preview', json={'text': '\ufeff  First\r\nSecond\rThird  '})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], '  First\nSecond\nThird  ')
        self.assertEqual(response.json()['characters'], 22)
        self.assertEqual(response.json()['lines'], 3)

    def test_unicode_limit_counts_code_points_instead_of_utf16_units(self):
        response = self.client.post('/api/preview', json={'text': '😀' * 20000})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['characters'], 20000)
        response = self.client.post('/api/preview', json={'text': '😀' * 20001})
        self.assertEqual(response.status_code, 400)

    def test_blank_input_is_rejected_and_next_valid_submission_succeeds(self):
        for text in ['', ' \r\n\t', '\ufeff']:
            with self.subTest(text=text):
                response = self.client.post('/api/preview', json={'text': text})
                self.assertEqual(response.status_code, 400)
                self.assertIsInstance(response.json()['detail'], str)
        self.assertEqual(self.client.post('/api/preview', json={'text': 'Valid.'}).status_code, 200)

    def test_txt_upload_uses_strict_utf8_case_insensitive_extension_and_bom_removal(self):
        response = self.client.post('/api/upload', files={'file': ('requirements.TXT', b'\xef\xbb\xbfFirst\r\nSecond', 'text/plain')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'First\nSecond')
        self.assertEqual(response.json()['source'], 'requirements.TXT')

    def test_invalid_encoding_and_non_txt_are_rejected(self):
        for name, content in [('bad.txt', b'\xff\xfe\x00'), ('notes.pdf', b'valid text'), ('notes', b'valid text')]:
            with self.subTest(name=name):
                response = self.client.post('/api/upload', files={'file': (name, content)})
                self.assertEqual(response.status_code, 400)
                self.assertIsInstance(response.json()['detail'], str)

    def test_upload_and_paste_remove_only_one_leading_bom(self):
        original = '\ufeff\ufeffHello'
        pasted = self.client.post('/api/preview', json={'text': original})
        uploaded = self.client.post('/api/upload', files={'file': ('bom.txt', original.encode('utf-8'))})
        for response in [pasted, uploaded]:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['text'], '\ufeffHello')
            self.assertEqual(response.json()['characters'], 6)

    def test_upload_limit_is_applied_after_normalizing_newlines(self):
        response = self.client.post('/api/upload', files={'file': ('ok.txt', b'x\r\n' * 10000)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['characters'], 20000)
        response = self.client.post('/api/upload', files={'file': ('long.txt', b'x' * 20001)})
        self.assertEqual(response.status_code, 400)

    def test_html_like_input_is_returned_as_data_without_altering_the_content(self):
        text = '<script>alert("sample")</script>\n<img src=x onerror=alert(1)>'
        response = self.client.post('/api/preview', json={'text': text})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], text)
        self.assertIn('application/json', response.headers['content-type'])

    def test_malformed_missing_and_wrong_type_input_produce_readable_errors(self):
        requests = [
            lambda: self.client.post('/api/preview', content='{', headers={'content-type': 'application/json'}),
            lambda: self.client.post('/api/preview', json={}),
            lambda: self.client.post('/api/preview', json={'text': 123}),
            lambda: self.client.post('/api/upload'),
        ]
        for request in requests:
            with self.subTest(request=request):
                response = request()
                self.assertEqual(response.status_code, 422)
                self.assertIsInstance(response.json()['detail'], str)

    def test_body_size_guard_rejects_large_payload_before_parsing(self):
        response = self.client.post('/api/preview', content=b'x' * 1100000, headers={'content-type': 'application/json'})
        self.assertEqual(response.status_code, 413)
        self.assertIsInstance(response.json()['detail'], str)

    def test_health_and_browser_entrypoint(self):
        self.assertEqual(self.client.get('/health').json(), {'status': 'ok', 'sprint': 1})
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/html', response.headers['content-type'])

    def test_product_demo_is_available_separately_from_the_working_input_prototype(self):
        response = self.client.get('/demo')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/html', response.headers['content-type'])
        self.assertIn('Simulated', response.text)
        self.assertEqual(self.client.get('/').status_code, 200)

    def test_home_opens_project_chooser_and_input_prototype_has_its_own_route(self):
        home = self.client.get('/')
        self.assertEqual(home.status_code, 200)
        self.assertIn('/static/projects.js', home.text)
        prototype = self.client.get('/prototype')
        self.assertEqual(prototype.status_code, 200)
        self.assertIn('Requirements text', prototype.text)


if __name__ == '__main__':
    unittest.main()
