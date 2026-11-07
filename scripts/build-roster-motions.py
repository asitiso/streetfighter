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
 # Reuse the light standing-strike gates verbatim for medium punches/palms.
 # Keep Ken's own supported installation set unchanged.
 motion.EXPECTED['dash-back']=7
 motion.TARGET_HEIGHT['dash-back']=332
 motion.GROUND_KINDS.add('dash-back')
 motion.EXPECTED['stand-medium']=8
 motion.TARGET_HEIGHT['stand-medium']=340
 motion.GROUND_KINDS.add('stand-medium')
 motion.EXPECTED['stand-light-kick']=8
 motion.TARGET_HEIGHT['stand-light-kick']=340
 motion.GROUND_KINDS.add('stand-light-kick')
 motion.EXPECTED['stand-medium-kick']=10
 motion.TARGET_HEIGHT['stand-medium-kick']=340
 motion.GROUND_KINDS.add('stand-medium-kick')
 motion.EXPECTED['stand-heavy-kick']=12
 motion.TARGET_HEIGHT['stand-heavy-kick']=340
 motion.GROUND_KINDS.add('stand-heavy-kick')
 motion.EXPECTED['crouch']=6
 motion.TARGET_HEIGHT['crouch']=340
 motion.GROUND_KINDS.add('crouch')
 motion.EXPECTED['crouch-heavy-kick']=12
 motion.TARGET_HEIGHT['crouch-heavy-kick']=220
 motion.GROUND_KINDS.add('crouch-heavy-kick')
 motion.EXPECTED['crouch-medium-kick']=10
 motion.TARGET_HEIGHT['crouch-medium-kick']=220
 motion.GROUND_KINDS.add('crouch-medium-kick')
 motion.EXPECTED['crouch-light-kick']=8
 motion.TARGET_HEIGHT['crouch-light-kick']=220
 motion.GROUND_KINDS.add('crouch-light-kick')
 motion.EXPECTED['crouch-heavy']=10
 motion.TARGET_HEIGHT['crouch-heavy']=220
 motion.GROUND_KINDS.add('crouch-heavy')
 motion.ROSTER_CH_PROFILE='strike'
 motion.EXPECTED['crouch-medium']=8
 motion.TARGET_HEIGHT['crouch-medium']=220
 motion.GROUND_KINDS.add('crouch-medium')
 motion.EXPECTED['crouch-light']=7
 motion.TARGET_HEIGHT['crouch-light']=220
 motion.GROUND_KINDS.add('crouch-light')
 original_semantic=motion.semantic_qa
 def semantic(kind,frames,pose):
  if kind=='dash-back':return backward_dash_semantic_qa(motion,frames,pose)
  if kind=='stand-medium':
   return {**motion.stand_light_semantic_qa(frames,pose),'kind':kind}
  if kind=='crouch-heavy-kick':return crouch_kick_semantic_qa(motion,frames,pose,kind)
  if kind=='crouch-medium-kick':return crouch_medium_kick_semantic_qa(motion,frames,pose,motion.ROSTER_MK_PROFILE)
  if kind=='crouch-light-kick':return crouch_kick_semantic_qa(motion,frames,pose)
  if kind=='stand-light-kick':return kick_semantic_qa(motion,frames,pose)
  if kind=='stand-medium-kick':return medium_kick_semantic_qa(motion,frames,pose,motion.ROSTER_MK_PROFILE)
  if kind=='stand-heavy-kick':return heavy_kick_semantic_qa(motion,frames,pose)
  if kind=='crouch':return crouch_semantic_qa(motion,frames,pose)
  if kind in ('crouch-light','crouch-medium','crouch-heavy'):return crouch_attack_semantic_qa(motion,frames,pose,kind,motion.ROSTER_CH_PROFILE)
  return original_semantic(kind,frames,pose)
 motion.semantic_qa=semantic
 return motion

