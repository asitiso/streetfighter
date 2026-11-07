"""Shared crouching LP/MP gates reject standing, static and displaced-foot art."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_crouch_attack_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
def check(frames,kind):return builder.crouch_attack_semantic_qa(motion,frames,motion.pose_qa(frames,kind),kind)
for kind,count,standing_kind in [('crouch-light',7,'stand-light'),('crouch-medium',8,'stand-medium')]:
 for entry in builder.CONFIG:
  directory=ROOT/'public/art/animation-hq'/entry['slug']
  sheet=Image.open(directory/f'{kind}.webp').convert('RGBA')
  frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(count)]
  assert check(frames,kind)['semanticQaPass'],entry['slug']+' installed '+kind+' failed'
  assert not check([frames[0]]*count,kind)['semanticQaPass'],'Static low guard accepted'
  if kind=='crouch-medium':
   report=check(frames,kind);assert 24<=report['upperContactReachDelta']<=105
   # Moving the head alone must not masquerade as arm/elbow reach.
   top=report['upperBand'][0];head_only=frames[0].copy()
   head_only.paste((0,0,0,0),(0,0,640,top))
   head_only.alpha_composite(frames[0].crop((0,0,640,top)),(45,0))
   assert not check(frames[:3]+[head_only]+frames[4:],kind)['checks']['attackReachPresent'],'Head-only advance accepted as an arm strike'
  for offset in ((40,0),(0,-40)):
   shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[3],offset)
   displaced=frames[:3]+[shifted]+frames[4:]
   assert not check(displaced,kind)['checks']['feetStayPlanted'],'Displaced feet accepted'
  standing=Image.open(directory/f'{standing_kind}.webp').convert('RGBA').crop((3*640,0,4*640,448))
  assert not check(frames[:3]+[standing]+frames[4:],kind)['checks']['lowPostureMaintained'],'Standing contact accepted as crouching'
print('ROSTER_CROUCH_ATTACK_SEMANTICS_PASS characters=6 attackKinds=2 storedFrames=90 standingAndStaticRejected=True slidingAndFloatingFeetRejected=True')
