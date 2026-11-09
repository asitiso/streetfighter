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
kinds=('dash-back','walk-back','hit','guard','parry','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick')
reference=Image.open(ROOT/'public/art/animation-hq/ryu/idle.webp').convert('RGBA').crop((0,0,384,448))
reference_baseline=int(np.nonzero(np.asarray(reference.getchannel('A'))>=32)[0].max())
for kind in kinds:
 sheet=Image.open(ROOT/f'public/art/animation-hq/ryu/{kind}.webp').convert('RGBA');count=builder.module().EXPECTED[kind];width=640 if kind=='dash-back' or kind.startswith('stand-') or kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else 384
 for i in range(count):
  frame=sheet.crop((i*width,0,(i+1)*width,448))
  assert int(np.nonzero(np.asarray(frame.getchannel('A'))>=32)[0].max())==reference_baseline,'Ryu support sole baseline differs from installed idle'
variance=load(ROOT/'scripts/measure-animation-pose-variance.py','ryu_variance')
with TemporaryDirectory(prefix='ryu-variance-') as variance_temp:
 report=variance.measure('RYU',Path(variance_temp)/'report.json',strict_missing=True)
 for kind in ('shoryuken','hadoken','dash-back','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
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
 data['records']=[r for r in data['records'] if r['id'] not in ('dash-back','guard','parry','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick')]
 for r in data['records']:
  if r['id'] in ('walk-back','hit','stand-light','stand-heavy'):r.update(enabled=False,poseAuthored=False)
 for name in ('dash-back','guard','parry','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):(runtime/f'{name}.webp').unlink()
 builder.update_frame_totals(data);path.write_text(json.dumps(data))
 assert data['frameTotal']==100 and data['enabledFrameTotal']==65
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
 for kind in ('idle','landing','air','walk'):
  try:run(kind)
  except SystemExit:pass
  else:raise AssertionError('Unsafe Ryu kind accepted')
  assert before==snapshot()
 support_snapshot=None
 for kind in kinds:
  if kind=='stand-light':
   support_snapshot={r['id']:r for r in json.loads(path.read_text())['records'] if r['id'] in ('walk-back','hit','guard','parry')}
   support_files={name:(runtime/f'{name}.webp').read_bytes() for name in support_snapshot}
  if kind in ('dash-back','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
   previous_records=json.loads(path.read_text())['records']
   previous_files={r['id']:(runtime/(r['id']+'.webp')).read_bytes() for r in previous_records}
  before=snapshot();fail_write(kind);assert before==snapshot(),'First promotion rollback changed fixture'
  order=[r['id'] for r in json.loads(path.read_text())['records']]
  run(kind);current=json.loads(path.read_text())
  if kind in ('dash-back','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
   assert previous_records==[r for r in current['records'] if r['id']!=kind],'New normal changed existing records'
   assert previous_files=={name:(runtime/(name+'.webp')).read_bytes() for name in previous_files},'New normal changed existing art'
  assert [r['id'] for r in current['records']][:len(order)]==order,'Promotion reordered staged records'
 # Refresh the new low-guard record after its new attack peers exist.
 run('crouch')
 final=json.loads(path.read_text());assert [final[k] for k in ('frameTotal','enabledFrameTotal','fullFrameTotal','bridgeFrameTotal')]==[217,217,217,0]
 assert len(final['records'])==25
 assert support_snapshot=={r['id']:r for r in final['records'] if r['id'] in support_snapshot},'Punch promotion changed support records'
 assert support_files=={name:(runtime/f'{name}.webp').read_bytes() for name in support_files},'Punch promotion changed support art'
 assert binding=={k:final[k] for k in binding},'Original approved-source binding changed'
 assert staged=={r['id']:r for r in final['records'] if r['id'] in staged},'Staged specials promoted or changed'
 assert staged_files=={name:(runtime/f'{name}.webp').read_bytes() for name in staged_files}
 before=snapshot()
 for kind in kinds:
  run(kind,False);fail_write(kind);assert before==snapshot(),'Replacement rollback changed runtime'
  run(kind);assert before==snapshot(),'Reinstallation changed order or bytes'
  sheet=Image.open(runtime/f'{kind}.webp').convert('RGBA');count=module.module().EXPECTED[kind];width=640 if kind=='dash-back' or kind.startswith('stand-') or kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else 384
  frames=[sheet.crop((i*width,0,(i+1)*width,448)) for i in range(count)]
  motion=module.module();motion.FRAME_W=width;motion.ROSTER_CHARACTER='RYU';motion.ROSTER_MK_PROFILE='kick'
  assert not motion.semantic_qa(kind,[frames[0]]*count,motion.pose_qa([frames[0]]*count,kind))['semanticQaPass'],'Static support pose accepted'
  if kind=='dash-back':
   original=path.read_bytes();bad=json.loads(original)
   next(r for r in bad['records'] if r['id']==kind)['facingRelativeDirection']='forward'
   path.write_text(json.dumps(bad));wrong_snapshot=snapshot()
   try:run(kind,False)
   except ValueError:pass
   else:raise AssertionError('Wrong Ryu dash direction accepted')
   assert wrong_snapshot==snapshot();path.write_bytes(original)
   forward=Image.open(runtime/'dash.webp').convert('RGBA')
   wrong=[]
   for i in range(count):
    f=Image.new('RGBA',(640,448));f.alpha_composite(forward.crop((i*384,0,(i+1)*384,448)),(128,0));wrong.append(f)
   assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Forward Ryu dash accepted as backward'
  if kind in ('stand-light','stand-medium','stand-heavy'):
   contact=5 if kind=='stand-heavy' else 3
   guard=Image.open(runtime/'guard.webp').convert('RGBA').crop((0,0,384,448))
   substitute=Image.new('RGBA',(640,448));substitute.alpha_composite(guard,(128,0))
   wrong=frames[:contact]+[substitute]+frames[contact+1:]
   assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Guard accepted as punch contact'
  if kind in ('stand-light-kick','stand-medium-kick','stand-heavy-kick'):
   contacts={'stand-light-kick':(3,),'stand-medium-kick':(4,5),'stand-heavy-kick':(5,6)}[kind]
   for replacement in ('guard','stand-light'):
    peer=Image.open(runtime/f'{replacement}.webp').convert('RGBA')
    peer_width=384 if replacement=='guard' else 640
    index=0 if replacement=='guard' else 3
    substitute=Image.new('RGBA',(640,448));substitute.alpha_composite(peer.crop((index*peer_width,0,(index+1)*peer_width,448)),((640-peer_width)//2,0))
    for contact in contacts:
     wrong=frames.copy();wrong[contact]=substitute
     assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Guard/punch accepted as kick contact '+kind+' frame'+str(contact)
   if kind=='stand-heavy-kick':
    low=Image.open(runtime/'stand-light-kick.webp').convert('RGBA').crop((3*640,0,4*640,448))
    for contact in contacts:
     wrong=frames.copy();wrong[contact]=low
     assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Low kick accepted as heavy contact '+str(contact)
   for offset,check in [((18,0),'supportRootStable'),((0,-12),'supportBaselineStable')]:
    displaced=Image.new('RGBA',(640,448));displaced.alpha_composite(frames[contacts[0]],offset)
    wrong=frames.copy();wrong[contacts[0]]=displaced
    result=motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))
    assert not result['checks'][check] and not result['semanticQaPass'],'Displaced support foot accepted'
  if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
   held=Image.open(runtime/'crouch.webp').convert('RGBA').crop((5*384,0,6*384,448))
   height=held.getbbox()[3]-held.getbbox()[1]
   record=next(r for r in json.loads(path.read_text())['records'] if r['id']==kind)
   assert record['normalization']['footBaselineReference']=='installed-crouch'
   assert all(.85*height<=f.getbbox()[3]-f.getbbox()[1]<=1.10*height for f in frames),'Low punch enlarged to standing scale'
   low_guard=Image.new('RGBA',(640,448));low_guard.alpha_composite(held,(128,0))
   contacts={'crouch-heavy':(4,5),'crouch-medium-kick':(4,5),'crouch-heavy-kick':(5,6)}.get(kind,(3,))
   for contact in contacts:
    wrong=frames.copy();wrong[contact]=low_guard
    if (kind=='crouch-heavy' and contact==4) or (kind in ('crouch-medium-kick','crouch-heavy-kick') and contact==contacts[-1]):wrong[1]=frames[contacts[0]]
    assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Low guard accepted as contact '+kind+' frame'+str(contact)
   if kind.endswith('-kick'):
    punch=Image.open(runtime/'crouch-medium.webp').convert('RGBA').crop((3*640,0,4*640,448))
    for contact in contacts:
     wrong=frames.copy();wrong[contact]=punch
     if len(contacts)>1 and contact==contacts[-1]:wrong[1]=frames[contacts[0]]
     assert not motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'],'Punch accepted as low kick contact'
    for offset,check in [((18,0),'supportRootStable'),((0,-12),'supportBaselineStable')]:
     moved=Image.new('RGBA',(640,448));moved.alpha_composite(frames[contacts[0]],offset)
     wrong=frames.copy();wrong[contacts[0]]=moved
     result=motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))
     assert not result['checks'][check] and not result['semanticQaPass'],'Displaced low-kick support accepted'
   standing_kind=kind.replace('crouch-','stand-',1)
   standing=Image.open(runtime/f'{standing_kind}.webp').convert('RGBA')
   wrong=[standing.crop((i*640,0,(i+1)*640,448)) for i in range(count)]
   assert not (motion.semantic_qa(kind,wrong,motion.pose_qa(wrong,kind))['semanticQaPass'] and all(r['pass'] for r in module.handoffs(runtime,kind,wrong).values())),'Standing punches accepted as low attacks'
  peers=['idle','walk'] if kind=='walk-back' else ['crouch'] if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else ['idle','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'] if kind=='crouch' else ['idle']
  for peer in peers:
   peer_path=runtime/f'{peer}.webp';saved=peer_path.read_bytes();peer_path.write_bytes(b'corrupt support peer');bad=snapshot()
   try:run(kind)
   except (ValueError,OSError):pass
   else:raise AssertionError('Corrupt support peer accepted')
   assert bad==snapshot();peer_path.write_bytes(saved)
 for kind,name in [('dash-back','dash-back'),('walk-back','retreat'),('hit','hit'),('guard','guard'),('parry','parry'),('stand-light','stand-light'),('stand-medium','stand-medium'),('stand-heavy','stand-heavy'),('stand-light-kick','stand-light-kick'),('stand-medium-kick','stand-medium-kick'),('stand-heavy-kick','stand-heavy-kick'),('crouch','crouch'),('crouch-light','crouch-light'),('crouch-medium','crouch-medium'),('crouch-heavy','crouch-heavy'),('crouch-light-kick','crouch-light-kick'),('crouch-medium-kick','crouch-medium-kick'),('crouch-heavy-kick','crouch-heavy-kick')]:
  src=source/'ryu'/f'{name}-sheet.png';saved=src.read_bytes();src.write_bytes(b'incomplete source')
  try:
   try:run(kind)
   except OSError:pass
   else:raise AssertionError('Incomplete Ryu source accepted')
   assert before==snapshot()
  finally:src.write_bytes(saved)
print('RYU_SUPPORT_INGEST_PASS disabledTotals=True stagedSpecialsAndApprovedBindingPreserved=True invalidSelectorRejected=True firstAndReplacementRollback=True peerCorruptionRejected=True staticRejected=True stableOrder=True')
