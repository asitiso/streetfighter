"""Reject static/forward substitutes for authored backward dashes."""
from pathlib import Path
import importlib.util
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('roster_backward_builder',ROOT/'scripts/build-roster-motions.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
motion=builder.module();motion.FRAME_W=640
for entry in builder.CONFIG:
 directory=ROOT/'public/art/animation-hq'/entry['slug']
 def frames_for(kind):
  sheet=Image.open(directory/f'{kind}.webp').convert('RGBA')
  return [sheet.crop((i*640,0,(i+1)*640,448)) for i in range(7)]
 def check(frames):
  return builder.backward_dash_semantic_qa(motion,frames,motion.pose_qa(frames,'dash-back'))
 frames=frames_for('dash-back')
 assert check(frames)['semanticQaPass'],entry['slug']+' installed backward dash failed'
 assert not check([frames[0]]*7)['semanticQaPass'],'Static guard accepted as dash'
 forward=check(frames_for('dash'))
 assert not forward['checks']['backwardDrivePresent'],entry['slug']+' forward drive accepted as backward'
 # Global translation cannot manufacture a backward posture relative to the feet.
 shifted=[]
 for i in range(7):
  image=Image.new('RGBA',(640,448));image.alpha_composite(frames[0],(-i*3,0));shifted.append(image)
 assert not check(shifted)['checks']['backwardDrivePresent'],'Translated static guard accepted as backward drive'
print('ROSTER_BACKWARD_DASH_SEMANTICS_PASS characters=6 storedFrames=42 staticAndForwardRejected=True translatedGuardRejected=True')
