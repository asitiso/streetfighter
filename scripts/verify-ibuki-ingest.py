"""Verify character-scoped promotion, existing-file rollback and rejected source isolation."""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,importlib.util,io,json,shutil,subprocess,sys
from contextlib import redirect_stdout
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def main():
 with TemporaryDirectory(prefix='ibuki-ingest-') as directory:
  fixture=Path(directory)
  for path in ['scripts/install-authored-chunli-walk.py','scripts/install-authored-ken-sequence.py','scripts/audit-ken-handoff-semantics.py','scripts/pose_ecc_cache.py','src/render/AnimationSequenceLibrary.ts','public/art/combat-sprites-hq/ibuki.webp']:
   target=fixture/path;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,target)
  shutil.copytree(ROOT/'public/art/animation-hq/ibuki',fixture/'public/art/animation-hq/ibuki')
  shutil.copytree(ROOT/'art-source/ibuki/inbox/idle',fixture/'art-source/ibuki/inbox/idle')
  runtime=fixture/'public/art/animation-hq/ibuki/idle.webp';manifest=runtime.parent/'manifest.json';registry=fixture/'src/render/AnimationSequenceLibrary.ts'
  # Use a stale existing strip and disabled registry to exercise replacement rollback.
  runtime.write_bytes(b'stale-existing-runtime')
  data=json.loads(manifest.read_text());data['records'][0]['enabled']=False;data['records'][0]['poseAuthored']=False;manifest.write_text(json.dumps(data))
  registry.write_text('\n'.join(line.replace('enabled:true','enabled:false').replace('poseAuthored:true','poseAuthored:false') if "id:'IBUKI_IDLE_HQ'" in line else line for line in registry.read_text().splitlines())+'\n')
  guarded=[runtime,manifest,registry];before={p:p.read_bytes() for p in guarded};chunli=[line for line in registry.read_text().splitlines() if "characterId:'CHUNLI'" in line]
  spec=importlib.util.spec_from_file_location('ibuki_installer',fixture/'scripts/install-authored-chunli-walk.py');installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
  original=Path.write_bytes;failed=False
  def fail_once(path,value):
   nonlocal failed
   if path==manifest and not failed:failed=True;raise OSError('injected manifest failure')
   return original(path,value)
  with patch.object(sys,'argv',['installer','idle','--character','IBUKI','--install']),patch.object(Path,'write_bytes',fail_once),redirect_stdout(io.StringIO()):
   try:installer.main()
   except OSError:pass
   else:raise AssertionError('Expected injected write failure')
  assert failed and before=={p:p.read_bytes() for p in guarded},'Rollback did not restore existing runtime/manifest/registry'
  def ingest():return subprocess.run([sys.executable,str(fixture/'scripts/install-authored-chunli-walk.py'),'idle','--character','IBUKI','--install'],cwd=fixture,capture_output=True,text=True)
  result=ingest();assert result.returncode==0,result.stdout+result.stderr
  assert chunli==[line for line in registry.read_text().splitlines() if "characterId:'CHUNLI'" in line],'Ibuki promotion changed Chun-Li records'
  data=json.loads(manifest.read_text());assert data['enabledFrameTotal']==6
  record=next(r for r in data['records'] if r['id']=='idle');assert record['sha256']==hashlib.sha256(runtime.read_bytes()).hexdigest().upper()
  idle_line=next(line for line in registry.read_text().splitlines() if "id:'IBUKI_IDLE_HQ'" in line);assert 'enabled:true' in idle_line and 'poseAuthored:true' in idle_line
  before={p:p.read_bytes() for p in guarded};(fixture/'art-source/ibuki/inbox/idle/06.png').unlink();result=ingest()
  assert result.returncode!=0,'Incomplete source accepted';assert before=={p:p.read_bytes() for p in guarded},'Rejected source changed runtime'
 print('IBUKI_INGEST_PASS rollback=True characterIsolation=True incompleteSourceRejected=True')
if __name__=='__main__':main()