def backward_dash_semantic_qa(motion,frames,pose):
 report=motion.dash_semantic_qa(frames,pose)
 masks=[motion._binary_mask(frame) for frame in frames]
 box=frames[0].getbbox();upper_end=box[1]+round((box[3]-box[1])*.50)
 def torso_from_feet(mask):
  # Include lifted as well as grounded feet: a narrow sole band can jump
  # to the other foot during forward drive and invert the measured lean.
  ys,_=np.nonzero(mask);lower=mask[max(0,round(ys.max()-(box[3]-box[1])*.30)):]
  _,xs=np.nonzero(lower);foot_midpoint=(float(xs.min())+float(xs.max()))/2
  return motion._mask_centroid(mask[:upper_end])[0]-foot_midpoint
 drive=torso_from_feet(masks[0])-torso_from_feet(masks[3])
 report['checks']['horizontalDrivePresent']=report['checks'].pop('forwardLeanPresent')
 report['checks']['backwardDrivePresent']=8<=drive<=100
 report.update({'kind':'dash-back','backwardDrivePx':round(drive,6),'driveBasis':'upper-half-relative-lower-leg-extent'})
 report['semanticQaPass']=all(report['checks'].values())
 return report

def support_foot(mask):
 # The rear (screen-left) sole is the planted root of a forward low kick.
 # Do not average both feet: the leading foot deliberately leaves the floor.
 ys,xs=np.nonzero(mask)
 if not len(xs):raise ValueError('Missing support foot')
 bottom=int(ys.max());band=mask[max(0,bottom-13):bottom+1]
 labels,count=ndimage.label(band.any(axis=0))
 columns=labels==1
 _,pixels=np.nonzero(band&columns[None,:])
 return float(pixels.mean()),float(bottom)

def kick_semantic_qa(motion,frames,pose,contact=3,lower_fraction=.55,raised_min=24,raised_max=190,kind='stand-light-kick'):
 masks=[motion._binary_mask(frame) for frame in frames]
 supports=np.asarray([support_foot(mask) for mask in masks])
 ys,_=np.nonzero(masks[0]);lower_start=round(float(ys.min())+lower_fraction*float(ys.max()-ys.min()))
 lower=[mask[lower_start:] for mask in masks]
 reaches=[float(np.nonzero(mask)[1].max()) for mask in lower]
 cy,cx=np.nonzero(lower[contact])
 tip_y=float(np.median(cy[cx>=cx.max()-9]))+lower_start
 centroids=np.asarray([motion._mask_centroid(mask) for mask in masks])
 areas=np.asarray([mask.sum() for mask in masks],dtype=float)
 values={
  'startEndIoU':motion._iou(masks[0],masks[-1]),
  'contactIoU':motion._iou(masks[0],masks[contact]),
  'lowerContactIoU':motion._iou(lower[0],lower[contact]),
  'legReachDelta':reaches[contact]-reaches[0],
  'contactFootHeight':float(supports[contact,1]-tip_y),
  'supportCenterRange':float(np.ptp(supports[:,0])),
  'supportBaselineRange':float(np.ptp(supports[:,1])),
  'centroidXRange':float(np.ptp(centroids[:,0])),
  'centroidYRange':float(np.ptp(centroids[:,1])),
  'areaCv':float(areas.std()/areas.mean()),
  'residualAverage':float(pose['affineResidualAverage']),
  'residualMax':float(pose['affineResidualMax']),
 }
 checks={
  'recoveryTowardNeutral':values['startEndIoU']>=.58,
  'contactPoseDistinct':.22<=values['contactIoU']<=.94,
  'legArticulationPresent':values['lowerContactIoU']<=.88,
  'legReachPresent':24<=values['legReachDelta']<=160,
  'raisedFootPresent':raised_min<=values['contactFootHeight']<=raised_max,
  'supportRootStable':values['supportCenterRange']<=8,
  'supportBaselineStable':values['supportBaselineRange']<=4,
  'bodyRootStable':values['centroidXRange']<=62 and values['centroidYRange']<=35,
  'bodyVolumeStable':values['areaCv']<=.18,
  'authoredMotionAverage':.010<=values['residualAverage']<=.15,
  'authoredMotionPeak':.022<=values['residualMax']<=.20,
 }
 return {'kind':kind,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}

def grounded_sole_count(mask):
 # A 24px band includes the small perspective-height difference between
 # planted soles, while excluding the deliberately lifted striking foot.
 ys,_=np.nonzero(mask);bottom=int(ys.max())
 labels,_=ndimage.label(mask[max(0,bottom-23):bottom+1].any(axis=0))
 return int(sum(size>=6 for size in np.bincount(labels)[1:]))

