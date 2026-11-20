from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import hashlib,importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/jump-motion-v2'
CHARACTERS=('alex','dudley','makoto','yun','ibuki','ryu','ken','chunli','urien','gill')
SOURCE_FILES={'ibuki':'generated-sheet-v2.png','chunli':'generated-sheet-v2.png','urien':'generated-sheet-v3.png'}
ENTRY_CAPS={'alex':18_000_000,'dudley':13_000_000,'makoto':15_000_000,'yun':17_000_000,'ibuki':17_000_000,'ryu':18_000_000,'ken':19_000_000,'chunli':20_000_000,'urien':14_000_000,'gill':17_000_000}
ROOT_MIX=(1,1,1,.5,0,.5,1,1)
def helpers():
 spec=importlib.util.spec_from_file_location('jump_motion_helpers',ROOT/'scripts/build-walk-back-motion-v2.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def frames_from(data,count=8):
 sheet=Image.open(BytesIO(data)).convert('RGBA');assert sheet.size==(384*count,448)
 return [sheet.crop((384*i,0,384*(i+1),448)) for i in range(count)]
def landing_peer(h,slug,manifest):
 r=next(r for r in manifest['records'] if r['id']=='landing');data=(ROOT/f'public/art/animation-hq/{slug}/landing.webp').read_bytes()
 assert r['enabled'] and r['poseAuthored'] and r['frames']==6 and r['frameSize']==[384,448]
 assert h.sha(data)==r['sha256'] and len(data)==r['bytes'],'Installed landing peer checksum mismatch'
 return frames_from(data,6)
def evaluate(h,roster,motion,slug,manifest,frames):
 motion.FRAME_W=384;motion.ROSTER_CHARACTER=slug.upper()
 pose=motion.pose_qa(frames,'jump');semantic=motion.semantic_qa('jump',frames,pose)
 bridges=roster.air_bridges(ROOT/f'public/art/animation-hq/{slug}',frames,landing_peer(h,slug,manifest))
 assert h.unique(frames)==8,'Eight unique original jump drawings required'
 for f in frames:
  mask=np.array(f.getchannel('A'))>32
  assert not(mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any()),'Clipped jump pose'
 if not(pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(b['pass'] for b in bridges.values())):raise ValueError(json.dumps({'character':slug,'pose':pose,'semantic':semantic,'handoffs':bridges},indent=2))
 return pose,semantic,bridges
def main():
 parser=ArgumentParser();parser.add_argument('--character',choices=CHARACTERS);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 h=helpers();roster=h.load_roster();motion=roster.module();pending={};reports=[]
 for slug in ((args.character,) if args.character else CHARACTERS):
  directory=ROOT/f'public/art/animation-hq/{slug}';out=SOURCE/slug;manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='jump')
  assert record['frames']==8 and record['frameSize']==[384,448]
  previous=json.loads((out/'previous-manifest.json').read_text());old_record=next(r for r in previous['records'] if r['id']=='jump');old_data=(out/'previous-jump.webp').read_bytes();assert h.sha(old_data)==old_record['sha256'];old_frames=frames_from(old_data)
  source=out/SOURCE_FILES.get(slug,'generated-sheet-v1.png');raw=h.extract_sheet(Image.open(source));assert len(raw)==12
  idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();idle_height=box[3]-box[1]
  heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[0];scale=idle_height/reference_height
  motion.FRAME_W=384;motion.TARGET_HEIGHT['jump']=idle_height*float(np.median(heights))/reference_height
  keys,source_metrics=motion.normalize_frames('jump',raw)
  assert all(abs(m['scaledSize'][1]-m['sourceBodyHeight']*scale)<=1 for m in source_metrics),'Wide pose caused anatomical shrinkage'
  target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0]
  dx=round(target_x-motion._foot_metrics(np.array(keys[0].getchannel('A'))>24)[0]);frames=[];metrics=[];shifts=[]
  for i,key in enumerate(keys[1:9]):
   dy=round((target_y-int(np.nonzero(motion._binary_mask(key))[0].max()))*ROOT_MIX[i]);frame=Image.new('RGBA',(384,448));frame.alpha_composite(key,(dx,dy));frames.append(frame);shifts.append([dx,dy])
   m=source_metrics[i+1];metrics.append({**m,'frame':i+1,'sourceFrame':i+2,'paste':[m['paste'][0]+dx,m['paste'][1]+dy]})
  pose,semantic,bridges=evaluate(h,roster,motion,slug,manifest,frames)
  other_bytes=sum(r['bytes'] for r in manifest['records'] if r['id']!='jump' and r.get('enabled'));limit=min(1_000_000,ENTRY_CAPS[slug]-other_bytes)
  data,encoding=h.pack(frames,limit,record['encoding'] if args.runtime else None);assert len(data)<limit;evaluate(h,roster,motion,slug,manifest,frames_from(data))
  previous_step=old_record.get('semanticQa',{}).get('centroidStepMax')
  if previous_step is None:previous_step=motion.semantic_qa('jump',old_frames,motion.pose_qa(old_frames,'jump'))['centroidStepMax']
  assert semantic['centroidStepMax']<previous_step,'Jump centroid step must improve'
  normalization={'reference':'idle-reference-height','uniformScale':scale,'referenceHeight':idle_height,'sourceReferenceHeight':reference_height,'footBaselineReference':'installed-idle','footBaseline':target_y,'footAnchorX':target_x,'apexCenterY':220,'footRootMix':list(ROOT_MIX),'sourceShifts':shifts}
  report={'character':slug,'revision':'jump-motion-v2','source':source.relative_to(ROOT).as_posix(),'sourceSha256':h.sha(source.read_bytes()),'sourceGrid':[3,4],'sourceOrder':list(range(2,10)),'sourceOverrides':[],'runtimeSha256':h.sha(data),'runtimeBytes':len(data),'encoding':encoding,'uniqueDrawings':8,'previousUniqueDrawings':h.unique(old_frames),'previousCentroidStepMax':previous_step,'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/previous_step),2),'decodedBytes':384*448*8*4,'decodedMemoryDelta':0,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'normalization':normalization,'metrics':metrics,'sourceMetrics':source_metrics}
  if args.runtime:
   runtime=(directory/'jump.webp').read_bytes();assert record.get('motionRevision')=='jump-motion-v2';assert h.sha(runtime)==record['sha256'];assert data==runtime,'Jump runtime must reconstruct exactly'
   assert h.sha(source.read_bytes())==record['sourceSha256'];assert record['previousRuntimeSha256']==h.sha(old_data)
   for k in ('poseQa','semanticQa','handoffQa','normalization','metrics','encoding','sourceGrid','sourceOrder','sourceOverrides'):assert record[k]==report[k],f'Jump runtime {k} mismatch'
   reports.append({'character':slug,'runtime':True,'uniqueDrawings':8,'sourceReconstructionExact':True});continue
  updated={**record,**{k:report[k] for k in ('source','sourceSha256','sourceGrid','sourceOrder','sourceOverrides','encoding','poseQa','semanticQa','handoffQa','normalization','metrics','uniqueDrawings')},'authoredSource':report['source'],'sha256':h.sha(data),'bytes':len(data),'motionRevision':'jump-motion-v2','previousRuntimeSha256':h.sha(old_data)}
  manifest['records']=[updated if r['id']=='jump' else r for r in manifest['records']]
  pending[directory/'jump.webp']=data;pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  Image.open(BytesIO(data)).save(out/'candidate-jump.png');(out/'qa.json').write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 if args.install:roster.write_pending(pending)
 print(json.dumps(reports,indent=2));print('JUMP_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_QA_PASS'))
if __name__=='__main__':main()
