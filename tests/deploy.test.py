"""Checks backup, idempotence and rollback before touching a real Caddy server."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'deploy/add-caddy-route.sh'
ORIGINAL = '''{\n email {$ACME_EMAIL}\n}\n{$DOMAIN} {\n handle_path /updates/* {\n root * /srv/updates\n file_server\n }\n handle {\n reverse_proxy api:3000\n }\n}\n'''

class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config = self.root / 'Caddyfile'
        self.config.write_text(ORIGINAL)
        docker = self.root / 'docker'
        docker.write_text('''#!/usr/bin/env python3
import os,sys
from pathlib import Path
with open(os.environ['COMMAND_LOG'],'a') as out: out.write(' '.join(sys.argv[1:])+'\\n')
if 'wget' in sys.argv: print('{"ok":true}')
if 'validate' in sys.argv and os.environ.get('FAIL_VALIDATE'): sys.exit(1)
if 'reload' in sys.argv and os.environ.get('FAIL_RELOAD'): sys.exit(1)
''')
        docker.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(self.root)+os.pathsep+os.environ['PATH'], 'CADDY_FILE':str(self.config), 'COMMAND_LOG':str(self.root/'calls')}

    def run_script(self, **extra):
        return subprocess.run(['bash',str(SCRIPT)], env={**self.env,**extra}, text=True, capture_output=True)

    def test_add_preserves_original_and_bind_mount_inode(self):
        inode = self.config.stat().st_ino
        result = self.run_script()
        self.assertEqual(result.returncode,0,result.stderr)
        text = self.config.read_text()
        self.assertTrue(text.startswith(ORIGINAL))
        self.assertIn('ramtopia.duckdns.org {',text)
        self.assertIn('reverse_proxy ramtopia-web:8080',text)
        self.assertEqual(self.config.stat().st_ino,inode)
        self.assertEqual(next(self.root.glob('Caddyfile.before-ramtopia.*')).read_text(),ORIGINAL)
        self.assertEqual(self.run_script().returncode,0)
        self.assertEqual(self.config.read_text().count('# RAMTOPIA dedicated domain'),1)

    def test_validation_failure_restores_without_reload(self):
        result = self.run_script(FAIL_VALIDATE='1')
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(self.config.read_text(),ORIGINAL)
        self.assertNotIn('reload',(self.root/'calls').read_text())

    def test_reload_failure_restores_original(self):
        self.assertNotEqual(self.run_script(FAIL_RELOAD='1').returncode,0)
        self.assertEqual(self.config.read_text(),ORIGINAL)

    def test_hostname_injection_leaves_config_unchanged(self):
        self.assertNotEqual(self.run_script(RAMTOPIA_DOMAIN='bad.example { }').returncode,0)
        self.assertEqual(self.config.read_text(),ORIGINAL)

if __name__ == '__main__': unittest.main()
