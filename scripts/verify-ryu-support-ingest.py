"""Ryu partial-manifest totals, safe support promotion and rollback."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from contextlib import redirect_stdout,redirect_stderr
import importlib.util,io,json,shutil,sys
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def load(path,name):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
builder=load(ROOT/'scripts/build-roster-motions.py','ryu_support_builder')
manifest={'records':[{'frames':3,'enabled':True,'renderMode':'full'},{'frames':9,'enabled':False,'renderMode':'full'},{'frames':4,'enabled':True,'renderMode':'bridge'}]}
builder.update_frame_totals(manifest)
assert [manifest[k] for k in ('frameTotal','enabledFrameTotal','fullFrameTotal','bridgeFrameTotal')]==[16,7,3,4],'Disabled records counted as active'
kinds=('walk-back','hit','guard','parry','stand-light','stand-medium','stand-heavy')
reference=Image.open(ROOT/'public/art/animation-hq/ryu/idle.webp').convert('RGBA').crop((0,0,384,448))
reference_baseline=int(np.nonzero(np.asarray(reference.getchannel('A'))>=32)[0].max())
for kind in kinds:
 sheet=Image.open(ROOT/f'public/art/animation-hq/ryu/{kind}.webp').convert('RGBA');count=builder.module().EXPECTED[kind];width=640 if kind.startswith('stand-') else 384
 for i in range(count):
  frame=sheet.crop((i*width,0,(i+1)*width,448))
  assert int(np.nonzero(np.asarray(frame.getchannel('A'))>=32)[0].max())==reference_baseline,'Ryu support sole baseline differs from installed idle'
variance=load(ROOT/'scripts/measure-animation-pose-variance.py','ryu_variance')
with TemporaryDirectory(prefix='ryu-variance-') as variance_temp:
 report=variance.measure('RYU',Path(variance_temp)/'report.json',strict_missing=True)
 for kind in ('stand-light','stand-medium','stand-heavy'):
  row=next(r for r in report['records'] if r['sequence']==kind)
  assert row['poseAuthoredPass'],'Actual-width Ryu punch variance failed'
  sheet=Image.open(ROOT/f'public/art/animation-hq/ryu/{kind}.webp').convert('RGBA')
  assert variance.alpha_frame(sheet,1,640).shape==(448,640)
  np.testing.assert_array_equal(variance.alpha_frame(sheet,1,640),np.asarray(sheet.crop((640,0,1280,448)).getchannel('A'),dtype=np.float32)/255.0)
with TemporaryDirectory(prefix='ryu-support-') as temp:
 fixture=Path(temp)
 for name in ['build-roster-motions.py','install-authored-ken-sequence.py','pose_ecc_cache.py','audit-ken-handoff-semantics.py']:
  dest=fixture/'scripts'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/'scripts'/name,dest)
 source=fixture/'art-source/roster-idle';source.mkdir(parents=True)
 shutil.copyfile(ROOT/'art-source/roster-idle/batch.json',source/'batch.json')
 shutil.copytree(ROOT/'art-source/roster-idle/ryu',source/'ryu')
 runtime=fixture/'public/art/animation-hq/ryu';shutil.copytree(ROOT/'public/art/animation-hq/ryu',runtime)
 path=runtime/'manifest.json';data=json.loads(path.read_text())
 data['records']=[r for r in data['records'] if r['id'] not in ('guard','parry','stand-medium')]
 for r in data['records']:
  if r['id'] in ('walk-back','hit','stand-light','stand-heavy'):r.update(enabled=False,poseAuthored=False)
 for name in ('guard','parry','stand-medium'):(runtime/f'{name}.webp').unlink()
 builder.update_frame_totals(data);path.write_text(json.dumps(data))
 assert data['frameTotal']==100 and data['enabledFrameTotal']==41
 binding={k:data[k] for k in ('source','sourcePath','sourceSize','sourceSha256')}
 staged={r['id']:r.copy() for r in data['records'] if r['id'] in ('hadoken','shoryuken')}
 staged_files={name:(runtime/f'{name}.webp').read_bytes() for name in staged}
 module=load(fixture/'scripts/build-roster-motions.py','ryu_support_fixture')
 def run(kind,install=True):
  with patch.object(sys,'argv',['build','--character','RYU','--kind',kind,'--install' if install else '--runtime']),redirect_stdout(io.StringIO()),redirect_stderr(io.StringIO()):
   module.main()
 def snapshot():return {p.name:p.read_bytes() for p in runtime.iterdir()}
 def fail_write(kind):
  original=Path.write_bytes;failed=False
  def write(target,payload):
   nonlocal failed
   if target==path and not failed:failed=True;raise OSError('injected Ryu manifest failure')
   return original(target,payload)
  with patch.object(Path,'write_bytes',write):
   try:run(kind)
   except OSError:pass
   else:raise AssertionError('Write failure did not propagate')
  assert failed
 # Illegal selector/kind combinations must fail before reading sources/writing.
 before=snapshot()
 for kind in ('idle','dash-back','air','stand-light-kick'):
  try:run(kind)
  except SystemExit:pass
  else:raise AssertionError('Unsafe Ryu kind accepted')
  assert before==snapshot()
 support_snapshot=None
 for kind in kinds:
  if kind=='stand-light':
   support_snapshot={r['id']:r for r in json.loads(path.read_text())['records'] if r['id'] in ('walk-back','hit','guard','parry')}
   support_files={name:(runtime/f'{name}.webp').read_bytes() for name in support_snapshot}
  if kind=='stand-medium':
   previous_records=json.loads(path.read_text())['records']
   previous_files={r['id']:(runtime/(r['id']+'.webp')).read_bytes() for r in previous_records}
  before=snapshot();fail_write(kind);assert before==snapshot(),'First promotion rollback changed fixture'
  order=[r['id'] for r in json.loads(path.read_text())['records']]
  run(kind);current=json.loads(path.read_text())
  if kind=='stand-medium':
   assert previous_records==[r for r in current['records'] if r['id']!='stand-medium'],'MP changed existing records'
   assert previous_files=={name:(runtime/(name+'.webp')).read_bytes() for name in previous_files},'MP changed existing art'
  assert [r['id'] for r in current['records']][:len(order)]==order,'Promotion reordered staged records'
 final=json.loads(path.read_text());assert [final[k] for k in ('frameTotal','enabledFrameTotal','fullFrameTotal','bridgeFrameTotal')]==[119,95,95,0]
 assert len(final['records'])==14
 assert support_snapshot=={r['id']:r for r in final['records'] if r['id'] in support_snapshot},'Punch promotion changed support records'
 assert support_files=={name:(runtime/f'{name}.webp').read_bytes() for name in support_files},'Punch promotion changed support art'
 assert binding=={k:final[k] for k in binding},'Original approved-source binding changed'
 assert staged=={r['id']:r for r in final['records'] if r['id'] in staged},'Staged specials promoted or changed'
 assert staged_files=={name:(runtime/f'{name}.webp').read_bytes() for name in staged_files}
 before=snapshot()
 for kind in kinds:
  run(kind,False);fail_write(kind);assert before==snapshot(),'Replacement rollback changed runtime'
  run(kind);assert before==snapshot(),'Reinstallation changed order or bytes'
  sheet=Image.open(runtime/f'{kind}.webp').convert('RGBA');count=module.module().EXPECTED[kind];width=640 if kind.startswith('stand-') else 384
  frames=[sheet.crop((i*width,0,(i+1)*width,448)) for i in range(count)]
  motion=module.module();motion.FRAME_W=width;motion.ROSTER_CHARACTER='RYU'
  assert not motion.semantic_qa(kind,[frames[0]]*count,motion.pose_qa([frames[0]]*count,kind))['semanticQaPass'],'Static support pose accepted'
  if kind in ('stand-light','stand-medium','stand-heavy'):
   contact=5 if kind=='stand-heavy' else 3
   guard=Image.open(runtime/'guard.webp').convert('RGBA').crop((0,0,384,448))
   substitute=Image.new('RGBA',(640,448));substitute.alpha_composite(guard,(128,0))
   wrong=frames[:contact]+[substitute]+frames[contact+1:]
   assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Guard accepted as punch contact'
  for peer in (['idle','walk'] if kind=='walk-back' else ['idle']):
   peer_path=runtime/f'{peer}.webp';saved=peer_path.read_bytes();peer_path.write_bytes(b'corrupt support peer');bad=snapshot()
   try:run(kind)
   except (ValueError,OSError):pass
   else:raise AssertionError('Corrupt support peer accepted')
   assert bad==snapshot();peer_path.write_bytes(saved)
 for kind,name in [('walk-back','retreat'),('hit','hit'),('guard','guard'),('parry','parry'),('stand-light','stand-light'),('stand-medium','stand-medium'),('stand-heavy','stand-heavy')]:
  src=source/'ryu'/f'{name}-sheet.png';saved=src.read_bytes();src.write_bytes(b'incomplete source')
  try:
   try:run(kind)
   except OSError:pass
   else:raise AssertionError('Incomplete Ryu source accepted')
   assert before==snapshot()
  finally:src.write_bytes(saved)
print('RYU_SUPPORT_INGEST_PASS disabledTotals=True stagedSpecialsAndApprovedBindingPreserved=True invalidSelectorRejected=True firstAndReplacementRollback=True peerCorruptionRejected=True staticRejected=True stableOrder=True')
