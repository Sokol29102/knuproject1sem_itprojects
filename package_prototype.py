from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).parent / 'ai-requirements-analyzer'
plan = root / 'docs' / 'implementation-plan.md'
plan.write_text(plan.read_text(encoding='utf-8').replace('- [ ]', '- [x]'), encoding='utf-8')
for name in ['start-windows.cmd', 'stop-windows.cmd']:
    path = root / name
    path.write_bytes(path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\n', '\r\n').encode('utf-8'))

archive = root.parent / 'AI-Requirements-Analyzer-Sprint1.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as package:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if path.is_file() and not {'.venv', '__pycache__', '.git'}.intersection(relative.parts) and path.suffix != '.pyc':
            package.write(path, Path(root.name) / relative)

with ZipFile(archive) as package:
    assert package.testzip() is None
    names = set(package.namelist())
    for required in ['main.py', 'README.md', 'Dockerfile', 'compose.yaml', 'requirements.txt', 'start-windows.cmd', 'static/index.html', 'static/app.js', 'static/style.css', 'tests/test_app.py']:
        assert f'{root.name}/{required}' in names
    assert not any('.venv/' in name or '__pycache__/' in name for name in names)
    print(f'ZIP verified: {len(names)} files, {archive.stat().st_size:,} bytes')
    print(archive)
