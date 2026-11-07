"""Reject wrong crouching MK actions, standing/static art and support drift."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_crouch_kick_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
def check(frames,kind,profile):
 pose=motion.pose_qa(frames,kind)
 return builder.crouch_medium_kick_semantic_qa(motion,frames,pose,profile) if kind=='crouch-medium-kick' else builder.crouch_kick_semantic_qa(motion,frames,pose)
for kind,count,contact,standing_kind in [('crouch-light-kick',8,3,'stand-light-kick'),('crouch-medium-kick',10,4,'stand-medium-kick')]:
 for entry in builder.CONFIG:
  profile=entry.get('attackRecipes',{}).get('stand-medium-kick',{}).get('semanticProfile','kick') if kind=='crouch-medium-kick' else 'kick'
  directory=ROOT/'public/art/animation-hq'/entry['slug']
  sheet=Image.open(directory/f'{kind}.webp').convert('RGBA')
  frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(count)]
  assert check(frames,kind,profile)['semanticQaPass'],entry['slug']+' installed '+kind+' failed'
  assert not check([frames[0]]*count,kind,profile)['semanticQaPass'],'Static low guard accepted'
  wrong_kind='crouch-light-kick' if profile=='hook' else 'crouch-light'
  wrong=Image.open(directory/f'{wrong_kind}.webp').convert('RGBA').crop((3*640,0,4*640,448))
  report=check(frames[:contact]+[wrong]+frames[contact+1:],kind,profile)
  assert not report['semanticQaPass'],entry['slug']+' wrong action accepted'
  standing=Image.open(directory/f'{standing_kind}.webp').convert('RGBA').crop((contact*640,0,(contact+1)*640,448))
  assert not check(frames[:contact]+[standing]+frames[contact+1:],kind,profile)['checks']['lowPostureMaintained'],'Standing action accepted as crouching'
  for offset,failed_check in [((40,0),'supportRootStable'),((0,-40),'supportBaselineStable')]:
   shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[contact],offset)
   assert not check(frames[:contact]+[shifted]+frames[contact+1:],kind,profile)['checks'][failed_check],'Sliding/floating support foot accepted'
  if kind=='crouch-medium-kick':
   try:check(frames,kind,'unknown')
   except ValueError:pass
   else:raise AssertionError('Unknown crouching MK profile accepted')
print('ROSTER_CROUCH_KICK_SEMANTICS_PASS characters=6 attackKinds=2 storedFrames=108 wrongActionAndStandingAndStaticRejected=True slidingAndFloatingSupportRejected=True invalidProfileRejected=True')
