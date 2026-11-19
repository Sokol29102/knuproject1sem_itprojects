"""A timed-out test must not leave its owned child processes running."""
import csv
import io
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from testing.run_tests import run_phase


class TestRunnerTests(unittest.TestCase):
    def test_timeout_preserves_output_and_stops_the_owned_process_tree(self):
        with tempfile.TemporaryDirectory() as folder:
            child_pid = Path(folder) / 'child.pid'
            child_code = "import os,time;from pathlib import Path;Path(" + repr(str(child_pid)) + ").write_text(str(os.getpid()));time.sleep(30)"
            parent_code = "import subprocess,sys,time;subprocess.Popen([sys.executable,'-c'," + repr(child_code) + "]);print('started',flush=True);time.sleep(30)"
            output, status = run_phase([sys.executable, '-c', parent_code], os.environ.copy(), timeout=2)
            self.assertNotEqual(status, 0)
            self.assertIn('started', output)
            self.assertIn('timeout', output.lower())
            self.assertTrue(child_pid.exists(), 'Child must start so this checks process-tree cleanup')
            identifier = int(child_pid.read_text())
            if os.name == 'nt':
                processes = subprocess.check_output(['tasklist', '/FI', f'PID eq {identifier}', '/FO', 'CSV', '/NH'], text=True)
                self.assertFalse(any(len(row) > 1 and row[1] == str(identifier) for row in csv.reader(io.StringIO(processes))))
            else:
                try:
                    os.kill(identifier, 0)
                except ProcessLookupError:
                    pass
                else:
                    self.fail('Timed-out child is still running')


if __name__ == '__main__':
    unittest.main()
