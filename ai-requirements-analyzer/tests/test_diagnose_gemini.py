import io
import json
import os
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.error import HTTPError

from diagnose_gemini import diagnose


class DiagnosticTests(unittest.TestCase):
    def test_google_explanation_is_shown_and_credentials_are_redacted(self):
        key = 'private-diagnostic-key'
        body = {'error': {'status': 'INVALID_ARGUMENT', 'message': f'API key not valid: {key}',
                          'details': [{'reason': 'API_KEY_INVALID'}]}}
        error = HTTPError('https://example', 400, '', {}, io.BytesIO(json.dumps(body).encode()))
        output = io.StringIO()
        with patch.dict(os.environ, {'GEMINI_API_KEY': key}), redirect_stdout(output), \
                patch('diagnose_gemini.urlopen', side_effect=error), patch('diagnose_gemini.chat') as generate:
            self.assertEqual(diagnose(), 1)
        self.assertIn('API_KEY_INVALID', output.getvalue())
        self.assertIn('API key not valid:', output.getvalue())
        self.assertNotIn(key, output.getvalue())
        generate.assert_not_called()

    def test_non_json_error_body_is_not_dumped(self):
        error = HTTPError('https://example', 503, '', {}, io.BytesIO(b'<html>sensitive proxy response</html>'))
        output = io.StringIO()
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'private-key'}), redirect_stdout(output), \
                patch('diagnose_gemini.urlopen', side_effect=error):
            self.assertEqual(diagnose(), 1)
        self.assertIn('HTTP 503', output.getvalue())
        self.assertNotIn('sensitive', output.getvalue())


if __name__ == '__main__':
    unittest.main()
