"""Check paired promotion and rejection using an isolated copy of real source art."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib
import importlib.util
import io
import json
from contextlib import redirect_stdout
import shutil
import subprocess
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def main():
    with TemporaryDirectory(prefix='chunli-pair-') as directory:
        fixture = Path(directory)
        for path in ['scripts/install-authored-chunli-walk.py', 'scripts/install-authored-ken-sequence.py',
                     'scripts/audit-ken-handoff-semantics.py', 'scripts/pose_ecc_cache.py',
                     'src/render/AnimationSequenceLibrary.ts', 'public/art/combat-sprites-hq/chunli.webp']:
            target = fixture / path
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / path, target)
        runtime = fixture / 'public/art/animation-hq/chunli'
        shutil.copytree(ROOT / 'public/art/animation-hq/chunli', runtime)
        for kind in ('jump', 'landing'):
            shutil.copytree(ROOT / f'art-source/chunli/inbox/{kind}', fixture / f'art-source/chunli/inbox/{kind}')
        manifest_path = runtime / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        for record in manifest['records']:
            if record['id'] in ('jump', 'landing'):
                record.update(enabled=False, poseAuthored=False)
        manifest_path.write_text(json.dumps(manifest))

        def ingest(kind):
            return subprocess.run([sys.executable, str(fixture / 'scripts/install-authored-chunli-walk.py'), kind, '--install'],
                                  cwd=fixture, capture_output=True, text=True)

        for selected in ('jump', 'landing'):
            # A stale peer must be regenerated even when only its partner is requested.
            peer = 'landing' if selected == 'jump' else 'jump'
            (runtime / f'{peer}.webp').write_bytes(b'stale peer')
            result = ingest(selected)
            assert result.returncode == 0, result.stdout + result.stderr
            manifest = json.loads(manifest_path.read_text())
            for kind in ('jump', 'landing'):
                record = next(r for r in manifest['records'] if r['id'] == kind)
                data = (runtime / f'{kind}.webp').read_bytes()
                assert record['enabled'] and record['poseAuthored'], f'{selected} did not promote {kind}'
                assert record['sha256'] == hashlib.sha256(data).hexdigest().upper(), f'{kind} stale checksum'
                assert data == (fixture / f'art-source/chunli/authored-candidates/{kind}.webp').read_bytes(), f'{kind} stale runtime'
            assert manifest['enabledFrameTotal'] == 43

        guarded = [runtime / 'jump.webp', runtime / 'landing.webp', manifest_path,
                   fixture / 'src/render/AnimationSequenceLibrary.ts']
        (runtime / 'jump.webp').write_bytes(b'previous jump')
        (runtime / 'landing.webp').write_bytes(b'previous landing')
        before = {p: p.read_bytes() for p in guarded}
        spec = importlib.util.spec_from_file_location('paired_installer', fixture / 'scripts/install-authored-chunli-walk.py')
        installer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(installer)
        original_write = Path.write_bytes
        failed = False

        def fail_manifest_once(path, data):
            nonlocal failed
            if path == manifest_path and not failed:
                failed = True
                raise OSError('injected manifest write failure')
            return original_write(path, data)

        with patch.object(sys, 'argv', ['installer', 'landing', '--install']), patch.object(Path, 'write_bytes', fail_manifest_once), redirect_stdout(io.StringIO()):
            try:
                installer.main()
            except OSError:
                pass
            else:
                raise AssertionError('Write failure did not propagate')
        assert failed and before == {p: p.read_bytes() for p in guarded}, 'Write failure did not roll back paired runtime'
        before = {p: p.read_bytes() for p in guarded}
        (fixture / 'art-source/chunli/inbox/landing/06.png').unlink()
        result = ingest('jump')
        assert result.returncode != 0, 'Incomplete peer source was accepted'
        assert before == {p: p.read_bytes() for p in guarded}, 'Rejected peer changed runtime files'
    print('CHUNLI_PAIRED_INGEST_PASS bothDirections=True stalePeerReplaced=True incompletePeerRejected=True runtimeUnchanged=True writeFailureRollback=True')


if __name__ == '__main__':
    main()
