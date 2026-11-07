"""Shared crouching punches reject static, standing and displaced-foot art."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_crouch_attack_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
def check(frames,kind,profile='strike'):return builder.crouch_attack_semantic_qa(motion,frames,motion.pose_qa(frames,kind),kind,profile)
for kind,count,standing_kind,contact in [('crouch-light',7,'stand-light',3),('crouch-medium',8,'stand-medium',3),('crouch-heavy',10,'stand-heavy',5)]:
 for entry in builder.CONFIG:
  profile=entry.get('attackRecipes',{}).get('crouch-heavy',{}).get('semanticProfile','strike') if kind=='crouch-heavy' else 'strike'
  directory=ROOT/'public/art/animation-hq'/entry['slug']
  sheet=Image.open(directory/f'{kind}.webp').convert('RGBA')
  frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(count)]
  report=check(frames,kind,profile)
  assert report['semanticQaPass'],entry['slug']+' installed '+kind+' failed'
  assert not check([frames[0]]*count,kind,profile)['semanticQaPass'],'Static low guard accepted'
  if kind!='crouch-light':
   if kind=='crouch-medium':assert 24<=report['upperContactReachDelta']<=105
   elif profile=='shoulder':assert 7<=report['upperContactDriveDelta']<=62
   else:assert 38<=report['upperContactReachDelta']<=145
   # Moving only the head/above-band region must not masquerade as contact drive.
   top=report['upperBand'][0];head_only=frames[0].copy()
   head_only.paste((0,0,0,0),(0,0,640,top))
   head_only.alpha_composite(frames[0].crop((0,0,640,top)),(45,0))
   assert not check(frames[:contact]+[head_only]+frames[contact+1:],kind,profile)['checks']['attackReachPresent'],'Head-only advance accepted as an attack'
  for offset in ((40,0),(0,-40)):
   shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[contact],offset)
   displaced=frames[:contact]+[shifted]+frames[contact+1:]
   assert not check(displaced,kind,profile)['checks']['feetStayPlanted'],'Displaced feet accepted'
  standing=Image.open(directory/f'{standing_kind}.webp').convert('RGBA').crop((contact*640,0,(contact+1)*640,448))
  assert not check(frames[:contact]+[standing]+frames[contact+1:],kind,profile)['checks']['lowPostureMaintained'],'Standing contact accepted as crouching'
  if kind=='crouch-heavy':
   try:check(frames,kind,'unknown')
   except ValueError:pass
   else:raise AssertionError('Unknown heavy semantic profile accepted')
print('ROSTER_CROUCH_ATTACK_SEMANTICS_PASS characters=6 attackKinds=3 storedFrames=150 headOnlyAndStandingAndStaticRejected=True slidingAndFloatingFeetRejected=True invalidProfileRejected=True')
