"""Exercise first-install and replacement rollback in an isolated roster fixture."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from contextlib import redirect_stdout
import importlib.util,io,json,shutil,sys

ROOT=Path(__file__).resolve().parents[1]

def main():
 with TemporaryDirectory(prefix='roster-ingest-') as directory:
  fixture=Path(directory)
  for name in ['build-roster-motions.py','install-authored-ken-sequence.py','pose_ecc_cache.py','audit-ken-handoff-semantics.py']:
   target=fixture/'scripts'/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/'scripts'/name,target)
  source=fixture/'art-source/roster-idle';source.mkdir(parents=True)
  config=json.loads((ROOT/'art-source/roster-idle/batch.json').read_text())[:1]
  (source/'batch.json').write_text(json.dumps(config));shutil.copytree(ROOT/'art-source/roster-idle/alex',source/'alex')
  spec=importlib.util.spec_from_file_location('roster_fixture',fixture/'scripts/build-roster-motions.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  def run(kind,install=True):
   with patch.object(sys,'argv',['build','--kind',kind,'--install' if install else '--runtime']),redirect_stdout(io.StringIO()):module.main()
  runtime=fixture/'public/art/animation-hq/alex';manifest=runtime/'manifest.json'
  original=Path.write_bytes
  def failure(kind):
   failed=False
   def write(path,data):
    nonlocal failed
    if path==manifest and not failed:failed=True;raise OSError('injected manifest write failure')
    return original(path,data)
   with patch.object(Path,'write_bytes',write):
    try:run(kind)
    except OSError:pass
    else:raise AssertionError('Write failure was not propagated')
   assert failed
  failure('idle');assert not (runtime/'idle.webp').exists() and not manifest.exists(),'First install left partial files'
  run('idle');run('walk')
  prior={p:p.read_bytes() for p in runtime.iterdir()}
  failure('walk-back');assert prior=={p:p.read_bytes() for p in runtime.iterdir()},'New retreat rollback left a file or changed manifest'
  run('walk-back')
  before={p:p.read_bytes() for p in runtime.iterdir()}
  for kind in ['idle','walk','walk-back']:
   failure(kind);assert before=={p:p.read_bytes() for p in runtime.iterdir()},'Replacement rollback changed installed files'
   run(kind,False)
  assert json.loads(manifest.read_text())['enabledFrameTotal']==28
  directions=0
  for peer in ['idle','walk','walk-back']:
   path=runtime/f'{peer}.webp'
   for selected in ['idle','walk','walk-back']:
    if peer==selected:continue
    path.write_bytes(b'corrupt peer');corrupted={p:p.read_bytes() for p in runtime.iterdir()}
    try:run(selected)
    except ValueError:pass
    else:raise AssertionError('Corrupt installed peer accepted')
    assert corrupted=={p:p.read_bytes() for p in runtime.iterdir()}
    path.write_bytes(before[path]);directions+=1
  (source/'alex/retreat-sheet.png').write_bytes(b'incomplete source')
  try:run('walk-back')
  except OSError:pass
  else:raise AssertionError('Incomplete source accepted')
  assert before=={p:p.read_bytes() for p in runtime.iterdir()}
 print(f'ROSTER_INGEST_PASS firstInstallRollback=True retreatNewFileRollback=True replacementRollback=True corruptPeerDirections={directions} incompleteRejected=True')

if __name__=='__main__':main()
