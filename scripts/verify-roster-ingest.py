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
  prior={p:p.read_bytes() for p in runtime.iterdir()}
  failure('dash');assert prior=={p:p.read_bytes() for p in runtime.iterdir()},'New dash rollback left a file or changed manifest'
  run('dash')
  prior={p:p.read_bytes() for p in runtime.iterdir()}
  failure('air');assert prior=={p:p.read_bytes() for p in runtime.iterdir()},'New air pair rollback left a file or changed manifest'
  run('air')
  prior={p:p.read_bytes() for p in runtime.iterdir()}
  failure('hit');assert prior=={p:p.read_bytes() for p in runtime.iterdir()},'New hit rollback left a file or changed manifest'
  run('hit')
  for kind in ['crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','guard','parry','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick']:
   prior={p:p.read_bytes() for p in runtime.iterdir()}
   failure(kind);assert prior=={p:p.read_bytes() for p in runtime.iterdir()},f'New {kind} rollback changed runtime'
   run(kind)
  before={p:p.read_bytes() for p in runtime.iterdir()}
  for kind in ['crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','idle','walk','walk-back','dash','air','hit','guard','parry','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick']:
   failure(kind);assert before=={p:p.read_bytes() for p in runtime.iterdir()},'Replacement rollback changed installed files'
   run(kind,False)
  assert json.loads(manifest.read_text())['enabledFrameTotal']==162
  bad=json.loads(manifest.read_text());next(r for r in bad['records'] if r['id']=='crouch-heavy')['semanticProfile']='shoulder'
  manifest.write_text(json.dumps(bad))
  try:run('crouch-heavy',False)
  except ValueError:pass
  else:raise AssertionError('Mismatched 2HP runtime profile accepted')
  manifest.write_bytes(before[manifest])
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
  for selected,peer in [('idle','dash'),('dash','idle'),('idle','jump'),('idle','landing'),('idle','hit'),('hit','idle'),('idle','guard'),('guard','idle'),('idle','parry'),('parry','idle'),('idle','stand-light'),('stand-light','idle'),('idle','stand-heavy'),('stand-heavy','idle'),('idle','stand-medium'),('stand-medium','idle'),('idle','stand-light-kick'),('stand-light-kick','idle'),('idle','stand-medium-kick'),('stand-medium-kick','idle'),('idle','stand-heavy-kick'),('stand-heavy-kick','idle'),('idle','crouch'),('crouch','idle'),('crouch','crouch-light'),('crouch-light','crouch'),('crouch','crouch-medium'),('crouch-medium','crouch'),('crouch','crouch-heavy'),('crouch-heavy','crouch'),('crouch','crouch-light-kick'),('crouch-light-kick','crouch')]:
   path=runtime/f'{peer}.webp';path.write_bytes(b'corrupt handoff peer');corrupted={p:p.read_bytes() for p in runtime.iterdir()}
   try:run(selected)
   except (ValueError,OSError):pass
   else:raise AssertionError('Corrupt handoff peer accepted')
   assert corrupted=={p:p.read_bytes() for p in runtime.iterdir()}
   path.write_bytes(before[path]);directions+=1
  for name in ['jump','landing']:(runtime/f'{name}.webp').write_bytes(b'stale paired runtime')
  run('air');assert before=={p:p.read_bytes() for p in runtime.iterdir()},'Air promotion did not replace both stale peers'
  for kind,name in [('walk-back','retreat-sheet.png'),('dash','dash-sheet.png'),('air','jump-sheet.png'),('air','landing-sheet.png'),('hit','hit-sheet.png'),('guard','guard-sheet.png'),('guard','parry-sheet.png'),('parry','parry-sheet.png'),('stand-light','stand-light-sheet.png'),('stand-heavy','stand-heavy-sheet.png'),('stand-medium','stand-medium-sheet.png'),('stand-light-kick','stand-light-kick-sheet.png'),('stand-medium-kick','stand-medium-kick-sheet.png'),('stand-heavy-kick','stand-heavy-kick-sheet.png'),('crouch','crouch-sheet.png'),('crouch-light','crouch-light-sheet.png'),('crouch-medium','crouch-medium-sheet.png'),('crouch-heavy','crouch-heavy-sheet.png'),('crouch-light-kick','crouch-light-kick-sheet.png')]:
   path=source/'alex'/name;source_data=path.read_bytes();path.write_bytes(b'incomplete source')
   try:
    try:run(kind)
    except OSError:pass
    else:raise AssertionError('Incomplete source accepted')
    assert before=={p:p.read_bytes() for p in runtime.iterdir()}
   finally:path.write_bytes(source_data)
 print(f'ROSTER_INGEST_PASS firstInstallRollback=True retreatNewFileRollback=True dashNewFileRollback=True airPairRollback=True hitNewFileRollback=True defenseNewFileRollback=True attackNewFileRollback=True pairedReplacement=True replacementRollback=True corruptPeerDirections={directions} incompleteRejected=True')

if __name__=='__main__':main()
