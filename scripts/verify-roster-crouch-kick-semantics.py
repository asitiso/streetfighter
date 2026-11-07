"""Reject punch/standing/static substitutions and sliding support feet as 2LK."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_crouch_kick_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
def check(frames):return builder.crouch_kick_semantic_qa(motion,frames,motion.pose_qa(frames,'crouch-light-kick'))
for entry in builder.CONFIG:
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 sheet=Image.open(directory/'crouch-light-kick.webp').convert('RGBA')
 frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(8)]
 assert check(frames)['semanticQaPass'],entry['slug']+' installed crouching kick failed'
 assert not check([frames[0]]*8)['semanticQaPass'],'Static low guard accepted'
 punch=Image.open(directory/'crouch-light.webp').convert('RGBA').crop((3*640,0,4*640,448))
 report=check(frames[:3]+[punch]+frames[4:])
 assert not report['semanticQaPass'] and not all(report['checks'][k] for k in ('legReachPresent','legArticulationPresent','raisedFootPresent')),'Crouching punch accepted as low kick'
 standing=Image.open(directory/'stand-light-kick.webp').convert('RGBA').crop((3*640,0,4*640,448))
 assert not check(frames[:3]+[standing]+frames[4:])['checks']['lowPostureMaintained'],'Standing kick accepted as crouching'
 for offset,failed_check in [((40,0),'supportRootStable'),((0,-40),'supportBaselineStable')]:
  shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[3],offset)
  assert not check(frames[:3]+[shifted]+frames[4:])['checks'][failed_check],'Sliding/floating support foot accepted'
print('ROSTER_CROUCH_KICK_SEMANTICS_PASS characters=6 storedFrames=48 punchAndStandingAndStaticRejected=True slidingAndFloatingSupportRejected=True')