def medium_kick_semantic_qa(motion,frames,pose,profile):
 kind='stand-medium-kick';masks=[motion._binary_mask(frame) for frame in frames]
 if profile=='hook':
  # Dudley's MK is SWAY HOOK. Preserve the existing standing-strike limits,
  # sampling its actual contact phase rather than asking for a lifted leg.
  limits={**motion.STAND_LIGHT_SEMANTIC_LIMITS,'contactFrameIndex':4}
  report=motion._standing_attack_semantic_qa(frames,pose,kind,limits)
  supports=np.asarray([support_foot(mask) for mask in masks])
  report['checks'].update({
   'bothFeetPlanted':grounded_sole_count(masks[4])>=2,
   'supportRootStable':float(np.ptp(supports[:,0]))<=8,
   'supportBaselineStable':float(np.ptp(supports[:,1]))<=4,
  })
 elif profile in ('kick','knee'):
  report=kick_semantic_qa(motion,frames,pose,contact=4,lower_fraction=.40,raised_min=48,raised_max=225,kind=kind)
  report['checks']['oneSupportFoot']=grounded_sole_count(masks[4])==1
  if profile=='knee':
   # Alex drives a folded knee; its toes need not reach beyond neutral toes.
   # Require a clearly lifted/folded leg and knee drive ahead of the root.
   report['checks'].pop('legReachPresent')
   ys,_=np.nonzero(masks[0]);cut=round(float(ys.min())+.40*float(ys.max()-ys.min()))
   reach=float(np.nonzero(masks[4][cut:])[1].max())
   drive=reach-support_foot(masks[4])[0];report['kneeDriveFromSupport']=round(drive,6)
   report['checks']['kneeDrivePresent']=drive>=60 and report['lowerContactIoU']<=.72
 else:raise ValueError('Unknown 5MK semantic profile')
 report['semanticProfile']=profile;report['semanticQaPass']=all(report['checks'].values())
 return report

def heavy_kick_semantic_qa(motion,frames,pose):
 # A high, slow heavy kick needs room for its lifted leg and counterbalance.
 # Keep prior kick defaults unchanged; use a dedicated high-kick envelope.
 report=kick_semantic_qa(motion,frames,pose,contact=5,lower_fraction=.25,raised_min=200,raised_max=300,kind='stand-heavy-kick')
 masks=[motion._binary_mask(frame) for frame in frames]
 report['checks'].update({
  'contactPoseDistinct':.22<=report['contactIoU']<=.75,
  'legReachPresent':38<=report['legReachDelta']<=190,
  'bodyRootStable':report['centroidXRange']<=80 and report['centroidYRange']<=65,
  'bodyVolumeStable':report['areaCv']<=.20,
  'authoredMotionAverage':.014<=report['residualAverage']<=.18,
  'authoredMotionPeak':.030<=report['residualMax']<=.24,
  'oneSupportFoot':all(grounded_sole_count(masks[i])==1 for i in (5,6)),
 })
 report['semanticQaPass']=all(report['checks'].values())
 return report

def crouch_semantic_qa(motion,frames,pose):
 masks=[motion._binary_mask(frame) for frame in frames]
 heights=np.asarray([frame.getbbox()[3]-frame.getbbox()[1] for frame in frames],dtype=float)
 centers=np.asarray([motion._mask_centroid(mask) for mask in masks])
 feet=np.asarray([motion._foot_metrics(mask) for mask in masks])
 baselines=np.asarray([np.nonzero(mask)[0].max() for mask in masks],dtype=float)
 areas=np.asarray([mask.sum() for mask in masks],dtype=float)
 values={
  'heightRatio':float(heights[-1]/heights[0]),
  'maxHeightRise':float(np.diff(heights).max()),
  'centroidDrop':float(centers[-1,1]-centers[0,1]),
  'centroidXRange':float(np.ptp(centers[:,0])),
  'footCenterRange':float(np.ptp(feet[:,0])),
  'footWidthCv':float(feet[:,1].std()/feet[:,1].mean()),
  'footBaselineRange':float(np.ptp(baselines)),
  'areaCv':float(areas.std()/areas.mean()),
  'residualAverage':float(pose['affineResidualAverage']),
  'residualMax':float(pose['affineResidualMax']),
 }
 checks={
  'crouchCompression':.48<=values['heightRatio']<=.78,
  'progressiveLowering':values['maxHeightRise']<=8,
  'bodyLowers':26<=values['centroidDrop']<=120,
  'horizontalRootStable':values['centroidXRange']<=45,
  'feetStayPlanted':values['footCenterRange']<=8 and values['footBaselineRange']<=4,
  'stanceWidthStable':values['footWidthCv']<=.22,
  'bodyVolumeStable':values['areaCv']<=.24,
  'authoredMotionAverage':.010<=values['residualAverage']<=.18,
  'authoredMotionPeak':.022<=values['residualMax']<=.25,
 }
 return {'kind':'crouch',**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}

