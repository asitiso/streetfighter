"""Check character-specific 5MK art and reject wrong actions/support motion."""
from pathlib import Path
import importlib.util,json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_mk_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640

for entry in builder.CONFIG:
 profile=entry['attackRecipes']['stand-medium-kick']['semanticProfile']
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 record=next(r for r in json.loads((directory/'manifest.json').read_text())['records'] if r['id']=='stand-medium-kick')
 assert record['semanticProfile']==profile
 sheet=Image.open(directory/'stand-medium-kick.webp').convert('RGBA')
 frames=[sheet.crop((i*640,0,(i+1)*640,448)) for i in range(10)]
 def check(poses):return builder.medium_kick_semantic_qa(motion,poses,motion.pose_qa(poses,'stand-medium-kick'),profile)
 assert check(frames)['semanticQaPass'],entry['slug']+' installed 5MK failed'
 wrong_kind='stand-light-kick' if profile=='hook' else 'stand-light'
 wrong=Image.open(directory/(wrong_kind+'.webp')).convert('RGBA').crop((3*640,0,4*640,448))
 substituted=frames.copy();substituted[4]=substituted[5]=wrong
 assert not check(substituted)['semanticQaPass'],entry['slug']+' wrong action accepted'
 for offset,failed_check in [((40,0),'supportRootStable'),((0,-40),'supportBaselineStable')]:
  displaced=frames.copy();shifted=Image.new('RGBA',(640,448));shifted.alpha_composite(frames[4],offset);displaced[4]=shifted
  assert not check(displaced)['checks'][failed_check],entry['slug']+' displaced support accepted'
 assert not check([frames[0]]*10)['semanticQaPass'],'Static guard accepted as 5MK'

print('ROSTER_MEDIUM_KICK_SEMANTICS_PASS characters=6 wrongActionRejected=True displacedSupportRejected=True staticGuardRejected=True')
