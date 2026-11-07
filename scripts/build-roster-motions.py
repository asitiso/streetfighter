"""Build the six missing roster movement strips using existing quality gates.

Source sheets are generated key poses (2x2 idle/air/defense, 2x4 walk, 2x3 retreat/dash/hit).
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
GUARD_ORDER=[1,1,2,2,3]

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
 manifest_path=directory/'manifest.json'
 manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'records':[]}
 records={r['id']:r for r in manifest['records']}
 if kind!='idle' and 'idle' not in records:raise ValueError('Install idle before locomotion')
 spec=importlib.util.spec_from_file_location('roster_handoff',ROOT/'scripts/audit-ken-handoff-semantics.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 def load_peer(peer):
  record=records[peer];data=(directory/f'{peer}.webp').read_bytes()
  if not record['enabled'] or not record['poseAuthored']:raise ValueError('Installed peer is not authored and enabled')
  if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError('Installed peer checksum mismatch')
  strip=Image.open(BytesIO(data)).convert('RGBA');width=record['frameSize'][0]
  if strip.size!=(record['frames']*width,448):raise ValueError('Installed peer dimensions mismatch')
  return [strip.crop((i*width,0,(i+1)*width,448)) for i in (0,record['frames']-1)]
 def compare(a,b,limits):
  width=max(a.width,b.width)
  def pad(frame):
   image=Image.new('RGBA',(width,448));image.alpha_composite(frame,((width-frame.width)//2,0));return image
  return h.compare_motion_bridge(h.alpha_mask(pad(a)),h.alpha_mask(pad(b)),limits)
 if kind=='dash':
  base=load_peer('idle')[0]
  return {'idleToDash':compare(base,frames[0],h.DASH_START_LIMITS),'dashToIdle':compare(frames[-1],base,h.DASH_END_LIMITS)}
 if kind in ('hit','guard','parry'):
  base=load_peer('idle')[0];limits={'hit':h.HIT_BASE_LIMITS,'guard':h.GUARD_BASE_LIMITS,'parry':h.PARRY_BASE_LIMITS}[kind]
  return {'idleTo'+kind.title():compare(base,frames[0],limits),kind+'ToIdle':compare(frames[-1],base,limits)}
 bridges={}
 for peer in ('idle','walk','walk-back'):
  if peer==kind or peer not in records:continue
  peer_first,peer_last=load_peer(peer)
  bridges[f'{kind}To{peer}']=compare(frames[-1],peer_first,h.WALK_BACK_BASE_LIMITS)
  bridges[f'{peer}To{kind}']=compare(peer_last,frames[0],h.WALK_BACK_BASE_LIMITS)
 if kind=='idle' and 'dash' in records:
  start,end=load_peer('dash')
  bridges['idleToDash']=compare(frames[0],start,h.DASH_START_LIMITS)
  bridges['dashToIdle']=compare(end,frames[0],h.DASH_END_LIMITS)
 if kind=='idle' and ('jump' in records or 'landing' in records):
  if 'jump' not in records or 'landing' not in records:raise ValueError('Installed air pair is incomplete')
  jump_start,jump_end=load_peer('jump');landing_start,landing_end=load_peer('landing')
  bridges['idleToJump']=compare(frames[0],jump_start,h.JUMP_BASE_LIMITS)
  bridges['jumpToLanding']=compare(jump_end,landing_start,h.JUMP_LANDING_LIMITS)
  bridges['landingToIdle']=compare(landing_end,frames[0],h.LANDING_END_LIMITS)
 if kind=='idle':
  for peer,limits in [('hit',h.HIT_BASE_LIMITS),('guard',h.GUARD_BASE_LIMITS),('parry',h.PARRY_BASE_LIMITS)]:
   if peer in records:
    start,end=load_peer(peer)
    bridges['idleTo'+peer.title()]=compare(frames[0],start,limits)
    bridges[peer+'ToIdle']=compare(end,frames[0],limits)
 return bridges

def webp(frames):
 width=frames[0].width;strip=Image.new('RGBA',(width*len(frames),448))
 for index,frame in enumerate(frames):strip.alpha_composite(frame,(width*index,0))
 data=BytesIO();strip.save(data,'WEBP',lossless=True,method=4)
 return data.getvalue()

def write_pending(pending):
 backups={path:path.read_bytes() if path.exists() else None for path in pending}
 try:
  for path,data in pending.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 except Exception:
  for path,data in backups.items():
   if data is None:path.unlink(missing_ok=True)
   else:path.write_bytes(data)
  raise

def replace_records(manifest,records):
 # Preserve installed order when replacing a motion after newer motions were
 # added. Only first-time records append; reinstallation stays reviewable.
 updates={record['id']:record for record in records}
 installed=[updates.pop(record['id'],record) for record in manifest['records']]
 manifest['records']=installed+list(updates.values())

def air_bridges(directory,jump,landing):
 manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']=='idle')
 data=(directory/'idle.webp').read_bytes()
 if not record['enabled'] or not record['poseAuthored'] or hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError('Installed idle peer is corrupt or disabled')
 strip=Image.open(BytesIO(data)).convert('RGBA')
 if strip.size!=(record['frames']*384,448):raise ValueError('Installed idle peer dimensions mismatch')
 base=strip.crop((0,0,384,448))
 spec=importlib.util.spec_from_file_location('roster_air_handoff',ROOT/'scripts/audit-ken-handoff-semantics.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 def compare(a,b,limits):return h.compare_motion_bridge(h.alpha_mask(a),h.alpha_mask(b),limits)
 return {'idleToJump':compare(base,jump[0],h.JUMP_BASE_LIMITS),'jumpToLanding':compare(jump[-1],landing[0],h.JUMP_LANDING_LIMITS),'landingToIdle':compare(landing[-1],base,h.LANDING_END_LIMITS)}

def air_batch(args):
 motion=module();pending={};reports=[]
 orders={'jump':[0,0,1,1,2,2,3,3],'landing':[0,1,1,2,2,3]}
 for entry in CONFIG:
  slug=entry['slug'];directory=ROOT/f'public/art/animation-hq/{slug}';manifest_path=directory/'manifest.json'
  manifest=json.loads(manifest_path.read_text());sequences={};records=[]
  if args.runtime:
   for kind,count in [('jump',8),('landing',6)]:
    record=next(r for r in manifest['records'] if r['id']==kind);data=(directory/f'{kind}.webp').read_bytes()
    if not record['enabled'] or not record['poseAuthored'] or record['frames']!=count or record['frameSize']!=[384,448] or record['stripSize']!=[384*count,448]:raise ValueError(f'{slug}: invalid {kind} metadata')
    if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError(f'{slug}: {kind} checksum mismatch')
    strip=Image.open(BytesIO(data)).convert('RGBA')
    if strip.size!=(384*count,448):raise ValueError(f'{slug}: {kind} runtime dimensions mismatch')
    sequences[kind]=[strip.crop((i*384,0,(i+1)*384,448)) for i in range(count)]
  else:
   raw={kind:extract(Image.open(SOURCE/slug/f'{kind}-sheet.png'),2) for kind in orders}
   idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();idle_height=box[3]-box[1]
   box=raw['landing'][-1].getbbox();guard_height=box[3]-box[1];scale=idle_height/guard_height
   for kind in orders:
    heights=[frame.getbbox()[3]-frame.getbbox()[1] for frame in raw[kind]]
    motion.TARGET_HEIGHT[kind]=scale*float(np.median(heights))
    keys,metrics=motion.normalize_frames(kind,raw[kind]);frames=[keys[i].copy() for i in orders[kind]]
    if kind=='jump':
     # Anticipation, extended launch and landing-ready legs share a foot root.
     # Only the tucked apex lifts the feet within the cell. Fighter supplies
     # world jump height separately, so centering extended launch poses would
     # add a second abrupt body lift at takeoff.
     for index in (0,1,2,3,6,7):
      offset=423-frames[index].getbbox()[3];anchored=Image.new('RGBA',(384,448));anchored.alpha_composite(frames[index],(0,offset));frames[index]=anchored
    normalization={'reference':'paired-landing-guard-height','uniformScale':scale,'referenceHeight':idle_height,'sourceGuardHeight':guard_height}
    if kind=='jump':normalization.update({'footRootFrames':[1,2,3,4,7,8],'footBaseline':423,'apexCenterY':220})
    sequences[kind]=frames;source=SOURCE/slug/f'{kind}-sheet.png';data=webp(frames)
    record={'id':kind,'frames':len(frames),'frameSize':[384,448],'stripSize':[384*len(frames),448],'renderMode':'full','enabled':True,'poseAuthored':True,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper(),'sourceOrder':[i+1 for i in orders[kind]],'metrics':metrics,'normalization':normalization}
    records.append(record);pending[directory/f'{kind}.webp']=data
  bridges=air_bridges(directory,sequences['jump'],sequences['landing']);quality={}
  for kind,frames in sequences.items():
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose);quality[kind]={'pose':pose,'semantic':semantic}
   for frame in frames:
    mask=np.asarray(frame.getchannel('A'))>32
    if mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any():raise ValueError(f'{slug}: {kind} clipped body')
  if not all(q['pose']['poseAuthoredPass'] and q['semantic']['semanticQaPass'] for q in quality.values()) or not all(b['pass'] for b in bridges.values()):
   print(json.dumps({'character':slug,'quality':quality,'handoffs':bridges},indent=2));raise ValueError(f'{slug}: air pair failed unchanged quality gates')
  if not args.runtime:
   for record in records:
    record.update({'poseQa':quality[record['id']]['pose'],'semanticQa':quality[record['id']]['semantic'],'handoffQa':bridges})
   replace_records(manifest,records)
   manifest['frameTotal']=manifest['enabledFrameTotal']=sum(r['frames'] for r in manifest['records'])
   pending[manifest_path]=(json.dumps(manifest,indent=2)+'\n').encode()
  reports.append({'character':slug,'quality':quality,'handoffs':bridges})
 if args.install:write_pending(pending)
 print(json.dumps(reports,indent=2));print('ROSTER_AIR_'+('RUNTIME_PASS' if args.runtime else 'INSTALLED' if args.install else 'QA_PASS'))

def main():
 parser=ArgumentParser(description=__doc__);parser.add_argument('--kind',choices=['idle','walk','walk-back','dash','air','hit','guard','parry'],default='idle');parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose --install or --runtime')
 if args.kind=='air':return air_batch(args)
 motion=module();pending={};results=[];kind=args.kind;count=motion.EXPECTED[kind]
 width=640 if kind=='dash' else 384;motion.FRAME_W=width
 for entry in CONFIG:
  slug=entry['slug'];directory=ROOT/f'public/art/animation-hq/{slug}'
  if args.runtime:
   manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']==kind)
   if not record['enabled'] or not record['poseAuthored'] or record['frames']!=count:raise ValueError(f'{slug}: runtime record mismatch')
   if record['frameSize']!=[width,448] or record['stripSize']!=[width*count,448]:raise ValueError(f'{slug}: runtime cell metadata mismatch')
   if kind=='dash' and record.get('facingRelativeDirection')!='forward':raise ValueError(f'{slug}: dash direction metadata mismatch')
   data=(directory/f'{kind}.webp').read_bytes();sheet=Image.open(BytesIO(data)).convert('RGBA')
   if sheet.size!=(width*count,448):raise ValueError(f'{slug}: invalid runtime dimensions')
   if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError(f'{slug}: checksum mismatch')
   frames=[sheet.crop((i*width,0,(i+1)*width,448)) for i in range(count)]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   if not pose['poseAuthoredPass'] or not semantic['semanticQaPass']:raise ValueError(f'{slug}: runtime quality failed')
   if not all(r['pass'] for r in handoffs(directory,kind,frames).values()):raise ValueError(f'{slug}: runtime handoff failed')
   results.append({'character':entry['id'],'runtime':True});continue
  source=SOURCE/slug/({'idle':'sheet.png','walk':'walk-sheet.png','walk-back':'retreat-sheet.png','dash':'dash-sheet.png','hit':'hit-sheet.png','guard':'guard-sheet.png','parry':'parry-sheet.png'}[kind])
  raw=extract(Image.open(source),{'idle':2,'walk':4,'walk-back':3,'dash':3,'hit':3,'guard':2,'parry':2}[kind]);normalization=None;overrides=[]
  if kind=='guard':
   for recipe in entry.get('guardOverrides',[]):
    extra=SOURCE/slug/recipe['source'];target=recipe['pose']-1
    raw[target]=extract(Image.open(extra),recipe['rows'])[recipe['sourcePose']-1]
    overrides.append({'frames':[i+1 for i,pose in enumerate(GUARD_ORDER) if pose==target],'source':extra.relative_to(ROOT).as_posix(),'sourcePose':recipe['sourcePose'],'sourceSha256':hashlib.sha256(extra.read_bytes()).hexdigest().upper()})
  if kind in ('dash','hit','guard','parry'):
   if kind=='dash' and 'dashEntry' in entry:
    recipe=entry['dashEntry'];extra=SOURCE/slug/recipe['source']
    raw[0]=extract(Image.open(extra),recipe['rows'])[recipe['pose']-1]
    overrides.append({'frame':1,'source':extra.relative_to(ROOT).as_posix(),'sourcePose':recipe['pose'],'sourceSha256':hashlib.sha256(extra.read_bytes()).hexdigest().upper()})
   idle=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,384,448));box=idle.getbbox();idle_height=box[3]-box[1]
   heights=[frame.getbbox()[3]-frame.getbbox()[1] for frame in raw]
   # Use standing recovery as the anatomical scale reference. A median of
   # compressed dash poses would enlarge every limb when returning to guard.
   motion.TARGET_HEIGHT[kind]=idle_height*float(np.median(heights))/heights[-1]
   normalization={'reference':'idle-recovery-height','referenceHeight':idle_height,'sourceGuardHeight':heights[-1],'uniformScale':idle_height/heights[-1]}
  keys,metrics=motion.normalize_frames(kind,raw)
  choices=[]
  gait=[0,0,1,2,2,3,4,4,5,6,6,7] if kind=='walk' else [0,0,1,2,2,3,4,4,5,5]
  orders=([0,a,b,c,b,a] for a,b,c in permutations((1,2,3))) if kind=='idle' else [gait[i:]+gait[:i] for i in range(count)]
  if kind=='dash':orders=[[0,1,2,2,3,4,5]]
  if kind=='hit':orders=[[0,1,2,2,3,4,5,5]]
  # A long block holds its initial frame. Start already shielding instead of
  # holding the neutral reference pose while an attack is being blocked.
  if kind=='guard':orders=[GUARD_ORDER]
  if kind=='parry':orders=[[0,1,2,2,3,3]]
  for order in orders:
   frames=[keys[i] for i in order]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   bridges=handoffs(directory,kind,frames)
   if pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(r['pass'] for r in bridges.values()):
    choices.append((semantic['centroidStepMax'],order,frames,pose,semantic,bridges))
  if not choices:
   print(json.dumps({'character':slug,'lastPose':pose,'lastSemantic':semantic,'handoffs':bridges},indent=2));raise ValueError(f'{slug}: no candidate passes unchanged {kind} gates')
  _,order,frames,pose,semantic,bridges=min(choices,key=lambda value:value[0])
  for frame in frames:
   mask=np.asarray(frame.getchannel('A'))>32
   if mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any():raise ValueError(f'{slug}: clipped body')
  data=webp(frames)
  record={'id':kind,'frames':count,'frameSize':[width,448],'stripSize':[width*count,448],'renderMode':'full','enabled':True,'poseAuthored':True,'sha256':hashlib.sha256(data).hexdigest().upper(),'bytes':len(data),'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'sourceOrder':[i+1 for i in order],'metrics':metrics,'source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper()}
  if normalization:record['normalization']=normalization
  if kind=='dash':record['facingRelativeDirection']='forward'
  if overrides:record['sourceOverrides']=overrides
  manifest=json.loads((directory/'manifest.json').read_text()) if (directory/'manifest.json').exists() else {'character':entry['id'],'pipeline':'roster-movement-authored-v1','records':[]}
  manifest['pipeline']='roster-movement-authored-v1'
  manifest.pop('source',None);manifest.pop('sourceSha256',None)
  replace_records(manifest,[record])
  manifest['frameTotal']=manifest['enabledFrameTotal']=sum(r['frames'] for r in manifest['records'])
  pending[directory/f'{kind}.webp']=data
  pending[directory/'manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  results.append({'character':entry['id'],'order':record['sourceOrder'],'pose':pose,'semantic':semantic})
 if args.install:
  write_pending(pending)
 print(json.dumps(results,indent=2));print('ROSTER_'+kind.upper()+'_'+('RUNTIME_PASS' if args.runtime else 'INSTALLED' if args.install else 'QA_PASS'))

if __name__=='__main__':main()
