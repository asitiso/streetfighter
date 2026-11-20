from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/landing-motion-v2'
CHARACTERS=('alex','urien','gill','ken','ryu','chunli','ibuki','dudley','makoto','yun')
SOURCE_FILES={'alex':'generated-sheet-v3.png','urien':'generated-sheet-v2.png','gill':'generated-sheet-v2.png','ryu':'generated-sheet-v2.png','ibuki':'generated-sheet-v2.png','yun':'generated-sheet-v2.png'}
def helpers():
 spec=importlib.util.spec_from_file_location('landing_guard_helpers',ROOT/'scripts/build-guard-motion-v2.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def frames_from(data,count=6):
 sheet=Image.open(BytesIO(data)).convert('RGBA');assert sheet.size==(384*count,448)
 return [sheet.crop((384*i,0,384*(i+1),448)) for i in range(count)]
def jump_peer(h,slug,manifest):
 r=next(r for r in manifest['records'] if r['id']=='jump');data=(ROOT/f'public/art/animation-hq/{slug}/jump.webp').read_bytes()
 assert r['enabled'] and r['poseAuthored'] and r['frames']==8 and r['frameSize']==[384,448]
 assert r['sha256']==h.sha(data) and r['bytes']==len(data),'Installed jump peer checksum mismatch'
 return frames_from(data,8)
def evaluate(h,roster,motion,slug,manifest,frames):
 motion.FRAME_W=384;motion.ROSTER_CHARACTER=slug.upper();pose=motion.pose_qa(frames,'landing');semantic=motion.semantic_qa('landing',frames,pose)
 bridges=roster.air_bridges(ROOT/f'public/art/animation-hq/{slug}',jump_peer(h,slug,manifest),frames)
 assert h.unique(frames)==6,'Six unique original landing drawings required'
 for f in frames:
  mask=np.array(f.getchannel('A'))>32
  assert not(mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any()),'Clipped landing pose'
 if not(pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(v['pass'] for v in bridges.values())):raise ValueError(json.dumps({'character':slug,'pose':pose,'semantic':semantic,'handoffs':bridges},indent=2))
 return pose,semantic,bridges
def main():
 parser=ArgumentParser();parser.add_argument('--character',choices=CHARACTERS);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 h=helpers();roster=h.load_roster();motion=roster.module();pending={};reports=[]
 for slug in ((args.character,) if args.character else CHARACTERS):
  directory=ROOT/f'public/art/animation-hq/{slug}';out=SOURCE/slug;manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='landing');assert record['frames']==6 and record['frameSize']==[384,448]
  source=out/SOURCE_FILES.get(slug,'generated-sheet-v1.png');backup=out/'previous-landing.webp';previous=json.loads((out/'previous-manifest.json').read_text());old_record=next(r for r in previous['records'] if r['id']=='landing');assert old_record['sha256']==h.sha(backup.read_bytes()),'Original landing backup checksum mismatch'
  if args.runtime:
   data=(directory/'landing.webp').read_bytes();assert record.get('motionRevision')=='landing-motion-v2','New landing motion not installed for '+slug
   assert record['sha256']==h.sha(data) and record['bytes']==len(data);assert record['sourceSha256']==h.sha(source.read_bytes());assert record['previousRuntimeSha256']==h.sha(backup.read_bytes())
   assert sum(r['bytes'] for r in manifest['records'] if r.get('enabled'))<h.ENTRY_CAPS.get(slug,10**9);assert record['encoding']['alphaLossless']
   pose,semantic,bridges=evaluate(h,roster,motion,slug,manifest,frames_from(data));reports.append({'character':slug,'runtime':True,'uniqueDrawings':6,'maximumCentroidStep':semantic['centroidStepMax']});continue
  raw=roster.extract(Image.open(source),3);assert len(raw)==6
  idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();height=box[3]-box[1];heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[-1]
  motion.FRAME_W=384;motion.TARGET_HEIGHT['landing']=height*float(np.median(heights))/reference_height
  frames,metrics=motion.normalize_frames('landing',raw);target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0]
  dx=round(target_x-motion._foot_metrics(np.array(frames[-1].getchannel('A'))>24)[0]);shifts=[]
  for i,f in enumerate(frames):
   dy=target_y-int(np.nonzero(motion._binary_mask(f))[0].max());aligned=Image.new('RGBA',(384,448));aligned.alpha_composite(f,(dx,dy));frames[i]=aligned;shifts.append([dx,dy]);metrics[i]['paste']=[metrics[i]['paste'][0]+dx,metrics[i]['paste'][1]+dy]
  pose,semantic,bridges=evaluate(h,roster,motion,slug,manifest,frames);old_semantic=old_record.get('semanticQa')
  if old_semantic is None:
   # Legacy Ryu has no stored QA: measure the exact hash-verified backup.
   old_frames=frames_from(backup.read_bytes());old_pose=motion.pose_qa(old_frames,'landing');old_semantic=motion.semantic_qa('landing',old_frames,old_pose)
  previous_step=old_semantic['centroidStepMax'];assert semantic['centroidStepMax']<previous_step,'New landing motion must reduce maximum centroid step'
  other=sum(r['bytes'] for r in manifest['records'] if r['id']!='landing' and r.get('enabled'));limit=min(1_200_000,h.ENTRY_CAPS.get(slug,10**9)-other);data,encoding=h.pack(frames,limit);evaluate(h,roster,motion,slug,manifest,frames_from(data))
  normalization={'reference':'idle-recovery-height','referenceHeight':height,'sourceRecoveryHeight':reference_height,'uniformScale':height/reference_height,'footBaselineReference':'installed-idle','footBaseline':target_y,'footAnchorReference':'single-recovery-foot-offset','sourceShifts':shifts}
  report={'character':slug,'revision':'landing-motion-v2','source':source.relative_to(ROOT).as_posix(),'sourceSha256':h.sha(source.read_bytes()),'sourceGrid':[2,3],'sourceOrder':list(range(1,7)),'runtimeSha256':h.sha(data),'runtimeBytes':len(data),'encoding':encoding,'uniqueDrawings':6,'previousCentroidStepMax':previous_step,'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/previous_step),2),'decodedBytes':384*448*6*4,'decodedMemoryDelta':0,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'normalization':normalization,'metrics':metrics}
  updated={**record,'sha256':h.sha(data),'bytes':len(data),'encoding':encoding,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'source':report['source'],'authoredSource':report['source'],'sourceSha256':report['sourceSha256'],'sourceGrid':[2,3],'sourceOrder':report['sourceOrder'],'normalization':normalization,'metrics':metrics,'motionRevision':'landing-motion-v2','uniqueDrawings':6,'previousRuntimeSha256':h.sha(backup.read_bytes())}
  manifest['records']=[updated if r['id']=='landing' else r for r in manifest['records']];pending[directory/'landing.webp']=data;pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  Image.open(BytesIO(data)).save(out/'candidate-landing.png');(out/'qa.json').write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 if args.install:roster.write_pending(pending)
 print(json.dumps(reports,indent=2));print('LANDING_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_QA_PASS'))
if __name__=='__main__':main()
