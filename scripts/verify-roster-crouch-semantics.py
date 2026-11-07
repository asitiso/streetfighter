"""Reject static/shrunken sprites and sliding/floating feet as crouch art."""
from pathlib import Path
import importlib.util
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_crouch_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module()
def check(frames):return builder.crouch_semantic_qa(motion,frames,motion.pose_qa(frames,'crouch'))

for entry in builder.CONFIG:
 sheet=Image.open(ROOT/'public/art/animation-hq'/entry['slug']/'crouch.webp').convert('RGBA')
 frames=[sheet.crop((i*384,0,(i+1)*384,448)) for i in range(6)]
 assert check(frames)['semanticQaPass'],entry['slug']+' installed crouch failed'
 assert not check([frames[0]]*6)['semanticQaPass'],'Static standing sprite accepted'
 for offset in ((40,0),(0,-40)):
  shifted=Image.new('RGBA',(384,448));shifted.alpha_composite(frames[-1],offset)
  displaced=frames[:-1]+[shifted]
  assert not check(displaced)['checks']['feetStayPlanted'],entry['slug']+' displaced feet accepted'
 body=frames[0].crop(frames[0].getbbox());body=body.resize((round(body.width*.65),round(body.height*.65)),Image.Resampling.LANCZOS)
 shrunken=Image.new('RGBA',(384,448));shrunken.alpha_composite(body,(192-body.width//2,423-body.height))
 assert not check([frames[0]]*5+[shrunken])['semanticQaPass'],'Uniformly shrunken standing sprite accepted as crouch'

print('ROSTER_CROUCH_SEMANTICS_PASS characters=6 staticAndShrinkRejected=True slidingAndFloatingFeetRejected=True')
