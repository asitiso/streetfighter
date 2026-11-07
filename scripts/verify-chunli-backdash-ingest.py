"""Supplemental authored-motion provenance, preservation, semantic negatives and atomic writes."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from contextlib import redirect_stdout,redirect_stderr
import importlib.util,io,json,shutil,sys,hashlib,argparse
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--character',choices=['CHUNLI','IBUKI','KEN'],default='CHUNLI');parser.add_argument('--kind',choices=['dash-back','guard','parry','stand-medium','stand-light-kick'],default='dash-back');args=parser.parse_args();character=args.character;selected_kind=args.kind
if (character=='KEN' and selected_kind not in ('dash-back','stand-medium','stand-light-kick')) or (character!='KEN' and selected_kind in ('stand-medium','stand-light-kick')):parser.error('Unsupported supplemental character/kind')
count,width,order={'dash-back':(7,640,[1,2,3,3,4,5,6]),'guard':(5,384,[2,2,3,3,4]),'parry':(6,384,[1,2,3,3,4,4]),'stand-medium':(8,640,[1,2,3,4,5,5,6,6]),'stand-light-kick':(8,640,[1,2,3,4,5,5,6,6])}[selected_kind]
slug=character.lower();prior_count={'CHUNLI':17,'IBUKI':16,'KEN':17}[character];total={'CHUNLI':168,'IBUKI':154,'KEN':160}[character]
def load(path,name):
 spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
with TemporaryDirectory(prefix='chunli-backdash-') as temp:
 root=Path(temp)
 for name in ('build-roster-motions.py','install-authored-ken-sequence.py','pose_ecc_cache.py','audit-ken-handoff-semantics.py'):
  dest=root/'scripts'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/'scripts'/name,dest)
 source=root/'art-source/roster-idle';source.mkdir(parents=True)
 shutil.copyfile(ROOT/'art-source/roster-idle/batch.json',source/'batch.json')
 shutil.copytree(ROOT/('art-source/roster-idle/'+slug),source/slug)
 runtime=root/('public/art/animation-hq/'+slug);shutil.copytree(ROOT/('public/art/animation-hq/'+slug),runtime)
 path=runtime/'manifest.json';data=json.loads(path.read_text())
 data['records']=[r for r in data['records'] if r['id']!=selected_kind]
 module=load(root/'scripts/build-roster-motions.py','chunli_fixture')
 module.update_frame_totals(data);path.write_text(json.dumps(data));(runtime/(selected_kind+'.webp')).unlink()
 prior=data['records'];binding={k:v for k,v in data.items() if k not in ('records','frameTotal','enabledFrameTotal','fullFrameTotal','bridgeFrameTotal')}
 art={r['id']:(runtime/(r['id']+'.webp')).read_bytes() for r in prior}
 def run(kind=selected_kind,runtime_only=False):
  with patch.object(sys,'argv',['build','--character',character,'--kind',kind,'--runtime' if runtime_only else '--install']),redirect_stdout(io.StringIO()),redirect_stderr(io.StringIO()):module.main()
 def snapshot():return {p.name:p.read_bytes() for p in runtime.iterdir()}
 def rejected(action,errors=(ValueError,)):
  before=snapshot()
  try:action()
  except errors:pass
  else:raise AssertionError('Invalid input accepted')
  assert snapshot()==before,'Rejected input modified runtime'
 for kind in ('idle','air','dash','stand-light'):rejected(lambda:run(kind),(SystemExit,))
 def rollback():
  before=snapshot();write=Path.write_bytes;failed=False
  def fail(p,payload):
   nonlocal failed
   if p==path and not failed:failed=True;raise OSError('injected manifest write')
   return write(p,payload)
  with patch.object(Path,'write_bytes',fail):
   try:run()
   except OSError:pass
   else:raise AssertionError('Write error swallowed')
  assert failed and before==snapshot(),'Failed install did not roll back'
 rollback();run();current=json.loads(path.read_text())
 assert [current[k] for k in ('frameTotal','enabledFrameTotal','fullFrameTotal','bridgeFrameTotal')]==[total,total,total,0]
 assert len(current['records'])==prior_count+1
 assert prior==current['records'][:-1] and current['records'][-1]['id']==selected_kind
 assert binding=={k:current[k] for k in binding}
 assert art=={name:(runtime/(name+'.webp')).read_bytes() for name in art}
 before=snapshot();rollback();run();assert snapshot()==before,'Reinstall not byte stable'
 run(runtime_only=True)
 rec=current['records'][-1];sheet=Image.open(runtime/(selected_kind+'.webp')).convert('RGBA')
 frames=[sheet.crop((i*width,0,(i+1)*width,448)) for i in range(count)]
 assert rec['sourceOrder']==order
 assert rec['sourceSha256']==hashlib.sha256((source/(slug+'/'+selected_kind+'-sheet.png')).read_bytes()).hexdigest().upper()
 guard=Image.open(runtime/'idle.webp').convert('RGBA').crop((0,0,384,448))
 baseline=int(np.nonzero(np.asarray(guard.getchannel('A'))>=32)[0].max())
 for frame in frames:assert int(np.nonzero(np.asarray(frame.getchannel('A'))>=32)[0].max())==baseline
 motion=module.module();motion.FRAME_W=width;motion.ROSTER_CHARACTER=character
 if character=='IBUKI' and selected_kind in ('guard','parry'):
  roots=[motion._foot_metrics(motion._binary_mask(f))[0] for f in frames]
  assert max(roots)-min(roots)<1,'Planted Ibuki defense root slides with changing arm silhouette'
 def negative(frames,label):assert not motion.semantic_qa(selected_kind,frames,motion.pose_qa(frames,selected_kind))['semanticQaPass'],label
 pad=Image.new('RGBA',(width,448));pad.alpha_composite(guard,((width-384)//2,0))
 if selected_kind=='stand-medium':
  wrong=frames.copy();wrong[1]=frames[3];wrong[3]=pad
  report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
  assert not report['checks']['actualContactReach'] and not report['semanticQaPass'],'Guard at actual Ken contact accepted despite compensating startup punch'
 if selected_kind=='stand-light-kick':
  punch=Image.open(runtime/'stand-medium.webp').convert('RGBA').crop((3*width,0,4*width,448))
  for substitute in (pad,punch):
   wrong=frames.copy();wrong[3]=substitute
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Guard or punch accepted as actual kick contact'
  for offset,check in [((18,0),'supportRootStable'),((0,-12),'supportBaselineStable')]:
   shifted=Image.new('RGBA',(width,448));shifted.alpha_composite(frames[3],offset);wrong=frames.copy();wrong[3]=shifted
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks'][check] and not report['semanticQaPass'],'Displaced support sole accepted'
 negative([pad]*count,'Static guard accepted')
 translated=[]
 for dx in {5:(0,-8,-16,-8,0),6:(0,-8,-16,-16,-8,0),7:(0,-8,-16,-16,-8,-4,0),8:(0,-8,-16,-16,-8,-4,0,0)}[count]:
  frame=Image.new('RGBA',(width,448));frame.alpha_composite(pad,(dx,0));translated.append(frame)
 negative(translated,'Translated guard accepted')
 if selected_kind=='dash-back':
  forward=Image.open(runtime/'dash.webp').convert('RGBA');wrong=[]
  for i in range(7):
   frame=Image.new('RGBA',(width,448));frame.alpha_composite(forward.crop((i*384,0,(i+1)*384,448)),(128,0));wrong.append(frame)
  negative(wrong,'Forward runner accepted as backward')
 original=path.read_bytes();bad=json.loads(original);bad['records'][-1].update({'facingRelativeDirection':'forward'} if selected_kind=='dash-back' else {'frames':count+1});path.write_text(json.dumps(bad))
 rejected(lambda:run(runtime_only=True));path.write_bytes(original)
 peer=runtime/'idle.webp';original=peer.read_bytes();peer.write_bytes(original+b'corrupt')
 rejected(run);peer.write_bytes(original)
 src=source/(slug+'/'+selected_kind+'-sheet.png');original=src.read_bytes();src.unlink()
 rejected(run,(FileNotFoundError,));src.write_bytes(original)
 # Both installed source metadata and files must remain unchanged after negatives.
 assert art=={name:(runtime/(name+'.webp')).read_bytes() for name in art}
print(character+'_'+selected_kind.upper()+'_INGEST_PASS')
