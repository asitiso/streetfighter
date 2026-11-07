"""Build the six missing roster movement strips using existing quality gates.

Source sheets are generated key poses (2x2 idle, 2x4 walk), not runtime frames.
Default is read-only QA; --install writes all six only after every gate passes.
"""
from pathlib import Path
from argparse import ArgumentParser
from itertools import permutations
from io import BytesIO
import hashlib, importlib.util, json
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/roster-idle'
CONFIG=json.loads((SOURCE/'batch.json').read_text())

def module():
 spec=importlib.util.spec_from_file_location('roster_idle_motion',ROOT/'scripts/install-authored-ken-sequence.py')
 motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)
 return motion

def extract(sheet,rows=2):
 arr=np.array(sheet.convert('RGBA'));labels,count=ndimage.label(arr[:,:,3]>16)
 sizes=np.bincount(labels.ravel());sizes[0]=0
 selected=np.argsort(sizes)[-(rows*2):]
 if len(selected)!=rows*2 or min(sizes[selected])<1000:raise ValueError('Missing complete source poses')
 centers=sorted((float(np.nonzero(labels==label)[0].mean()),float(np.nonzero(labels==label)[1].mean()),int(label)) for label in selected)
 ordered=[]
 for row in range(rows):
  ordered.extend(sorted(centers[row*2:row*2+2],key=lambda value:value[1]))
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

def handoffs(directory,kind,frames):
 peer='walk' if kind=='idle' else 'idle';path=directory/f'{peer}.webp'
 if not path.exists():
  if kind=='walk':raise ValueError('Install idle before walk')
  return {}
 manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']==peer)
 if not record['enabled'] or not record['poseAuthored']:raise ValueError('Installed peer is not authored and enabled')
 data=path.read_bytes()
 if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError('Installed peer checksum mismatch')
 strip=Image.open(BytesIO(data)).convert('RGBA')
 if strip.size!=(record['frames']*384,448):raise ValueError('Installed peer dimensions mismatch')
 spec=importlib.util.spec_from_file_location('roster_handoff',ROOT/'scripts/audit-ken-handoff-semantics.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 peer_first=strip.crop((0,0,384,448));peer_last=strip.crop(((record['frames']-1)*384,0,record['frames']*384,448))
 idle=frames if kind=='idle' else [peer_first,peer_last];walk=frames if kind=='walk' else [peer_first,peer_last]
 return {'idleToWalk':h.compare_motion_bridge(h.alpha_mask(idle[0]),h.alpha_mask(walk[0]),h.WALK_BACK_BASE_LIMITS),'walkToIdle':h.compare_motion_bridge(h.alpha_mask(walk[-1]),h.alpha_mask(idle[0]),h.WALK_BACK_BASE_LIMITS)}

def webp(frames):
 strip=Image.new('RGBA',(384*len(frames),448))
 for index,frame in enumerate(frames):strip.alpha_composite(frame,(384*index,0))
 data=BytesIO();strip.save(data,'WEBP',lossless=True,method=4)
 return data.getvalue()

def main():
 parser=ArgumentParser(description=__doc__);parser.add_argument('--kind',choices=['idle','walk'],default='idle');parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose --install or --runtime')
 motion=module();pending={};results=[];kind=args.kind;count=6 if kind=='idle' else 12
 for entry in CONFIG:
  slug=entry['slug'];directory=ROOT/f'public/art/animation-hq/{slug}'
  if args.runtime:
   manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']==kind)
   if not record['enabled'] or not record['poseAuthored'] or record['frames']!=count:raise ValueError(f'{slug}: runtime record mismatch')
   data=(directory/f'{kind}.webp').read_bytes();sheet=Image.open(BytesIO(data)).convert('RGBA')
   if sheet.size!=(384*count,448):raise ValueError(f'{slug}: invalid runtime dimensions')
   if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError(f'{slug}: checksum mismatch')
   frames=[sheet.crop((i*384,0,(i+1)*384,448)) for i in range(count)]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   if not pose['poseAuthoredPass'] or not semantic['semanticQaPass']:raise ValueError(f'{slug}: runtime quality failed')
   if not all(r['pass'] for r in handoffs(directory,kind,frames).values()):raise ValueError(f'{slug}: runtime handoff failed')
   results.append({'character':entry['id'],'runtime':True});continue
  source=SOURCE/slug/('sheet.png' if kind=='idle' else 'walk-sheet.png')
  keys,metrics=motion.normalize_frames(kind,extract(Image.open(source),2 if kind=='idle' else 4))
  choices=[]
  gait=[0,0,1,2,2,3,4,4,5,6,6,7]
  orders=([0,a,b,c,b,a] for a,b,c in permutations((1,2,3))) if kind=='idle' else [gait[i:]+gait[:i] for i in range(12)]
  for order in orders:
   frames=[keys[i] for i in order]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   bridges=handoffs(directory,kind,frames)
   if pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(r['pass'] for r in bridges.values()):
    choices.append((semantic['centroidStepMax'],order,frames,pose,semantic,bridges))
  if not choices:
   print(json.dumps({'character':slug,'lastPose':pose,'lastSemantic':semantic},indent=2));raise ValueError(f'{slug}: no loop passes unchanged {kind} gates')
  _,order,frames,pose,semantic,bridges=min(choices,key=lambda value:value[0])
  for frame in frames:
   mask=np.asarray(frame.getchannel('A'))>32
   if mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any():raise ValueError(f'{slug}: clipped body')
  data=webp(frames)
  record={'id':kind,'frames':count,'frameSize':[384,448],'stripSize':[384*count,448],'renderMode':'full','enabled':True,'poseAuthored':True,'sha256':hashlib.sha256(data).hexdigest().upper(),'bytes':len(data),'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'sourceOrder':[i+1 for i in order],'metrics':metrics,'source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper()}
  manifest=json.loads((directory/'manifest.json').read_text()) if (directory/'manifest.json').exists() else {'character':entry['id'],'pipeline':'roster-movement-authored-v1','records':[]}
  manifest['pipeline']='roster-movement-authored-v1'
  manifest.pop('source',None);manifest.pop('sourceSha256',None)
  manifest['records']=[r for r in manifest['records'] if r['id']!=kind]+[record]
  manifest['frameTotal']=manifest['enabledFrameTotal']=sum(r['frames'] for r in manifest['records'])
  pending[directory/f'{kind}.webp']=data
  pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  results.append({'character':entry['id'],'order':record['sourceOrder'],'pose':pose,'semantic':semantic})
 if args.install:
  backups={path:path.read_bytes() if path.exists() else None for path in pending}
  try:
   for path,data in pending.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
  except Exception:
   for path,data in backups.items():
    if data is None:path.unlink(missing_ok=True)
    else:path.write_bytes(data)
   raise
 print(json.dumps(results,indent=2));print('ROSTER_'+kind.upper()+'_'+('RUNTIME_PASS' if args.runtime else 'INSTALLED' if args.install else 'QA_PASS'))

if __name__=='__main__':main()
