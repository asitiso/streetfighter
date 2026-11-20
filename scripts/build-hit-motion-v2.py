from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/hit-motion-v2'
CHARACTERS=('ibuki','makoto','chunli','ken','ryu','alex','dudley','yun','urien','gill')
SOURCE_FILES={'ken':'generated-sheet-v3.png','ryu':'generated-sheet-v2.png','dudley':'generated-sheet-v3.png','yun':'generated-sheet-v2.png'}
def helpers():
 spec=importlib.util.spec_from_file_location('hit_guard_helpers',ROOT/'scripts/build-guard-motion-v2.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def source_column_roots(roster,sheet,scale):
 # Bounding-box centering discards authored root travel. For Ken's calibrated
 # source columns, preserve positions relative to each column's neutral pose.
 # This translates whole drawings only; no body deformation/interpolation.
 arr=np.array(sheet.convert('RGBA'));labels,count=roster.ndimage.label(arr[:,:,3]>16);sizes=np.bincount(labels.ravel());sizes[0]=0;selected=np.argsort(sizes)[-8:]
 assert len(selected)==8 and min(sizes[selected])>=1000
 centers=sorted((float(np.nonzero(labels==v)[0].mean()),float(np.nonzero(labels==v)[1].mean()),int(v)) for v in selected);ordered=[]
 for row in range(4):ordered.extend(sorted(centers[row*2:row*2+2],key=lambda item:item[1]))
 x=[]
 for _,_,v in ordered:
  ys,xs=np.nonzero(labels==v);x.append(float(xs.min()+xs.max())/2)
 offsets=[round((value-x[0 if i%2==0 else 7])*scale) for i,value in enumerate(x)]
 return offsets,{'method':'preserve-source-position-relative-to-neutral-in-each-column','anchorSourceFrames':[1,8],'sourceBodyCenterX':x,'offsetPixels':offsets}
def frames_from(data):
 sheet=Image.open(BytesIO(data)).convert('RGBA');assert sheet.size==(3072,448)
 return [sheet.crop((384*i,0,384*(i+1),448)) for i in range(8)]
def evaluate(h,roster,motion,slug,frames):
 motion.FRAME_W=384;motion.ROSTER_CHARACTER=slug.upper()
 pose=motion.pose_qa(frames,'hit');semantic=motion.semantic_qa('hit',frames,pose);bridges=roster.handoffs(ROOT/f'public/art/animation-hq/{slug}','hit',frames)
 assert h.unique(frames)==8,'Eight unique original hit drawings required'
 for f in frames:
  mask=np.array(f.getchannel('A'))>32
  assert not(mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any()),'Clipped hit pose'
 if not(pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(x['pass'] for x in bridges.values())):raise ValueError(json.dumps({'character':slug,'pose':pose,'semantic':semantic,'handoffs':bridges},indent=2))
 return pose,semantic,bridges
def main():
 parser=ArgumentParser();parser.add_argument('--character',choices=CHARACTERS);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 h=helpers();roster=h.load_roster();motion=roster.module();pending={};reports=[]
 for slug in ((args.character,) if args.character else CHARACTERS):
  directory=ROOT/f'public/art/animation-hq/{slug}';out=SOURCE/slug;manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='hit');assert record['frames']==8 and record['frameSize']==[384,448]
  source=out/SOURCE_FILES.get(slug,'generated-sheet-v1.png');backup=out/'previous-hit.webp';previous=json.loads((out/'previous-manifest.json').read_text());old_record=next(r for r in previous['records'] if r['id']=='hit');old_frames=frames_from(backup.read_bytes())
  if args.runtime:
   data=(directory/'hit.webp').read_bytes();assert record.get('motionRevision')=='hit-motion-v2','New hit motion not installed for '+slug
   assert record['sha256']==h.sha(data) and record['bytes']==len(data);assert record['sourceSha256']==h.sha(source.read_bytes());assert record['previousRuntimeSha256']==h.sha(backup.read_bytes())
   assert sum(r['bytes'] for r in manifest['records'] if r.get('enabled'))<h.ENTRY_CAPS.get(slug,10**9);assert record['encoding']['alphaLossless']
   pose,semantic,bridges=evaluate(h,roster,motion,slug,frames_from(data));reports.append({'character':slug,'runtime':True,'uniqueDrawings':8,'maximumCentroidStep':semantic['centroidStepMax']});continue
  source_sheet=Image.open(source);raw=roster.extract(source_sheet,4);assert len(raw)==8
  idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();height=box[3]-box[1]
  heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[-1];motion.FRAME_W=384;motion.TARGET_HEIGHT['hit']=height*float(np.median(heights))/reference_height
  frames,metrics=motion.normalize_frames('hit',raw);target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0]
  dx=round(target_x-motion._foot_metrics(np.array(frames[-1].getchannel('A'))>24)[0]);shifts=[];root_offsets=[0]*8;root_metadata=None
  if slug=='ken':root_offsets,root_metadata=source_column_roots(roster,source_sheet,height/reference_height)
  for i,frame in enumerate(frames):
   dy=target_y-int(np.nonzero(motion._binary_mask(frame))[0].max());aligned=Image.new('RGBA',(384,448));aligned.alpha_composite(frame,(dx+root_offsets[i],dy));frames[i]=aligned;shifts.append([dx+root_offsets[i],dy]);metrics[i]['paste']=[metrics[i]['paste'][0]+dx+root_offsets[i],metrics[i]['paste'][1]+dy]
  pose,semantic,bridges=evaluate(h,roster,motion,slug,frames)
  previous_step=old_record['semanticQa']['centroidStepMax'];assert semantic['centroidStepMax']<previous_step,'New motion must reduce maximum centroid step'
  other=sum(r['bytes'] for r in manifest['records'] if r['id']!='hit' and r.get('enabled'));limit=min(1_500_000,h.ENTRY_CAPS.get(slug,10**9)-other);data,encoding=h.pack(frames,limit)
  # Validate the installed codec result, not only the pre-encoding source frames.
  evaluate(h,roster,motion,slug,frames_from(data))
  normalization={'reference':'idle-recovery-height','referenceHeight':height,'sourceGuardHeight':reference_height,'uniformScale':height/reference_height,'footBaselineReference':'installed-idle','footBaseline':target_y,'footAnchorReference':'single-recovery-foot-offset-retains-authored-recoil-travel','sourceShifts':shifts}
  if root_metadata:normalization['sourceRootAlignment']=root_metadata
  report={'character':slug,'revision':'hit-motion-v2','source':source.relative_to(ROOT).as_posix(),'sourceSha256':h.sha(source.read_bytes()),'sourceGrid':[2,4],'sourceOrder':list(range(1,9)),'runtimeSha256':h.sha(data),'runtimeBytes':len(data),'encoding':encoding,'uniqueDrawings':8,'previousUniqueDrawings':h.unique(old_frames),'previousCentroidStepMax':previous_step,'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/previous_step),2),'decodedBytes':384*448*8*4,'decodedMemoryDelta':0,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'normalization':normalization,'metrics':metrics}
  updated={**record,'sha256':h.sha(data),'bytes':len(data),'encoding':encoding,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'source':report['source'],'authoredSource':report['source'],'sourceSha256':report['sourceSha256'],'sourceGrid':[2,4],'sourceOrder':report['sourceOrder'],'normalization':normalization,'metrics':metrics,'motionRevision':'hit-motion-v2','uniqueDrawings':8,'previousRuntimeSha256':h.sha(backup.read_bytes())}
  manifest['records']=[updated if r['id']=='hit' else r for r in manifest['records']];pending[directory/'hit.webp']=data;pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  Image.open(BytesIO(data)).save(out/'candidate-hit.png');(out/'qa.json').write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 if args.install:roster.write_pending(pending)
 print(json.dumps(reports,indent=2));print('HIT_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_QA_PASS'))
if __name__=='__main__':main()