def crouch_height_qa(frames,report):
 heights=np.asarray([frame.getbbox()[3]-frame.getbbox()[1] for frame in frames],dtype=float)
 ratios=heights/heights[0]
 report.update({'minHeightRatio':round(float(ratios.min()),6),'maxHeightRatio':round(float(ratios.max()),6)})
 report['checks']['lowPostureMaintained']=bool(np.all((ratios>=.85)&(ratios<=1.10)))
 report['semanticQaPass']=all(report['checks'].values())
 return report

def crouch_kick_semantic_qa(motion,frames,pose,kind='crouch-light-kick'):
 # Low foot strikes may skim the floor; preserve standing/2LK defaults.
 contact=5 if kind=='crouch-heavy-kick' else 4 if kind=='crouch-medium-kick' else 3
 report=kick_semantic_qa(motion,frames,pose,contact=contact,raised_min=0,raised_max=80,kind=kind)
 if kind=='crouch-medium-kick':report['checks']['legReachPresent']=38<=report['legReachDelta']<=160
 if kind=='crouch-heavy-kick':
  # Reuse heavy reach/articulation limits, keeping the low posture/root envelope.
  report['checks'].update({
   'contactPoseDistinct':.22<=report['contactIoU']<=.75,
   'legReachPresent':38<=report['legReachDelta']<=190,
   'authoredMotionAverage':.014<=report['residualAverage']<=.18,
   'authoredMotionPeak':.030<=report['residualMax']<=.24,
  })
 return crouch_height_qa(frames,report)

def crouch_medium_kick_semantic_qa(motion,frames,pose,profile):
 if profile=='kick':
  report=crouch_kick_semantic_qa(motion,frames,pose,'crouch-medium-kick')
 elif profile=='knee':
  report=medium_kick_semantic_qa(motion,frames,pose,'knee')
 elif profile=='hook':
  report=crouch_attack_semantic_qa(motion,frames,pose,'crouch-medium',contact=4)
  masks=[motion._binary_mask(frame) for frame in frames]
  supports=np.asarray([support_foot(mask) for mask in masks])
  report['checks'].update({
   'bothFeetPlanted':all(grounded_sole_count(masks[i])>=2 for i in (4,5)),
   'supportRootStable':float(np.ptp(supports[:,0]))<=8,
   'supportBaselineStable':float(np.ptp(supports[:,1]))<=4,
  })
 else:raise ValueError('Unknown crouching MK semantic profile')
 report.update({'kind':'crouch-medium-kick','semanticProfile':profile})
 return crouch_height_qa(frames,report)

