"""Reject generated artifacts accidentally tracked in the application repository."""
import subprocess
from pathlib import PurePosixPath

tracked = subprocess.check_output(['git', 'ls-files', '-z'], text=True).split('\0')
forbidden_parts = {'node_modules', 'dist', 'coverage', 'playwright-report', 'test-results', '__pycache__'}
bad = [name for name in tracked if name and (forbidden_parts.intersection(PurePosixPath(name).parts) or name.endswith(('.tsbuildinfo', '.apk', '.exe', '.pyc')) or name.startswith(('packaging/windows/out/', 'packaging/windows/web/', 'packaging/android/web/', 'packaging/android/android/')))]
if bad:
    raise SystemExit('Generated files must not be tracked:\n' + '\n'.join(bad))
print('Repository hygiene passed.')
