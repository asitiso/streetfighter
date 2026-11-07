"""Reject standing punches, static low guards and displaced feet as 2LP art."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_clp_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
def check(frames):return builder.crouch_light_semantic_qa(motion,frames,motion.pose_qa(frames,'crouch-light'))
for entry in builder.CONFIG:
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 sheet=Image.open(directory/'crouch-light.webp').convert('RGBA')
 frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(7)]
 assert check(frames)['semanticQaPass'],entry['slug']+' installed 2LP failed'
 assert not check([frames[0]]*7)['semanticQaPass'],'Static low guard accepted'
 for offset in ((40,0),(0,-40)):
  shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[3],offset)
  displaced=frames[:3]+[shifted]+frames[4:]
  assert not check(displaced)['checks']['feetStayPlanted'],'Displaced feet accepted'
 standing=Image.open(directory/'stand-light.webp').convert('RGBA').crop((3*640,0,4*640,448))
 assert not check(frames[:3]+[standing]+frames[4:])['checks']['lowPostureMaintained'],'Standing contact accepted as crouching'
print('ROSTER_CROUCH_LIGHT_SEMANTICS_PASS characters=6 standingAndStaticRejected=True slidingAndFloatingFeetRejected=True')
