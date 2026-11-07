"""Reject weaker action substitutions and displaced support in authored 5HK."""
from pathlib import Path
import importlib.util
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_hk_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640

def check(frames):return builder.heavy_kick_semantic_qa(motion,frames,motion.pose_qa(frames,'stand-heavy-kick'))

for entry in builder.CONFIG:
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 sheet=Image.open(directory/'stand-heavy-kick.webp').convert('RGBA')
 frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(12)]
 assert check(frames)['semanticQaPass'],entry['slug']+' installed 5HK failed'
 for wrong_kind in ('stand-light','stand-light-kick'):
  wrong=Image.open(directory/(wrong_kind+'.webp')).convert('RGBA').crop((3*640,0,4*640,448))
  substituted=frames.copy();substituted[5]=substituted[6]=wrong
  assert not check(substituted)['semanticQaPass'],entry['slug']+' punch/low kick accepted as 5HK'
 for offset,failed_check in [((40,0),'supportRootStable'),((0,-40),'supportBaselineStable')]:
  displaced=frames.copy();shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[5],offset);displaced[5]=shifted
  assert not check(displaced)['checks'][failed_check],entry['slug']+' displaced support accepted'
 assert not check([frames[0]]*12)['semanticQaPass'],'Static guard accepted as 5HK'

print('ROSTER_HEAVY_KICK_SEMANTICS_PASS characters=6 punchAndLowKickRejected=True displacedSupportRejected=True staticGuardRejected=True')