def crouch_attack_semantic_qa(motion,frames,pose,kind='crouch-light',profile='strike',contact=None):
 heavy=kind=='crouch-heavy'
 if heavy and profile not in ('strike','shoulder'):raise ValueError('Unknown 2HP semantic profile')
 limits=motion.STAND_HEAVY_SEMANTIC_LIMITS if heavy else motion.STAND_LIGHT_SEMANTIC_LIMITS
 default_contact=5 if heavy else 3
 contact=default_contact if contact is None else contact
 contact_limits=limits if contact==default_contact else {**limits,'contactFrameIndex':contact}
 report=motion._standing_attack_semantic_qa(frames,pose,kind,contact_limits)
 masks=[motion._binary_mask(frame) for frame in frames]
 heights=np.asarray([frame.getbbox()[3]-frame.getbbox()[1] for frame in frames],dtype=float)
 feet=np.asarray([motion._foot_metrics(mask) for mask in masks])
 report['checks'].update({
  'lowPostureMaintained':bool(np.all((heights/heights[0]>=.85)&(heights/heights[0]<=1.10))),
  'feetStayPlanted':float(np.ptp(feet[:,0]))<=8 and float(np.ptp([np.nonzero(mask)[0].max() for mask in masks]))<=4,
 })
 if kind in ('crouch-medium','crouch-heavy'):
  # Wide crouching feet can dominate the full-body right edge. Measure the
  # actual contact advance in a fixed shoulder/forearm band instead, excluding
  # head and legs. Keep LP's existing metric and all numeric limits unchanged.
  box=frames[0].getbbox();height=box[3]-box[1]
  top=box[1]+round(height*.30);bottom=box[1]+round(height*.62)
  reach=[float(np.nonzero(mask[top:bottom])[1].max()) for mask in masks]
  advance=reach[contact]-reach[0]
  report.update({'reachBasis':'fixed-shoulder-forearm-band','upperBand':[top,bottom],'upperContactReachDelta':advance})
  report['checks']['attackReachPresent']=limits['reachRangeMin']<=advance<=limits['reachRangeMax']
  if heavy:
   report['semanticProfile']=profile
   if profile=='shoulder':
    centers=[motion._mask_centroid(mask[top:bottom])[0] for mask in masks]
    drive=centers[contact]-centers[0];report['upperContactDriveDelta']=round(drive,6)
    report['checks']['attackReachPresent']=limits['centroidXRangeMin']<=drive<=limits['centroidXRangeMax']
 report['semanticQaPass']=all(report['checks'].values())
 return report

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
 if kind in ('dash','dash-back'):
  base=load_peer('idle')[0];tag='DashBack' if kind=='dash-back' else 'Dash'
  return {'idleTo'+tag:compare(base,frames[0],h.DASH_START_LIMITS),tag[0].lower()+tag[1:]+'ToIdle':compare(frames[-1],base,h.DASH_END_LIMITS)}
 if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
  base=load_peer('crouch')[-1];tag=''.join(part.title() for part in kind.split('-'))
  return {'crouchTo'+tag:compare(base,frames[0],h.STAND_LIGHT_BASE_LIMITS),tag[0].lower()+tag[1:]+'ToCrouch':compare(frames[-1],base,h.STAND_LIGHT_BASE_LIMITS)}
 base_limits={'crouch':h.STAND_LIGHT_BASE_LIMITS,'hit':h.HIT_BASE_LIMITS,'guard':h.GUARD_BASE_LIMITS,'parry':h.PARRY_BASE_LIMITS,'stand-heavy-kick':h.STAND_LIGHT_BASE_LIMITS,'stand-medium-kick':h.STAND_LIGHT_BASE_LIMITS,'stand-light-kick':h.STAND_LIGHT_BASE_LIMITS,'stand-medium':h.STAND_LIGHT_BASE_LIMITS,'stand-light':h.STAND_LIGHT_BASE_LIMITS,'stand-heavy':h.STAND_HEAVY_BASE_LIMITS}
 if kind in base_limits:
  base=load_peer('idle')[0];limits=base_limits[kind];tag=''.join(part.title() for part in kind.split('-'))
  bridges={'idleTo'+tag:compare(base,frames[0],limits),tag[0].lower()+tag[1:]+'ToIdle':compare(frames[0] if kind=='crouch' else frames[-1],base,limits)}
  if kind=='crouch':
   for peer in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):
    if peer not in records:continue
    start,end=load_peer(peer);tag=''.join(part.title() for part in peer.split('-'))
    bridges['crouchTo'+tag]=compare(frames[-1],start,h.STAND_LIGHT_BASE_LIMITS)
    bridges[tag[0].lower()+tag[1:]+'ToCrouch']=compare(end,frames[-1],h.STAND_LIGHT_BASE_LIMITS)
  return bridges
 bridges={}
 for peer in ('idle','walk','walk-back'):
  if peer==kind or peer not in records:continue
  peer_first,peer_last=load_peer(peer)
  bridges[f'{kind}To{peer}']=compare(frames[-1],peer_first,h.WALK_BACK_BASE_LIMITS)
  bridges[f'{peer}To{kind}']=compare(peer_last,frames[0],h.WALK_BACK_BASE_LIMITS)
 if kind=='idle':
  for peer,tag in [('dash','Dash'),('dash-back','DashBack')]:
   if peer not in records:continue
   start,end=load_peer(peer)
   bridges['idleTo'+tag]=compare(frames[0],start,h.DASH_START_LIMITS)
   bridges[tag[0].lower()+tag[1:]+'ToIdle']=compare(end,frames[0],h.DASH_END_LIMITS)
 if kind=='idle' and ('jump' in records or 'landing' in records):
  if 'jump' not in records or 'landing' not in records:raise ValueError('Installed air pair is incomplete')
  jump_start,jump_end=load_peer('jump');landing_start,landing_end=load_peer('landing')
  bridges['idleToJump']=compare(frames[0],jump_start,h.JUMP_BASE_LIMITS)
  bridges['jumpToLanding']=compare(jump_end,landing_start,h.JUMP_LANDING_LIMITS)
  bridges['landingToIdle']=compare(landing_end,frames[0],h.LANDING_END_LIMITS)
 if kind=='idle':
  for peer,limits in base_limits.items():
   if peer in records:
    start,end=load_peer(peer)
    if peer=='crouch':end=start # Release reverses the strip back to standing.
    tag=''.join(part.title() for part in peer.split('-'))
    bridges['idleTo'+tag]=compare(frames[0],start,limits)
    bridges[tag[0].lower()+tag[1:]+'ToIdle']=compare(end,frames[0],limits)
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
 parser=ArgumentParser(description=__doc__);parser.add_argument('--kind',choices=['crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','crouch','idle','walk','walk-back','dash','dash-back','air','hit','guard','parry','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick'],default='idle');parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose --install or --runtime')
 if args.kind=='air':return air_batch(args)
 motion=module();pending={};results=[];kind=args.kind;count=motion.EXPECTED[kind]
 width=640 if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','dash','dash-back','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick') else 384;motion.FRAME_W=width
 for entry in CONFIG:
  slug=entry['slug'];directory=ROOT/f'public/art/animation-hq/{slug}'
  profile=entry.get('attackRecipes',{}).get('stand-medium-kick',{}).get('semanticProfile','kick')
  if kind in ('stand-medium-kick','crouch-medium-kick') and profile not in ('kick','knee','hook'):raise ValueError('Invalid MK semantic profile')
  motion.ROSTER_MK_PROFILE=profile
  heavy_profile=entry.get('attackRecipes',{}).get('crouch-heavy',{}).get('semanticProfile','strike')
  if kind=='crouch-heavy' and heavy_profile not in ('strike','shoulder'):raise ValueError('Invalid 2HP profile')
  motion.ROSTER_CH_PROFILE=heavy_profile
  if args.runtime:
   manifest=json.loads((directory/'manifest.json').read_text());record=next(r for r in manifest['records'] if r['id']==kind)
   if not record['enabled'] or not record['poseAuthored'] or record['frames']!=count:raise ValueError(f'{slug}: runtime record mismatch')
   if record['frameSize']!=[width,448] or record['stripSize']!=[width*count,448]:raise ValueError(f'{slug}: runtime cell metadata mismatch')
   if kind in ('stand-medium-kick','crouch-medium-kick') and record.get('semanticProfile')!=profile:raise ValueError('Runtime MK semantic profile mismatch')
   if kind=='crouch-heavy' and record.get('semanticProfile')!=heavy_profile:raise ValueError('Runtime 2HP profile mismatch')
   if kind in ('dash','dash-back') and record.get('facingRelativeDirection')!=('backward' if kind=='dash-back' else 'forward'):raise ValueError(f'{slug}: dash direction metadata mismatch')
   data=(directory/f'{kind}.webp').read_bytes();sheet=Image.open(BytesIO(data)).convert('RGBA')
   if sheet.size!=(width*count,448):raise ValueError(f'{slug}: invalid runtime dimensions')
   if hashlib.sha256(data).hexdigest().upper()!=record['sha256']:raise ValueError(f'{slug}: checksum mismatch')
   frames=[sheet.crop((i*width,0,(i+1)*width,448)) for i in range(count)]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   if not pose['poseAuthoredPass'] or not semantic['semanticQaPass']:raise ValueError(f'{slug}: runtime quality failed')
   if not all(r['pass'] for r in handoffs(directory,kind,frames).values()):raise ValueError(f'{slug}: runtime handoff failed')
   results.append({'character':entry['id'],'runtime':True});continue
  source=SOURCE/slug/({'crouch-heavy-kick':'crouch-heavy-kick-sheet.png','crouch-medium-kick':'crouch-medium-kick-sheet.png','crouch-light-kick':'crouch-light-kick-sheet.png','crouch-heavy':'crouch-heavy-sheet.png','crouch-medium':'crouch-medium-sheet.png','crouch-light':'crouch-light-sheet.png','crouch':'crouch-sheet.png','idle':'sheet.png','walk':'walk-sheet.png','walk-back':'retreat-sheet.png','dash':'dash-sheet.png','dash-back':'dash-back-sheet.png','hit':'hit-sheet.png','guard':'guard-sheet.png','parry':'parry-sheet.png','stand-heavy-kick':'stand-heavy-kick-sheet.png','stand-medium-kick':'stand-medium-kick-sheet.png','stand-light-kick':'stand-light-kick-sheet.png','stand-medium':'stand-medium-sheet.png','stand-light':'stand-light-sheet.png','stand-heavy':'stand-heavy-sheet.png'}[kind])
  attack_recipe=entry.get('attackRecipes',{}).get(kind) if kind in ('stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick') else None
  rows=attack_recipe['rows'] if attack_recipe else {'crouch-heavy-kick':3,'crouch-medium-kick':3,'crouch-light-kick':3,'crouch-heavy':3,'crouch-medium':3,'crouch-light':2,'crouch':2,'idle':2,'walk':4,'walk-back':3,'dash':3,'dash-back':3,'hit':3,'guard':2,'parry':2,'stand-light':3,'stand-medium':2,'stand-heavy':3,'stand-light-kick':2,'stand-medium-kick':2,'stand-heavy-kick':3}[kind]
  raw=extract(Image.open(source),rows);normalization=None;overrides=[]
  if kind=='guard':
   for recipe in entry.get('guardOverrides',[]):
    extra=SOURCE/slug/recipe['source'];target=recipe['pose']-1
    raw[target]=extract(Image.open(extra),recipe['rows'])[recipe['sourcePose']-1]
    overrides.append({'frames':[i+1 for i,pose in enumerate(GUARD_ORDER) if pose==target],'source':extra.relative_to(ROOT).as_posix(),'sourcePose':recipe['sourcePose'],'sourceSha256':hashlib.sha256(extra.read_bytes()).hexdigest().upper()})
  if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','crouch','dash','dash-back','hit','guard','parry','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick'):
   if kind=='dash' and 'dashEntry' in entry:
    recipe=entry['dashEntry'];extra=SOURCE/slug/recipe['source']
    raw[0]=extract(Image.open(extra),recipe['rows'])[recipe['pose']-1]
    overrides.append({'frame':1,'source':extra.relative_to(ROOT).as_posix(),'sourcePose':recipe['pose'],'sourceSha256':hashlib.sha256(extra.read_bytes()).hexdigest().upper()})
   base_kind='crouch' if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else 'idle'
   base_index=5 if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick') else 0
   idle=Image.open(directory/f'{base_kind}.webp').convert('RGBA').crop((base_index*384,0,(base_index+1)*384,448));box=idle.getbbox();idle_height=box[3]-box[1]
   heights=[frame.getbbox()[3]-frame.getbbox()[1] for frame in raw]
   # Use standing recovery as the anatomical scale reference. A median of
   # compressed dash poses would enlarge every limb when returning to guard.
   reference_height=heights[0] if kind=='crouch' else heights[-1]
   motion.TARGET_HEIGHT[kind]=idle_height*float(np.median(heights))/reference_height
   normalization={'reference':'idle-recovery-height','referenceHeight':idle_height,'sourceGuardHeight':reference_height,'uniformScale':idle_height/reference_height}
  keys,metrics=motion.normalize_frames(kind,raw)
  if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','crouch','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick'):
   # Extended fists change the silhouette's bounding-box center. Anchor the
   # support feet to the matching guard, so the planted stance does not slide when
   # the arm extends. Wide cells preserve complete fists at the same scale.
   support_anchor=kind in ('stand-light-kick','stand-heavy-kick','crouch-light-kick','crouch-heavy-kick') or (kind in ('stand-medium-kick','crouch-medium-kick') and profile!='hook')
   foot_center=(lambda mask:support_foot(mask)[0]) if support_anchor else (lambda mask:motion._foot_metrics(mask)[0])
   target=foot_center(np.asarray(idle.getchannel('A'))>24)+(width-384)/2
   if support_anchor:normalization['footAnchorMode']='rear-support'
   if kind=='crouch':normalization.update({'reference':'idle-standing-height','footAnchorMode':'two-foot','standingReferenceFrame':1})
   if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick'):normalization.update({'reference':'crouch-recovery-height','footAnchorMode':'rear-support' if support_anchor else 'two-foot','referenceFrame':6})
   normalization['footAnchorX']=target
   for index,frame in enumerate(keys):
    foot=foot_center(np.asarray(frame.getchannel('A'))>24);shift=round(target-foot)
    aligned=Image.new('RGBA',(width,448));aligned.alpha_composite(frame,(shift,0));keys[index]=aligned
    metrics[index]['paste'][0]+=shift;metrics[index]['footAnchorShift']=shift
  choices=[]
  gait=[0,0,1,2,2,3,4,4,5,6,6,7] if kind=='walk' else [0,0,1,2,2,3,4,4,5,5]
  orders=([0,a,b,c,b,a] for a,b,c in permutations((1,2,3))) if kind=='idle' else [gait[i:]+gait[:i] for i in range(count)]
  if kind=='crouch-heavy-kick':orders=[[0,0,1,2,2,3,3,4,4,5,5,5]]
  if kind=='crouch-medium-kick':orders=[[0,0,1,2,3,3,4,4,5,5]]
  if kind=='crouch-light-kick':orders=[[0,1,2,3,4,4,5,5]]
  if kind=='crouch-heavy':orders=[[0,0,1,2,3,3,4,4,5,5]]
  if kind=='crouch-medium':orders=[[0,1,2,3,4,4,5,5]]
  if kind=='crouch-light':orders=[[0,1,1,2,1,1,3]]
  if kind=='crouch':orders=[[0,1,1,2,2,3]]
  if kind in ('dash','dash-back'):orders=[[0,1,2,2,3,4,5]]
  if kind=='hit':orders=[[0,1,2,2,3,4,5,5]]
  # A long block holds its initial frame. Start already shielding instead of
  # holding the neutral reference pose while an attack is being blocked.
  if kind=='guard':orders=[GUARD_ORDER]
  if kind=='parry':orders=[[0,1,2,2,3,3]]
  if kind=='stand-light':orders=[[0,1,2,3,4,4,5]]
  if kind=='stand-heavy-kick':orders=[[0,0,1,2,2,3,3,4,4,4,5,5]]
  if kind=='stand-medium-kick':orders=[[0,0,1,1,2,2,1,1,3,3]]
  if kind=='stand-light-kick':orders=[[0,1,1,2,1,1,3,3]]
  if kind=='stand-medium':orders=[[0,1,1,2,1,1,3,3]]
  if kind=='stand-heavy':orders=[[0,0,1,2,3,3,4,4,4,5]]
  if attack_recipe:
   order=attack_recipe['sourceOrder']
   if len(order)!=count or any(type(i) is not int or not 1<=i<=len(keys) for i in order):raise ValueError(f'{slug}: invalid {kind} source order')
   orders=[[i-1 for i in order]]
  for order in orders:
   frames=[keys[i] for i in order]
   pose=motion.pose_qa(frames,kind);semantic=motion.semantic_qa(kind,frames,pose)
   bridges=handoffs(directory,kind,frames)
   if pose['poseAuthoredPass'] and semantic['semanticQaPass'] and all(r['pass'] for r in bridges.values()):
    choices.append((semantic.get('centroidStepMax',0),order,frames,pose,semantic,bridges))
  if not choices:
   print(json.dumps({'character':slug,'lastPose':pose,'lastSemantic':semantic,'handoffs':bridges},indent=2));raise ValueError(f'{slug}: no candidate passes unchanged {kind} gates')
  _,order,frames,pose,semantic,bridges=min(choices,key=lambda value:value[0])
  for frame in frames:
   mask=np.asarray(frame.getchannel('A'))>32
   if mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any():raise ValueError(f'{slug}: clipped body')
  data=webp(frames)
  record={'id':kind,'frames':count,'frameSize':[width,448],'stripSize':[width*count,448],'renderMode':'full','enabled':True,'poseAuthored':True,'sha256':hashlib.sha256(data).hexdigest().upper(),'bytes':len(data),'poseQa':pose,'semanticQa':semantic,'handoffQa':bridges,'sourceOrder':[i+1 for i in order],'metrics':metrics,'source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper()}
  if normalization:record['normalization']=normalization
  if kind in ('crouch-light','crouch-medium','crouch-heavy','crouch-light-kick','crouch-medium-kick','crouch-heavy-kick','crouch','stand-light','stand-medium','stand-heavy','stand-light-kick','stand-medium-kick','stand-heavy-kick'):record['sourceGrid']=[2,rows]
  if kind in ('stand-medium-kick','crouch-medium-kick'):record['semanticProfile']=profile
  if kind=='crouch-heavy':record['semanticProfile']=heavy_profile
  if kind in ('dash','dash-back'):record['facingRelativeDirection']='backward' if kind=='dash-back' else 'forward'
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
