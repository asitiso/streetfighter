"""Verify scoped locomotion promotion, rollback and rejected peer/source isolation."""
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
  kinds=['idle','walk','walk-back']
  for kind in kinds:shutil.copytree(ROOT/f'art-source/ibuki/inbox/{kind}',fixture/f'art-source/ibuki/inbox/{kind}')
  runtime_dir=fixture/'public/art/animation-hq/ibuki';manifest=runtime_dir/'manifest.json';registry=fixture/'src/render/AnimationSequenceLibrary.ts'
  spec=importlib.util.spec_from_file_location('ibuki_installer',fixture/'scripts/install-authored-chunli-walk.py');installer=importlib.util.module_from_spec(spec);spec.loader.exec_module(installer)
  def ingest(kind):return subprocess.run([sys.executable,str(fixture/'scripts/install-authored-chunli-walk.py'),kind,'--character','IBUKI','--install'],cwd=fixture,capture_output=True,text=True)
  # First idle bootstrap must work with all locomotion peers still staged.
  data=json.loads(manifest.read_text())
  for record in data['records']:record['enabled']=record['poseAuthored']=False
  manifest.write_text(json.dumps(data))
  for kind,total in zip(kinds,[6,18,28]):
   result=ingest(kind);assert result.returncode==0,result.stdout+result.stderr
   assert json.loads(manifest.read_text())['enabledFrameTotal']==total
  for kind in kinds:
   runtime=runtime_dir/f'{kind}.webp';runtime.write_bytes(b'stale-existing-runtime')
   data=json.loads(manifest.read_text());record=next(r for r in data['records'] if r['id']==kind);record['enabled']=record['poseAuthored']=False;manifest.write_text(json.dumps(data))
   sequence_id='IBUKI_'+kind.upper().replace('-','_')+'_HQ'
   registry.write_text('\n'.join(line.replace('enabled:true','enabled:false').replace('poseAuthored:true','poseAuthored:false') if sequence_id in line else line for line in registry.read_text().splitlines())+'\n')
   guarded=[runtime,manifest,registry];before={p:p.read_bytes() for p in guarded};chunli=[line for line in registry.read_text().splitlines() if "characterId:'CHUNLI'" in line]
   original=Path.write_bytes;failed=False
   def fail_once(path,value):
    nonlocal failed
    if path==manifest and not failed:failed=True;raise OSError('injected manifest failure')
    return original(path,value)
   with patch.object(sys,'argv',['installer',kind,'--character','IBUKI','--install']),patch.object(Path,'write_bytes',fail_once),redirect_stdout(io.StringIO()):
    try:installer.main()
    except OSError:pass
    else:raise AssertionError('Expected injected write failure')
   assert failed and before=={p:p.read_bytes() for p in guarded},'Rollback did not restore existing runtime/manifest/registry'
   result=ingest(kind);assert result.returncode==0,result.stdout+result.stderr
   assert chunli==[line for line in registry.read_text().splitlines() if "characterId:'CHUNLI'" in line],'Ibuki promotion changed Chun-Li'
   data=json.loads(manifest.read_text());assert data['enabledFrameTotal']==28
   record=next(r for r in data['records'] if r['id']==kind);assert record['sha256']==hashlib.sha256(runtime.read_bytes()).hexdigest().upper()
   line=next(line for line in registry.read_text().splitlines() if sequence_id in line);assert 'enabled:true' in line and 'poseAuthored:true' in line
   before={p:p.read_bytes() for p in guarded};source=fixture/f'art-source/ibuki/inbox/{kind}/{record["frames"]:02d}.png';source_data=source.read_bytes();source.unlink();result=ingest(kind)
   assert result.returncode!=0,'Incomplete source accepted';assert before=={p:p.read_bytes() for p in guarded},'Rejected source changed runtime';source.write_bytes(source_data)
  # Every replacement direction validates installed peers, not uninstalled source.
  for kind in kinds:
   for peer in kinds:
    if peer==kind:continue
    runtime=runtime_dir/f'{kind}.webp';peer_path=runtime_dir/f'{peer}.webp';peer_data=peer_path.read_bytes()
    guarded=[runtime,manifest,registry];before={p:p.read_bytes() for p in guarded}
    peer_path.write_bytes(b'corrupt-installed-peer');result=ingest(kind)
    assert result.returncode!=0,f'Corrupt {peer} accepted when replacing {kind}'
    assert before=={p:p.read_bytes() for p in guarded},'Rejected peer changed runtime'
    peer_path.write_bytes(peer_data)
 print('IBUKI_INGEST_PASS bootstrap=True idleWalkRetreat=True rollback=True characterIsolation=True incompleteSourceRejected=True corruptPeerDirections=6')
if __name__=='__main__':main()
