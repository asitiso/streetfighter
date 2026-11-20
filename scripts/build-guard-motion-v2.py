from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import hashlib,importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/guard-motion-v2'
CHARACTERS=('ken','ryu','chunli','alex','dudley','makoto','ibuki','yun','urien','gill')
def load_roster():
 spec=importlib.util.spec_from_file_location('guard_roster',ROOT/'scripts/build-roster-motions.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def sha(data):return hashlib.sha256(data).hexdigest().upper()
def unique(frames):return len({sha(np.where(np.array(f)[:,:,3:4]>0,np.array(f),0).tobytes()) for f in frames})
ENTRY_CAPS={'alex':18_000_000,'dudley':13_000_000,'makoto':15_000_000,'yun':17_000_000,'urien':14_000_000,'gill':17_000_000}
def pack(frames,limit):
 strip=Image.new('RGBA',(384*len(frames),448))
 for i,frame in enumerate(frames):strip.alpha_composite(frame,(384*i,0))
 a=np.array(strip);quality=None;psnr=None
 data=BytesIO();strip.save(data,'WEBP',lossless=True,method=6)
 if len(data.getvalue())>=limit:
  for quality in range(100,94,-1):
   data=BytesIO();strip.save(data,'WEBP',quality=quality,method=6)
   if len(data.getvalue())<limit:break
  else:raise ValueError('Guard cannot fit existing character entry cap at quality>=95')
 decoded=Image.open(BytesIO(data.getvalue())).convert('RGBA');b=np.array(decoded)
 assert np.array_equal(a[:,:,3],b[:,:,3]),'Packing changed guard silhouette alpha'
 if quality is None:
  assert np.array_equal(np.where(a[:,:,3:4]>0,a,0),np.where(b[:,:,3:4]>0,b,0)),'Lossless packing changed visible pixels'
 else:
  mask=a[:,:,3]>24;mse=float(np.mean((a[:,:,:3][mask].astype(float)-b[:,:,:3][mask])**2));psnr=round(float(10*np.log10(255**2/mse)),3)
  assert psnr>=35,'Compressed RGB quality below minimum'
 return data.getvalue(),{'format':'webp','rgb':'lossless' if quality is None else 'lossy','quality':quality,'alphaLossless':True,'visibleRgbPsnrDb':psnr}
def frames_from(data):
 sheet=Image.open(BytesIO(data)).convert('RGBA');assert sheet.size==(1920,448)
 return [sheet.crop((384*i,0,384*(i+1),448)) for i in range(5)]
def evaluate(roster,motion,slug,frames):
 motion.FRAME_W=384;motion.ROSTER_CHARACTER=slug.upper()
 pose=motion.pose_qa(frames,'guard');semantic=motion.semantic_qa('guard',frames,pose)
 bridges=roster.handoffs(ROOT/f'public/art/animation-hq/{slug}','guard',frames)
 masks=[np.array(f.getchannel('A'))>32 for f in frames]
 assert all(not(m[0].any() or m[-1].any() or m[:,0].any() or m[:,-1].any()) for m in masks),'Clipped frame'
 assert unique(frames)==5,'Five unique authored guard drawings required'
 if not(pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(b['pass'] for b in bridges.values())):
  raise ValueError(json.dumps({'character':slug,'pose':pose,'semantic':semantic,'handoffs':bridges},indent=2))
 return pose,semantic,bridges

def main():
 parser=ArgumentParser();parser.add_argument('--character',choices=CHARACTERS);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 roster=load_roster();motion=roster.module();pending={};reports=[]
 for slug in ((args.character,) if args.character else CHARACTERS):
  directory=ROOT/f'public/art/animation-hq/{slug}';manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='guard');assert record['frames']==5 and record['frameSize']==[384,448]
  source=SOURCE/slug/('generated-sheet-v3.png' if slug in ('alex','urien') else 'generated-sheet-v2.png' if slug=='makoto' else 'generated-sheet-v1.png');backup=SOURCE/slug/'previous-guard.webp';old_frames=frames_from(backup.read_bytes())
  if args.runtime:
   data=(directory/'guard.webp').read_bytes();assert record.get('motionRevision')=='guard-motion-v2','New guard motion is not installed for '+slug
   assert sha(data)==record['sha256'];assert sha(source.read_bytes())==record['sourceSha256'];frames=frames_from(data);pose,semantic,bridges=evaluate(roster,motion,slug,frames)
   assert record['bytes']==len(data);assert sum(r['bytes'] for r in manifest['records'] if r.get('enabled'))<ENTRY_CAPS.get(slug,10**9);assert record['encoding']['alphaLossless'];assert record['previousRuntimeSha256']==sha(backup.read_bytes());reports.append({'character':slug,'runtime':True,'uniqueDrawings':5,'previousUniqueDrawings':unique(old_frames)});continue
  raw=roster.extract(Image.open(source),3);assert len(raw)==6
  idle_record=next(r for r in manifest['records'] if r['id']=='idle');idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));idle_box=idle.getbbox();idle_height=idle_box[3]-idle_box[1]
  heights=[motion.alpha_bbox(f)[3]-motion.alpha_bbox(f)[1] for f in raw];reference_height=heights[-1];motion.FRAME_W=384;motion.TARGET_HEIGHT['guard']=idle_height*float(np.median(heights))/reference_height
  keys,metrics=motion.normalize_frames('guard',raw)
  target_y=int(np.nonzero(motion._binary_mask(idle))[0].max());target_x=motion._foot_metrics(np.array(idle.getchannel('A'))>24)[0];shifts=[]
  for i,frame in enumerate(keys):
   mask=np.array(frame.getchannel('A'))>24;dy=target_y-int(np.nonzero(motion._binary_mask(frame))[0].max());dx=round(target_x-motion._foot_metrics(mask)[0]);aligned=Image.new('RGBA',(384,448));aligned.alpha_composite(frame,(dx,dy));keys[i]=aligned;shifts.append([dx,dy])
  source_metrics=metrics;metrics=[{**m,'frame':i+1,'sourceFrame':i+2,'paste':[m['paste'][0]+shifts[i+1][0],m['paste'][1]+shifts[i+1][1]]} for i,m in enumerate(source_metrics[1:])]
  frames=keys[1:];pose,semantic,bridges=evaluate(roster,motion,slug,frames);other_bytes=sum(r['bytes'] for r in manifest['records'] if r['id']!='guard' and r.get('enabled'));limit=min(1_000_000,ENTRY_CAPS.get(slug,10**9)-other_bytes);data,encoding=pack(frames,limit);assert len(data)<limit
  previous_manifest=json.loads((SOURCE/slug/'previous-manifest.json').read_text());previous_record=next(r for r in previous_manifest['records'] if r['id']=='guard');previous_step=previous_record['semanticQa']['centroidStepMax'];assert semantic['centroidStepMax']<previous_step,'New sequence must reduce maximum centroid step'
  report={'previousCentroidStepMax':previous_step,'centroidStepReductionPercent':round(100*(1-semantic['centroidStepMax']/previous_step),2),'character':slug,'revision':'guard-motion-v2','source':source.relative_to(ROOT).as_posix(),'sourceSha256':sha(source.read_bytes()),'sourceGrid':[2,3],'sourceOrder':[2,3,4,5,6],'runtimeSha256':sha(data),'runtimeBytes':len(data),'encoding':encoding,'uniqueDrawings':5,'previousUniqueDrawings':unique(old_frames),'decodedBytes':384*448*5*4,'decodedMemoryDelta':0,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'normalization':{'reference':'idle-recovery-height','footBaselineReference':'installed-idle','footAlignment':'installed-idle-centre-of-feet','referenceHeight':idle_height,'sourceGuardHeight':reference_height,'uniformScale':idle_height/reference_height,'footAnchorX':target_x,'footBaseline':target_y,'sourceShifts':shifts},'sourceMetrics':source_metrics,'metrics':metrics}
  updated={**record,'sha256':sha(data),'bytes':len(data),'encoding':encoding,'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'source':report['source'],'authoredSource':report['source'],'sourceSha256':report['sourceSha256'],'sourceGrid':[2,3],'sourceOrder':report['sourceOrder'],'normalization':report['normalization'],'metrics':metrics,'motionRevision':'guard-motion-v2','uniqueDrawings':5,'previousRuntimeSha256':sha(backup.read_bytes())}
  manifest['records']=[updated if r['id']=='guard' else r for r in manifest['records']]
  pending[directory/'guard.webp']=data;pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  out=SOURCE/slug;strip=Image.open(BytesIO(data));strip.save(out/'candidate-guard.png');(out/'qa.json').write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 if args.install:roster.write_pending(pending)
 print(json.dumps(reports,indent=2));print('GUARD_MOTION_V2_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_QA_PASS'))
if __name__=='__main__':main()
