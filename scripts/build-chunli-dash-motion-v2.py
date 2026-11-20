import os,sys,json,importlib.util,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
from argparse import ArgumentParser
parser=ArgumentParser();parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
if args.install and args.runtime:parser.error('Choose install or runtime')
from PIL import Image
import numpy as np
spec=importlib.util.spec_from_file_location('dash_tools',root/'scripts/build-dash-motion-v2.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
roster=d.load_roster();motion=roster.module();source=root/'art-source/dash-motion-v2/chunli';raw=d.extract_sheet(Image.open(source/'generated-sheet-v1.png'));assert len(raw)==8
old=d.frames_from((source/'previous-dash.webp').read_bytes());motion.FRAME_W=384;old_pose=motion.pose_qa(old,'dash');old_semantic=motion.semantic_qa('dash',old,old_pose)
old_clipped=[]
for i,f in enumerate(old):
 m=np.array(f.getchannel('A'))>32
 if m[0].any() or m[-1].any() or m[:,0].any() or m[:,-1].any():old_clipped.append(i)
assert len(old)==7,'Existing dash has seven frames'
width=384;motion.FRAME_W=width;motion.ROSTER_CHARACTER='CHUNLI';idle=Image.open(root/'public/art/animation-hq/chunli/idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();idle_height=box[3]-box[1];heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[0];motion.TARGET_HEIGHT['dash']=idle_height*float(np.median(heights))/reference_height
keys,metrics=motion.normalize_frames('dash',raw);target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0];dx=round(target_x-motion._foot_metrics(np.array(keys[0].getchannel('A'))>24)[0]);shifts=[]
for i,f in enumerate(keys):
 dy=target_y-int(np.nonzero(motion._binary_mask(f))[0].max());aligned=Image.new('RGBA',(width,448));aligned.alpha_composite(f,(dx,dy));keys[i]=aligned;shifts.append([dx,dy])
frames=keys[1:];pose,semantic,bridges=d.evaluate(roster,motion,'chunli',frames);data,encoding=d.pack(frames,1000000);d.evaluate(roster,motion,'chunli',d.frames_from(data))

report={'passed':True,'character':'CHUNLI','source':'art-source/dash-motion-v2/chunli/generated-sheet-v1.png','sourceSha256':d.sha((source/'generated-sheet-v1.png').read_bytes()),'runtimeSha256':d.sha(data),'bytes':len(data),'frameSize':[384,448],'frames':7,'oldClippedFrames':old_clipped,'oldSemantic':old_semantic,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'encoding':encoding,'normalization':{'referenceHeight':idle_height,'sourceReferenceHeight':reference_height,'uniformScale':idle_height/reference_height,'footAnchorX':target_x,'footBaseline':target_y,'sourceShifts':shifts},'sourceMetrics':metrics,'decodedMemoryDelta':0}
assert semantic['centroidStepMax']<old_semantic['centroidStepMax'],'New sequence must reduce largest centroid step'
assert all(abs(m['scaledSize'][1]-m['sourceBodyHeight']*idle_height/reference_height)<=1 for m in metrics),'All poses use one anatomical scale'
manifest_path=root/'public/art/animation-hq/chunli/manifest.json';runtime_path=manifest_path.parent/'dash.webp'
manifest=json.loads(manifest_path.read_text());before=json.loads((source/'previous-manifest.json').read_text());original=next(r for r in before['records'] if r['id']=='dash');assert d.sha((source/'previous-dash.webp').read_bytes())==original['sha256']
record=next(r for r in manifest['records'] if r['id']=='dash')
report.update({'revision':'chunli-dash-motion-v2','sourceGrid':[4,2],'sourceOrder':list(range(2,9)),'uniqueDrawings':d.unique(frames),'previousRuntimeSha256':original['sha256'],'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/old_semantic['centroidStepMax']),2),'decodedBytes':384*448*7*4})
updated={**original,'sha256':d.sha(data),'bytes':len(data),'motionRevision':'chunli-dash-motion-v2','authoredSource':report['source'],'sourceSha256':report['sourceSha256'],'sourceGrid':[4,2],'sourceOrder':list(range(2,9)),'uniqueDrawings':7,'previousRuntimeSha256':original['sha256'],'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'encoding':encoding,'normalization':report['normalization'],'decodedMemoryDelta':0}
assert sum(r['bytes'] for r in manifest['records'] if r['id']!='dash')+len(data)<20000000,'Existing roster-sized download budget'
assert [r for r in manifest['records'] if r['id']!='dash']==[r for r in before['records'] if r['id']!='dash'],'Unrelated Ryu assets changed'
if args.runtime:
 assert runtime_path.read_bytes()==data,'Runtime bytes must reconstruct exactly from source'
 assert record==updated,'Runtime metadata must match verified generated source'
 saved=json.loads((source/'qa.json').read_text());assert saved==report,'Runtime QA must match current source'
else:
 (source/'candidate-dash.webp').write_bytes(data);Image.open(__import__('io').BytesIO(data)).save(source/'candidate-dash.png');(source/'qa.json').write_text(json.dumps(report,indent=2)+'\n')
 if args.install:
  runtime_path.write_bytes(data);manifest['records']=[updated if r['id']=='dash' else r for r in manifest['records']];manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(report));print('CHUNLI_DASH_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_PASS'))
