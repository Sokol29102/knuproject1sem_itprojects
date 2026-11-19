import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from main import load_settings


class SettingsTests(unittest.TestCase):
    def test_local_settings_survive_a_fresh_shell_and_explicit_environment_wins(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'.env'
            path.write_text('GEMINI_API_KEY=local-test-key\nGEMINI_MODEL=gemini-3.5-flash-lite\n',encoding='utf-8')
            with patch.dict(os.environ,{},clear=True):
                load_settings(path)
                self.assertEqual(os.environ['GEMINI_API_KEY'],'local-test-key')
                self.assertEqual(os.environ['GEMINI_MODEL'],'gemini-3.5-flash-lite')
            with patch.dict(os.environ,{'GEMINI_API_KEY':'explicit-test-key'},clear=True):
                load_settings(path)
                self.assertEqual(os.environ['GEMINI_API_KEY'],'explicit-test-key')
