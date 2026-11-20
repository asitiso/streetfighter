from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import hashlib,importlib.util,json
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/walk-back-motion-v2'
CHARACTERS=('chunli','ibuki','makoto','yun','ken','alex','dudley','ryu','urien','gill')
SOURCE_FILES={'ibuki':'generated-sheet-v3.png','alex':'generated-sheet-v2.png','ryu':'generated-sheet-v2.png','urien':'generated-sheet-v2.png','gill':'generated-sheet-v4.png'}
def load_roster():
 spec=importlib.util.spec_from_file_location('walk-back_roster',ROOT/'scripts/build-roster-motions.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def sha(data):return hashlib.sha256(data).hexdigest().upper()
def unique(frames):return len({sha(np.where(np.array(f)[:,:,3:4]>0,np.array(f),0).tobytes()) for f in frames})
ENTRY_CAPS={'chunli':20_000_000,'ibuki':17_000_000,'makoto':15_000_000,'yun':17_000_000,'ken':19_000_000,'alex':18_000_000,'dudley':13_000_000,'ryu':18_000_000,'urien':14_000_000,'gill':17_000_000}
def pack(frames,limit,accepted_encoding=None):
 width=frames[0].width;strip=Image.new('RGBA',(width*len(frames),448))
 for i,frame in enumerate(frames):strip.alpha_composite(frame,(width*i,0))
 a=np.array(strip);quality=None;psnr=None
 data=BytesIO()
 if accepted_encoding is not None:
  assert accepted_encoding['format']=='webp' and accepted_encoding['alphaLossless'] is True,'Invalid accepted encoding'
  if accepted_encoding['rgb']=='lossless':
   assert accepted_encoding['quality'] is None,'Lossless encoding cannot specify lossy quality'
   strip.save(data,'WEBP',lossless=True,method=6)
  else:
   assert accepted_encoding['rgb']=='lossy','Invalid accepted RGB encoding'
   quality=accepted_encoding['quality']
   assert type(quality) is int and 95<=quality<=100,'Accepted RGB quality outside original bounds'
   strip.save(data,'WEBP',quality=quality,method=6)
  if len(data.getvalue())>=limit:raise ValueError('Accepted encoding no longer fits existing entry cap')
 else:
  strip.save(data,'WEBP',lossless=True,method=6)
  if len(data.getvalue())>=limit:
   for quality in range(100,94,-1):
    data=BytesIO();strip.save(data,'WEBP',quality=quality,method=6)
    if len(data.getvalue())<limit:break
   else:raise ValueError('Dash cannot fit existing character entry cap at quality>=95')
 decoded=Image.open(BytesIO(data.getvalue())).convert('RGBA');b=np.array(decoded)
 assert np.array_equal(a[:,:,3],b[:,:,3]),'Packing changed walk-back silhouette alpha'
 if quality is None:
  assert np.array_equal(np.where(a[:,:,3:4]>0,a,0),np.where(b[:,:,3:4]>0,b,0)),'Lossless packing changed visible pixels'
 else:
  mask=a[:,:,3]>24;mse=float(np.mean((a[:,:,:3][mask].astype(float)-b[:,:,:3][mask])**2));psnr=round(float(10*np.log10(255**2/mse)),3)
  assert psnr>=35,'Compressed RGB quality below minimum'
 return data.getvalue(),{'format':'webp','rgb':'lossless' if quality is None else 'lossy','quality':quality,'alphaLossless':True,'visibleRgbPsnrDb':psnr}
def frames_from(data):
 sheet=Image.open(BytesIO(data)).convert('RGBA');width=sheet.width//10;assert width in (384,640) and sheet.size==(width*10,448)
 return [sheet.crop((width*i,0,width*(i+1),448)) for i in range(10)]
def cyclic_step(motion,frames):
 centers=np.array([motion._mask_centroid(motion._binary_mask(f)) for f in frames]);return float(np.linalg.norm(centers-np.roll(centers,1,axis=0),axis=1).max())
def evaluate(roster,motion,slug,frames):
 motion.FRAME_W=frames[0].width;motion.ROSTER_CHARACTER=slug.upper()
 pose=motion.pose_qa(frames,'walk-back');semantic=motion.semantic_qa('walk-back',frames,pose)
 bridges=roster.handoffs(ROOT/f'public/art/animation-hq/{slug}','walk-back',frames)
 masks=[np.array(f.getchannel('A'))>32 for f in frames]
 assert all(not(m[0].any() or m[-1].any() or m[:,0].any() or m[:,-1].any()) for m in masks),'Clipped frame'
 assert unique(frames)==10,'Ten unique authored walk-back drawings required'
 if not(pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(b['pass'] for b in bridges.values())):
  raise ValueError(json.dumps({'character':slug,'pose':pose,'semantic':semantic,'handoffs':bridges},indent=2))
 return pose,semantic,bridges

def extract_sheet(sheet):
 arr=np.array(sheet.convert('RGBA'));labels,count=ndimage.label(arr[:,:,3]>16)
 sizes=np.bincount(labels.ravel());sizes[0]=0
 selected=np.argsort(sizes)[-12:]
 if len(selected)!=12 or min(sizes[selected])<1000:raise ValueError('Missing complete source poses')
 centers=sorted((float(np.nonzero(labels==label)[0].mean()),float(np.nonzero(labels==label)[1].mean()),int(label)) for label in selected)
 ordered=[]
 for row in range(4):
  ordered.extend(sorted(centers[row*3:row*3+3],key=lambda value:value[1]))
 frames=[]
 for _,_,label in ordered:
  core=labels==label
  # Extract the whole connected body rather than slicing at nominal grid
  # boundaries, which can cut a complete boot extending into a blank gutter.
  opaque=core&(arr[:,:,3]>128)
  if opaque[0].any() or opaque[-1].any() or opaque[:,0].any() or opaque[:,-1].any():raise ValueError('Source body touches sheet edge')
  keep=ndimage.binary_dilation(core,iterations=2)
  body=arr.copy();body[:,:,3][~keep]=0;frame=Image.fromarray(body);box=frame.getbbox()
  if not box or box[3]-box[1]<240:raise ValueError('Source pose is incomplete or too small')
  frames.append(frame.crop(box))
 return frames

def source_frames(slug,source):
 return extract_sheet(Image.open(source)),[]

def main():
 parser=ArgumentParser();parser.add_argument('--character',choices=CHARACTERS);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 roster=load_roster();motion=roster.module();pending={};reports=[]
 for slug in ((args.character,) if args.character else CHARACTERS):
  directory=ROOT/f'public/art/animation-hq/{slug}';manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='walk-back');assert record['frames']==10 and record['frameSize']==[384,448];width=record['frameSize'][0]
  source=SOURCE/slug/SOURCE_FILES.get(slug,'generated-sheet-v1.png');backup=SOURCE/slug/'previous-walk-back.webp';old_frames=frames_from(backup.read_bytes());previous_manifest=json.loads((SOURCE/slug/'previous-manifest.json').read_text());previous_record=next(r for r in previous_manifest['records'] if r['id']=='walk-back');assert sha(backup.read_bytes())==previous_record['sha256'],'Previous walk-back backup checksum mismatch'
  raw,overrides=source_frames(slug,source);assert len(raw)==12
  if args.runtime:
   data=(directory/'walk-back.webp').read_bytes();assert record.get('motionRevision')=='walk-back-motion-v2','New walk-back motion is not installed for '+slug
   assert sha(data)==record['sha256'];assert sha(source.read_bytes())==record['sourceSha256'];frames=frames_from(data);pose,semantic,bridges=evaluate(roster,motion,slug,frames)
   assert record.get('sourceOverrides',[])==overrides;assert record['sourceGrid']==[3,4] and record['sourceOrder']==list(range(2,12));assert record['bytes']==len(data);assert sum(r['bytes'] for r in manifest['records'] if r.get('enabled'))<ENTRY_CAPS.get(slug,10**9);assert record['encoding']['alphaLossless'];assert record['previousRuntimeSha256']==sha(backup.read_bytes());runtime_data=data
  idle_record=next(r for r in manifest['records'] if r['id']=='idle');idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));idle_box=idle.getbbox();idle_height=idle_box[3]-idle_box[1]
  heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[0];motion.FRAME_W=width;motion.TARGET_HEIGHT['walk-back']=idle_height*float(np.median(heights))/reference_height
  keys,metrics=motion.normalize_frames('walk-back',raw)
  target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0]+(width-384)//2;shifts=[];dx=round(target_x-motion._foot_metrics(np.array(keys[0].getchannel('A'))>24)[0])
  for i,frame in enumerate(keys):
   dy=target_y-int(np.nonzero(motion._binary_mask(frame))[0].max());aligned=Image.new('RGBA',(width,448));aligned.alpha_composite(frame,(dx,dy));keys[i]=aligned;shifts.append([dx,dy])
  source_metrics=metrics;scale=idle_height/reference_height;assert all(abs(m['scaledSize'][1]-m['sourceBodyHeight']*scale)<=1 for m in source_metrics),'Wide pose caused anatomical shrinkage'
  metrics=[{**m,'frame':i+1,'sourceFrame':i+2,'paste':[m['paste'][0]+shifts[i+1][0],m['paste'][1]+shifts[i+1][1]]} for i,m in enumerate(source_metrics[1:11])]
  frames=keys[1:11];pose,semantic,bridges=evaluate(roster,motion,slug,frames);other_bytes=sum(r['bytes'] for r in manifest['records'] if r['id']!='walk-back' and r.get('enabled'));limit=min(1_000_000,ENTRY_CAPS.get(slug,10**9)-other_bytes);data,encoding=pack(frames,limit,record['encoding'] if args.runtime else None);assert len(data)<limit;evaluate(roster,motion,slug,frames_from(data))
  previous_cyclic=cyclic_step(motion,old_frames);current_cyclic=cyclic_step(motion,frames);assert current_cyclic<previous_cyclic,'Loop-inclusive centroid step must improve'
  previous_step=previous_record['semanticQa']['centroidStepMax'];assert semantic['centroidStepMax']<previous_step,f"{slug}: centroid step {semantic['centroidStepMax']} must be below previous {previous_step}"
  if args.runtime:
   assert data==runtime_data,'Installed walk-back must exactly reconstruct from accepted source drawings and override'
   reports.append({'character':slug,'runtime':True,'uniqueDrawings':10,'previousUniqueDrawings':unique(old_frames),'sourceReconstructionExact':True});continue
  report={'previousCyclicCentroidStepMax':round(previous_cyclic,6),'cyclicCentroidStepMax':round(current_cyclic,6),'previousCentroidStepMax':previous_step,'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/previous_step),2),'character':slug,'revision':'walk-back-motion-v2','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source.read_bytes()),'sourceGrid':[3,4],'sourceOverrides':overrides,'sourceOrder':list(range(2,12)),'runtimeSha256':sha(data),'runtimeBytes':len(data),'encoding':encoding,'uniqueDrawings':10,'previousUniqueDrawings':unique(old_frames),'decodedBytes':width*448*10*4,'decodedMemoryDelta':0,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'normalization':{'reference':'idle-reference-height','footBaselineReference':'installed-idle','footAlignment':'single-source-idle-reference-offset','referenceHeight':idle_height,'sourceWalkHeight':reference_height,'uniformScale':scale,'footAnchorX':target_x,'footBaseline':target_y,'sourceShifts':shifts},'sourceMetrics':source_metrics,'metrics':metrics}
  updated={**record,'sha256':sha(data),'bytes':len(data),'encoding':encoding,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'source':report['source'],'authoredSource':report['source'],'sourceSha256':report['sourceSha256'],'sourceGrid':[3,4],'sourceOverrides':overrides,'sourceOrder':report['sourceOrder'],'normalization':report['normalization'],'metrics':metrics,'motionRevision':'walk-back-motion-v2','uniqueDrawings':10,'previousRuntimeSha256':sha(backup.read_bytes())}
  manifest['records']=[updated if r['id']=='walk-back' else r for r in manifest['records']]
  pending[directory/'walk-back.webp']=data;pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  out=SOURCE/slug;strip=Image.open(BytesIO(data));strip.save(out/'candidate-walk-back.png');(out/'qa.json').write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 if args.install:roster.write_pending(pending)
 print(json.dumps(reports,indent=2));print('WALK_BACK_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_QA_PASS'))
if __name__=='__main__':main()
