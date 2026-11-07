"""Reject punch substitutions and sliding/floating support feet in authored kicks."""
from pathlib import Path
import importlib.util
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_kick_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640

def check(frames):
 return motion.semantic_qa('stand-light-kick',frames,motion.pose_qa(frames,'stand-light-kick'))

for entry in builder.CONFIG:
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 sheet=Image.open(directory/'stand-light-kick.webp').convert('RGBA')
 frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(8)]
 assert check(frames)['semanticQaPass'],entry['slug']+' installed kick failed'
 punch=Image.open(directory/'stand-light.webp').convert('RGBA').crop((3*640,0,4*640,448))
 substituted=frames.copy();substituted[3]=punch
 report=check(substituted)
 assert not report['semanticQaPass'] and not (report['checks']['legReachPresent'] and report['checks']['raisedFootPresent']),'Punch accepted as a kick'
 for offset,failed_check in [((40,0),'supportRootStable'),((0,-40),'supportBaselineStable')]:
  displaced=frames.copy();shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[3],offset);displaced[3]=shifted
  assert not check(displaced)['checks'][failed_check],entry['slug']+' sliding/floating support accepted'
 repeated=[frames[0]]*8
 assert not check(repeated)['semanticQaPass'],'Static guard accepted as a kick'

print('ROSTER_KICK_SEMANTICS_PASS characters=6 punchSubstitutionRejected=True slidingAndFloatingSupportRejected=True staticGuardRejected=True')
