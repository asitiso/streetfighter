"""Supplemental authored-motion provenance, preservation, semantic negatives and atomic writes."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from contextlib import redirect_stdout,redirect_stderr
import importlib.util,io,json,shutil,sys,hashlib,argparse
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--character',choices=['CHUNLI','IBUKI','KEN','RYU','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'],default='CHUNLI');parser.add_argument('--kind',choices=['genei-jin-install','tanden-renki','abare-tosanami','stun-gun-headbutt','rocket-uppercut','you-hou','sourai-rengeki','rolling-thunder','boomerang-raid','hyper-bomb','genei-jin','seichusen-godanzuki','seraphic-storm','aegis-reflector','corkscrew-blow','tsurugi','lariat-rush','shoulder-tackle','palm-rush','hayate','machine-gun-blow','ducking-straight','slash-elbow','flash-chop','tatsumaki','shoryuken','hadoken','crouch-heavy-kick','crouch-medium-kick','crouch-light-kick','crouch-heavy','crouch-medium','crouch-light','crouch','dash-back','guard','parry','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick'],default='dash-back');args=parser.parse_args();character=args.character;selected_kind=args.kind
supported={'GILL':('hadoken','shoryuken','lariat-rush','seraphic-storm'),'URIEN':('hadoken','shoryuken','shoulder-tackle','aegis-reflector'),'YUN':('shoulder-tackle','palm-rush','shoryuken','genei-jin','sourai-rengeki','you-hou','genei-jin-install'),'MAKOTO':('hayate','shoryuken','tsurugi','seichusen-godanzuki','abare-tosanami','tanden-renki'),'DUDLEY':('ducking-straight','machine-gun-blow','shoryuken','corkscrew-blow','rolling-thunder','rocket-uppercut'),'ALEX':('flash-chop','slash-elbow','shoryuken','hyper-bomb','boomerang-raid','stun-gun-headbutt'),'RYU':('hadoken','shoryuken','tatsumaki'),'CHUNLI':('crouch-heavy-kick','crouch-medium-kick','crouch-light-kick','crouch-heavy','crouch-medium','crouch-light','crouch','dash-back','guard','parry','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick'),'IBUKI':('crouch-heavy-kick','crouch-medium-kick','crouch-light-kick','crouch-heavy','crouch-medium','crouch-light','crouch','dash-back','guard','parry','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick'),'KEN':('dash-back','stand-medium','stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch','crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick')}
if selected_kind not in supported[character]:parser.error('Unsupported supplemental character/kind')
count,width,order={'genei-jin-install':(12,640,[1,2,3,4,4,5,5,6,6,7,1,1]),'tanden-renki':(12,640,[1,2,3,3,4,5,5,6,6,7,1,1]),'abare-tosanami':(16,640,[1,2,2,3,4,3,4,5,5,5,5,5,6,7,7,1]),'stun-gun-headbutt':(12,640,[1,2,2,3,3,4,4,5,6,7,7,1]),'rocket-uppercut':(12,640,[1,2,3,3,4,4,5,5,6,7,7,1]),'you-hou':(12,640,[1,2,3,4,4,3,5,5,6,7,1,1]),'sourai-rengeki':(16,640,[1,2,3,4,3,4,3,4,5,5,5,5,6,7,1,1]),'rolling-thunder':(16,640,[1,2,3,4,3,4,3,4,5,5,5,5,6,7,1,1]),'boomerang-raid':(12,640,[1,2,3,4,3,5,5,5,6,7,1,1]),'hyper-bomb':(12,640,[1,2,2,3,4,4,5,5,6,6,1,1]),'genei-jin':(12,640,[1,2,3,2,3,4,4,4,5,6,1,1]),'seichusen-godanzuki':(12,640,[1,2,3,4,3,4,5,5,6,7,1,1]),'seraphic-storm':(12,640,[1,2,3,3,4,4,5,5,1,1,1,1]),'aegis-reflector':(12,640,[1,2,2,3,4,4,5,5,1,1,1,1]),'corkscrew-blow':(12,640,[1,2,3,4,4,5,6,6,7,7,1,1]),'tsurugi':(12,640,[1,1,2,3,4,4,5,5,1,1,1,1]),'lariat-rush':(12,640,[1,1,2,3,4,4,5,6,7,7,1,1]),'shoulder-tackle':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'palm-rush':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'hayate':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'machine-gun-blow':(12,640,[1,2,3,4,5,3,4,5,3,5,6,6]),'ducking-straight':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'slash-elbow':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'flash-chop':(12,640,[1,1,2,3,4,4,5,5,6,6,6,6]),'tatsumaki':(12,640,[1,2,3,3,4,4,5,5,6,7,8,8]),'shoryuken':(12,640,[1,2,2,3,3,4,4,5,6,7,7,8]),'hadoken':(12,640,[1,1,2,2,3,4,4,5,5,6,6,6]),'crouch-heavy-kick':(12,640,[1,1,2,3,3,4,4,5,5,6,6,6]),'crouch-medium-kick':(10,640,[1,1,2,3,4,4,5,5,6,6]),'crouch-light-kick':(8,640,[1,2,3,4,5,5,6,6]),'crouch-heavy':(10,640,[1,1,2,3,4,4,5,5,6,6]),'crouch-medium':(8,640,[1,2,3,4,5,5,6,6]),'crouch-light':(7,640,[1,2,3,4,5,5,6]),'crouch':(6,384,[1,2,2,3,3,4]),'dash-back':(7,640,[1,2,3,3,4,5,6]),'guard':(5,384,[2,2,3,3,4]),'parry':(6,384,[1,2,3,3,4,4]),'stand-medium':(8,640,[1,2,3,4,5,5,6,6]),'stand-light-kick':(8,640,[1,2,3,4,5,5,6,6]),'stand-medium-kick':(10,640,[1,1,2,3,4,4,5,5,6,6]),'stand-heavy-kick':(12,640,[1,1,2,3,3,4,4,5,5,6,6,6])}[selected_kind]
if character in ('MAKOTO','GILL','YUN','URIEN','ALEX') and selected_kind=='shoryuken':order[-1]=1
if character=='URIEN' and selected_kind=='shoulder-tackle':order[-4:]=[1,1,1,1]
slug=character.lower();prior_count={'GILL':33,'URIEN':33,'YUN':36,'MAKOTO':35,'DUDLEY':35,'ALEX':35,'RYU':32,'CHUNLI':35,'IBUKI':34,'KEN':33}[character];total={'GILL':307,'URIEN':307,'YUN':347,'MAKOTO':335,'DUDLEY':335,'ALEX':331,'RYU':297,'CHUNLI':335,'IBUKI':321,'KEN':311}[character]
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
 for kind in (('idle','air','dash') if character=='RYU' else ('idle','air','dash','stand-light')):rejected(lambda:run(kind),(SystemExit,))
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
 if (character=='URIEN' and selected_kind=='aegis-reflector') or (character=='GILL' and selected_kind=='seraphic-storm'):
  assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Aegis must return to exact original guard'
  boxes=[f.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox() for f in frames];heights=[b[3]-b[1] for b in boxes]
  assert all(.94<=heights[i]/heights[0]<=1.03 for i in (6,7)),'Aegis recovery must preserve original body scale'
 if (character=='DUDLEY' and selected_kind in ('corkscrew-blow','rolling-thunder')) or (character=='MAKOTO' and selected_kind=='seichusen-godanzuki') or (character=='YUN' and selected_kind in ('genei-jin','sourai-rengeki','you-hou')) or (character=='ALEX' and selected_kind in ('hyper-bomb','boomerang-raid')):
  assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Corkscrew must close on exact original guard'
  heights=[f.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox() for f in frames]
  heights=[b[3]-b[1] for b in heights]
  assert all(.94<=heights[i]/heights[0]<=1.03 for i in ((12,13) if selected_kind in ('rolling-thunder','sourai-rengeki') else (8,9))),'Nearly upright recovery must keep original body scale, not shrink then pop to guard'
 if selected_kind in ('tanden-renki','genei-jin-install'):
  heights=[f.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox() for f in frames];heights=[b[3]-b[1] for b in heights]
  assert all(.94<=heights[i]/heights[0]<=1.03 for i in (7,8,9)),'Activation recovery must not shrink before guard return'
 if character=='MAKOTO' and selected_kind=='tsurugi':assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Tsurugi must close on exact original guard'
 if character=='GILL' and selected_kind=='lariat-rush':assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Lariat must close on exact original guard'
 if character=='URIEN' and selected_kind=='shoulder-tackle':assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Charging Tackle must close on exact original guard'
 if character in ('MAKOTO','GILL','YUN','URIEN','ALEX') and selected_kind=='shoryuken':assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Uppercut must return to the exact original guard silhouette'
 assert rec['sourceSha256']==hashlib.sha256((source/(slug+'/'+selected_kind+'-sheet.png')).read_bytes()).hexdigest().upper()
 if (character in ('DUDLEY','GILL','YUN') and selected_kind=='shoryuken') or (character=='DUDLEY' and selected_kind=='corkscrew-blow') or (character=='URIEN' and selected_kind=='aegis-reflector') or (character=='ALEX' and selected_kind=='boomerang-raid') or (character=='DUDLEY' and selected_kind=='rolling-thunder') or (character=='MAKOTO' and selected_kind=='tanden-renki'):
  if selected_kind=='shoryuken':assert rec['sourceOverrides'][0]['frames']==[6,7] and rec['sourceOverrides'][0]['sourcePose']==4
  elif selected_kind=='rolling-thunder':
   assert len(rec['sourceOverrides'])==1
   fix=rec['sourceOverrides'][0]
   assert fix['frames']==[13] and fix['sourcePose']==2 and fix['sourceGrid']==[2,1] and fix['referencePose']==1 and fix['referenceScaleMode']=='source-guard-height'
  elif selected_kind=='tanden-renki':
   assert len(rec['sourceOverrides'])==2
   for ordinal,fix in enumerate(rec['sourceOverrides']):
    assert fix['frames']==([8,9] if ordinal==0 else [10]) and fix['sourcePose']==2+ordinal and fix['sourceGrid']==[2,2] and fix['referencePose']==1 and fix['referenceScaleMode']=='source-guard-height'
  elif selected_kind=='boomerang-raid':
   assert len(rec['sourceOverrides'])==2
   for ordinal,fix in enumerate(rec['sourceOverrides']):
    assert fix['frames']==[9+ordinal] and fix['sourcePose']==2+ordinal and fix['sourceGrid']==[2,2] and fix['referencePose']==1 and fix['referenceScaleMode']=='source-guard-height'
  else:
   fix=rec['sourceOverrides'][0]
   assert fix['frames']==([7,8] if selected_kind=='aegis-reflector' else [9,10]) and fix['sourcePose']==2 and fix['sourceGrid']==[2,1] and fix['referencePose']==1 and fix['referenceScaleMode']=='source-guard-height'
  for override in rec['sourceOverrides']:
   peer=root/override['source'];saved=peer.read_bytes()
   assert override['sourceSha256']==hashlib.sha256(saved).hexdigest().upper()
   peer.write_bytes(b'incomplete corrected rise')
   rejected(run,(OSError,));peer.write_bytes(saved)
   peer.unlink();rejected(run,(FileNotFoundError,));peer.write_bytes(saved)
 if selected_kind in ('stun-gun-headbutt','abare-tosanami','tanden-renki','genei-jin-install'):assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Headbutt must return to exact guard'
 if selected_kind=='rocket-uppercut':assert frames[0].getchannel('A').tobytes()==frames[-1].getchannel('A').tobytes(),'Rocket Uppercut must return to exact guard'
 guard=Image.open(runtime/'idle.webp').convert('RGBA').crop((0,0,384,448))
 if selected_kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):guard=Image.open(runtime/'crouch.webp').convert('RGBA').crop((5*384,0,6*384,448))
 baseline=int(np.nonzero(np.asarray(guard.getchannel('A'))>=32)[0].max())
 for index,frame in enumerate(frames):
  if (((selected_kind in ('shoryuken','stun-gun-headbutt') and 3<=index<=8) or (selected_kind=='abare-tosanami' and 3<=index<=12)) or (selected_kind=='rocket-uppercut' and 2<=index<=8)) or (selected_kind=='tatsumaki' and 1<=index<=9):continue
  assert int(np.nonzero(np.asarray(frame.getchannel('A'))>=32)[0].max())==baseline
 if selected_kind=='tatsumaki':
  mask=np.asarray(frames[0].getchannel('A'))>=32;ys,_=np.nonzero(mask);band=round(float(ys.min())+.25*float(ys.max()-ys.min()))
  heads=[float(np.nonzero((np.asarray(frames[i].getchannel('A'))>=32)[:band])[1].mean()) for i in range(1,10)]
  assert np.ptp(heads)<=2,'Rotating torso slides with extended-leg bounding box'
  assert rec['sourceGrid']==[2,4] and rec['normalization']['groundedFrames']==[1,11,12]
  assert all(int(np.nonzero(np.asarray(frames[i].getchannel('A'))>=32)[0].max())!=baseline for i in range(1,10)),'Spin art grounded by normalization'
 if selected_kind in ('shoryuken','rocket-uppercut','stun-gun-headbutt','abare-tosanami'):
  assert rec['sourceGrid']==[2,4] and rec['normalization']['groundedFrames']==([1,2,10,11,12] if selected_kind=='rocket-uppercut' else [1,2,3,14,15,16] if selected_kind=='abare-tosanami' else [1,2,3,10,11,12])
  assert all(int(np.nonzero(np.asarray(frames[i].getchannel('A'))>=32)[0].max())!=baseline for i in range(2 if selected_kind=='rocket-uppercut' else 3,13 if selected_kind=='abare-tosanami' else 9)),'Air art grounded by normalization'
 motion=module.module();motion.FRAME_W=width;motion.ROSTER_CHARACTER=character
 if selected_kind=='crouch':
  assert rec['sourceGrid']==[2,2]
  assert rec['normalization']['reference']=='idle-standing-height' and rec['normalization']['standingReferenceFrame']==1
  assert rec['normalization']['footAnchorMode']=='two-foot'
 if character=='IBUKI' and selected_kind in ('guard','parry'):
  roots=[motion._foot_metrics(motion._binary_mask(f))[0] for f in frames]
  assert max(roots)-min(roots)<1,'Planted Ibuki defense root slides with changing arm silhouette'
 def negative(frames,label):assert not motion.semantic_qa(selected_kind,frames,motion.pose_qa(frames,selected_kind))['semanticQaPass'],label
 pad=Image.new('RGBA',(width,448));pad.alpha_composite(guard,((width-384)//2,0))
 if selected_kind=='tatsumaki':
  punch=Image.open(runtime/'stand-medium.webp').convert('RGBA').crop((3*width,0,4*width,448))
  low=Image.open(runtime/'crouch-medium-kick.webp').convert('RGBA').crop((4*width,0,5*width,448))
  for contact in range(3,9):
   for substitute in (pad,punch,low):
    wrong=frames.copy();wrong[contact]=substitute
    report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
    assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Wrong action accepted at spinning contact'
 if selected_kind=='tsurugi':
  for contact in (4,5):
   wrong=frames.copy();wrong[1]=frames[4];wrong[contact]=pad
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Guard at descending kick contact accepted'
 if selected_kind in ('you-hou','sourai-rengeki','rolling-thunder','boomerang-raid','hyper-bomb','genei-jin','seichusen-godanzuki','corkscrew-blow','lariat-rush','shoulder-tackle','palm-rush','hayate','machine-gun-blow','ducking-straight','flash-chop','slash-elbow'):
  for contact in (tuple(range(2,12)) if selected_kind in ('rolling-thunder','sourai-rengeki') else (3,4,5) if selected_kind=='hyper-bomb' else (1,2,3,4,5,6,7) if selected_kind=='genei-jin' else (3,6) if selected_kind=='machine-gun-blow' else (2,3,4,5,6,7) if selected_kind in ('corkscrew-blow','seichusen-godanzuki','boomerang-raid','you-hou') else (4,5,6,7) if selected_kind=='lariat-rush' else (4,5)):
   wrong=frames.copy();wrong[1]=frames[3 if selected_kind=='machine-gun-blow' else 4];wrong[contact]=pad
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Guard at grounded special contact accepted despite compensating startup'
 if selected_kind=='machine-gun-blow':
  duck=Image.open(runtime/'ducking-straight.webp').convert('RGBA').crop((4*width,0,5*width,448))
  for contact in (3,6):
   wrong=frames.copy();wrong[contact]=duck
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks'].get('uprightContact',True) and not report['semanticQaPass'],'Ducking punch accepted as upright barrage contact'
 if selected_kind=='ducking-straight':
  standing=Image.open(runtime/'stand-heavy.webp').convert('RGBA').crop((5*width,0,6*width,448))
  for contact in (4,5):
   wrong=frames.copy();wrong[contact]=standing
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks'].get('duckedContact',True) and not report['semanticQaPass'],'Standing punch accepted as ducking contact'
 if selected_kind=='slash-elbow':
  chop=Image.open(runtime/'flash-chop.webp').convert('RGBA').crop((4*width,0,5*width,448))
  for contact in (4,5):
   wrong=frames.copy();wrong[contact]=chop
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks'].get('leadingElbowHeight',True) and not report['semanticQaPass'],'Low open-hand chop accepted as a high elbow contact'
 if selected_kind in ('shoryuken','rocket-uppercut','stun-gun-headbutt','abare-tosanami'):
  for contact in ((2,3,4,5,6,7) if selected_kind=='rocket-uppercut' else (3,4,5,6,7) if selected_kind=='stun-gun-headbutt' else tuple(range(3,12)) if selected_kind=='abare-tosanami' else (4,5,6,7)):
   wrong=frames.copy();wrong[1]=frames[4];wrong[contact]=pad
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Guard at uppercut contact accepted'
 if selected_kind=='genei-jin-install':
  palm=Image.open(runtime/'palm-rush.webp').convert('RGBA').crop((4*width,0,5*width,448))
  basic=Image.open(runtime/'genei-jin.webp').convert('RGBA').crop((3*width,0,4*width,448))
  for focus in (2,3,4):
   for substitute in (pad,palm,basic):
    wrong=frames.copy();wrong[focus]=substitute
    report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
    assert not report['checks']['actualFocusPoses'] and not report['semanticQaPass'],'Neutral or attack art accepted as install focus'
 if selected_kind=='tanden-renki':
  defense=Image.open(runtime/'guard.webp').convert('RGBA').crop((2*384,0,3*384,448));brace=Image.new('RGBA',(width,448));brace.alpha_composite(defense,((width-384)//2,0))
  punch=Image.open(runtime/'hayate.webp').convert('RGBA').crop((4*width,0,5*width,448))
  for charge in (3,4,5,6):
   for substitute in (pad,brace,punch):
    wrong=frames.copy();wrong[charge]=substitute
    report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
    assert not report['checks']['actualChargePoses'] and not report['semanticQaPass'],'Guard or punch accepted as power activation'
 if selected_kind=='abare-tosanami':
  ground=Image.open(runtime/'tsurugi.webp').convert('RGBA').crop((4*width,0,5*width,448))
  upper=Image.open(runtime/'shoryuken.webp').convert('RGBA').crop((5*width,0,6*width,448))
  for contact in range(3,12):
   for substitute in (ground,upper):
    wrong=frames.copy();wrong[contact]=substitute
    report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
    assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Ground kick or uppercut accepted as leaping kick contact'
 if selected_kind=='stun-gun-headbutt':
  grounded_grab=Image.open(runtime/'hyper-bomb.webp').convert('RGBA').crop((3*width,0,4*width,448))
  for contact in (3,4,5,6,7):
   wrong=frames.copy();wrong[contact]=grounded_grab
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Grounded grab accepted as airborne headbutt contact'
 if selected_kind in ('hadoken','aegis-reflector','seraphic-storm'):
  for contact in ((2,3) if selected_kind=='seraphic-storm' else (4,5) if selected_kind=='aegis-reflector' else (5,6)):
   wrong=frames.copy();wrong[1]=frames[5];wrong[contact]=pad
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualReleasePoses'] and not report['semanticQaPass'],'Guard at actual release accepted'
 if selected_kind=='crouch-heavy':
  assert rec['semanticProfile']=='strike'
  for contact in (4,5):
   wrong=frames.copy();wrong[1]=frames[4];wrong[contact]=pad
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Lowguard accepted at heavy contact '+str(contact)
 if selected_kind in ('stand-medium','crouch-light','crouch-medium'):
  wrong=frames.copy();wrong[1]=frames[3];wrong[3]=pad
  report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
  assert not report['checks']['actualContactReach' if selected_kind=='stand-medium' else 'actualContactPoses'] and not report['semanticQaPass'],'Guard at actual strike contact accepted despite compensating startup attack'
 if selected_kind in ('stand-light-kick','stand-medium-kick','stand-heavy-kick','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
  contacts={'crouch-heavy-kick':(5,6),'crouch-medium-kick':(4,5),'crouch-light-kick':(3,),'stand-light-kick':(3,),'stand-medium-kick':(4,5),'stand-heavy-kick':(5,6)}[selected_kind]
  punch=Image.open(runtime/'stand-medium.webp').convert('RGBA').crop((3*width,0,4*width,448))
  substitutes=[pad,punch]
  if selected_kind in ('crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
   for name,index in [('crouch-medium',3),('stand-heavy-kick',5)]:
    peer=Image.open(runtime/(name+'.webp')).convert('RGBA');substitutes.append(peer.crop((index*width,0,(index+1)*width,448)))
  if selected_kind=='stand-heavy-kick':
   for name,index in [('stand-light-kick',3)]:
    peer=Image.open(runtime/(name+'.webp')).convert('RGBA');substitutes.append(peer.crop((index*width,0,(index+1)*width,448)))
  for substitute in substitutes:
   for contact in contacts:
    wrong=frames.copy();wrong[contact]=substitute
    if selected_kind in ('crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):wrong[1]=frames[contacts[0]]
    report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
    assert not report['checks']['actualContactPoses'] and not report['semanticQaPass'],'Wrong action accepted as actual kick contact '+str(contact)
  for offset,check in [((18,0),'supportRootStable'),((0,-12),'supportBaselineStable')]:
   shifted=Image.new('RGBA',(width,448));shifted.alpha_composite(frames[contacts[0]],offset);wrong=frames.copy();wrong[contacts[0]]=shifted
   report=motion.semantic_qa(selected_kind,wrong,motion.pose_qa(wrong,selected_kind))
   assert not report['checks'][check] and not report['semanticQaPass'],'Displaced support sole accepted'
 if selected_kind=='crouch':negative(list(reversed(frames)),'Rising strip accepted as crouch entry')
 negative([pad]*count,'Static guard accepted')
 translated=[]
 for dx in {5:(0,-8,-16,-8,0),6:(0,-8,-16,-16,-8,0),7:(0,-8,-16,-16,-8,-4,0),8:(0,-8,-16,-16,-8,-4,0,0),10:(0,-8,-16,-16,-8,-4,0,0,0,0),12:(0,-8,-16,-16,-8,-4,0,0,0,0,0,0),16:(0,-8,-16,-16,-8,-4,0,0,0,0,0,0,0,0,0,0)}[count]:
  frame=Image.new('RGBA',(width,448));frame.alpha_composite(pad,(dx,0));translated.append(frame)
 negative(translated,'Translated guard accepted')
 if selected_kind=='dash-back':
  forward=Image.open(runtime/'dash.webp').convert('RGBA');wrong=[]
  for i in range(7):
   frame=Image.new('RGBA',(width,448));frame.alpha_composite(forward.crop((i*384,0,(i+1)*384,448)),(128,0));wrong.append(frame)
  negative(wrong,'Forward runner accepted as backward')
 original=path.read_bytes();bad=json.loads(original);bad['records'][-1].update({'facingRelativeDirection':'forward'} if selected_kind=='dash-back' else {'frames':count+1});path.write_text(json.dumps(bad))
 rejected(lambda:run(runtime_only=True));path.write_bytes(original)
 if selected_kind=='crouch-heavy':
  bad=json.loads(original);bad['records'][-1]['semanticProfile']='shoulder';path.write_text(json.dumps(bad))
  rejected(lambda:run(runtime_only=True));path.write_bytes(original)
 if selected_kind in ('stand-medium-kick','crouch-medium-kick'):
  assert rec['semanticProfile']=='kick'
  bad=json.loads(original);bad['records'][-1]['semanticProfile']='hook';path.write_text(json.dumps(bad))
  rejected(lambda:run(runtime_only=True));path.write_bytes(original)
 peer=runtime/('crouch.webp' if selected_kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else 'idle.webp');original=peer.read_bytes();peer.write_bytes(original+b'corrupt')
 rejected(run);peer.write_bytes(original)
 src=source/(slug+'/'+selected_kind+'-sheet.png');original=src.read_bytes();src.unlink()
 rejected(run,(FileNotFoundError,));src.write_bytes(original)
 # Both installed source metadata and files must remain unchanged after negatives.
 assert art=={name:(runtime/(name+'.webp')).read_bytes() for name in art}
print(character+'_'+selected_kind.upper()+'_INGEST_PASS')
