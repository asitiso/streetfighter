"""Import a narrowly scoped authored airborne normal using roster extraction/atomic helpers.
No grounded-foot normalization: hips/knees stay tucked, only world jump adds lift.
"""
from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import hashlib,importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
KIND='air-heavy-punch'
ORDER=[0,1,1,2,3,3,3,4,4,5,0,0]
RECIPES={
 KIND:{'rows':3,'order':ORDER,'contacts':[4,5,6],'poseKind':'stand-heavy','reachMax':180},
 'air-heavy-kick':{'rows':3,'order':ORDER,'contacts':[4,5,6],'poseKind':'stand-heavy','reachMax':180},
 'air-light-kick':{'rows':2,'order':[0,1,2,2,3,3,0,0],'contacts':[2,3],'poseKind':'stand-light','reachMax':140,'kickReachMin':24,'kickReachMax':140,'kickBeyondMax':140,'contactRootReachMax':210},
 'air-medium-kick':{'rows':3,'order':[0,1,2,3,3,4,4,5,0,0],'contacts':[3,4],'poseKind':'stand-heavy','reachMax':120},
 'air-medium-punch':{'rows':3,'order':[0,1,2,3,3,4,4,5,0,0],'contacts':[3,4],'poseKind':'stand-heavy','reachMin':38,'reachMax':145,'contactTipBand':[.18,.40]},
 'air-light-punch':{'rows':2,'order':[0,1,2,2,3,3,0,0],'contacts':[2,3],'poseKind':'stand-light','reachMax':105},
}
def roster():
 spec=importlib.util.spec_from_file_location('air_normal_roster',ROOT/'scripts/build-roster-motions.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def qa(frames,motion,kind=KIND,character='KEN'):
 recipe=RECIPES[kind]
 sidekick=character in ('RYU','CHUNLI','YUN','URIEN','GILL','IBUKI') and kind=='air-medium-kick'
 if sidekick:recipe={**recipe,'kickReachMin':65,'kickReachMax':125,'kickBeyondMax':140,'contactRootReachMin':155,'contactRootReachMax':210}
 if character=='URIEN' and kind=='air-medium-kick':recipe={**recipe,'contactRootReachMax':190}
 if character in ('ALEX','MAKOTO','YUN','URIEN','GILL') and kind=='air-light-kick':recipe={**recipe,'contactFootMin':.58}
 if character=='DUDLEY' and kind=='air-medium-kick':recipe={**recipe,'contactTipBand':[.42,.50],'contactTipCheck':'bodyPunchLevel'}
 if character in ('DUDLEY','MAKOTO','URIEN','GILL') and kind=='air-medium-punch':recipe={**recipe,'reachMin':55,'reachMax':70}
 if character in ('DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI') and kind=='air-light-punch':recipe={**recipe,'reachMax':65,'contactTipBand':[.18,.40]}
 if (character=='URIEN' and kind in (KIND,'air-light-punch','air-medium-punch')) or (character=='GILL' and kind in (KIND,'air-light-punch','air-medium-punch')):recipe={**recipe,'contactTipHeightMax':36}
 if character=='IBUKI' and kind=='air-medium-punch':recipe={**recipe,'contactTipHeightMax':36}
 if character in ('YUN','IBUKI') and kind==KIND:recipe={**recipe,'contactTipHeightMin':36}
 if character=='YUN' and kind=='air-medium-punch':recipe={**recipe,'contactRootReachMin':155,'contactRootReachMax':210,'contactTipHeightMax':36}
 if character in ('YUN','URIEN') and kind=='air-heavy-kick':recipe={**recipe,'contactRootReachMin':155,'contactRootReachMax':240}
 if character=='MAKOTO' and kind=='air-heavy-kick':recipe={**recipe,'contactRootReachMin':155,'contactRootReachMax':210}
 if (character=='MAKOTO' and kind in (KIND,'air-light-punch','air-medium-punch')) or (character in ('YUN','IBUKI') and kind=='air-light-punch'):recipe={**recipe,'contactTipHeightMax':36}
 if character in ('DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI') and kind==KIND:recipe={**recipe,'contactTipBand':[.18,.40]}
 if character=='CHUNLI' and kind=='air-medium-kick':recipe={**recipe,'contactTipHeightMin':24}
 if character in ('RYU','ALEX') and kind=='air-light-punch':recipe={**recipe,'contactTipBand':[.18,.40]}
 if character=='CHUNLI' and kind in ('air-light-punch','air-medium-punch'):recipe={**recipe,'contactTipBand':[.18,.40],'contactTipHeightMax':36}
 contacts=recipe['contacts']
 if len(frames)!=len(recipe['order']):raise ValueError('Air motion frame count mismatch')
 masks=[np.asarray(f.getchannel('A'))>=32 for f in frames]
 boxes=[f.getbbox() for f in frames]
 if any(not b for b in boxes):raise ValueError('Empty authored body')
 if any(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any() for a in masks):raise ValueError('Clipped authored body')
 pose=motion.pose_qa(frames,recipe['poseKind'])
 if character=='MAKOTO' and kind in ('air-light-punch','air-light-kick','air-medium-punch'):
  full_body=pose;body_top=boxes[0][1];body_height=boxes[0][3]-body_top;upper=kind!='air-light-kick';saved_height=motion.FRAME_H
  region_top=body_top if upper else body_top+round(body_height*.40);region_bottom=body_top+round(body_height*.58) if upper else saved_height
  region_frames=[f.crop((0,region_top,640,region_bottom)) for f in frames]
  try:
   motion.FRAME_H=region_bottom-region_top;regional=motion.pose_qa(region_frames,recipe['poseKind'])
  finally:motion.FRAME_H=saved_height
  average_pass=full_body['affineResidualAverage']>=full_body['fullPoseAverageThreshold']
  pose={**regional,'scope':'upper-body-joints' if upper else 'lower-body-joints','region':[0,region_top,640,region_bottom],'fullBodyQa':full_body,'upperBodyQa' if upper else 'lowerBodyQa':regional,'fullBodyAveragePass':average_pass,'poseAuthoredPass':average_pass and regional['poseAuthoredPass']}
 centers=np.array([motion._mask_centroid(a) for a in masks]);areas=np.array([a.sum() for a in masks]);height=boxes[0][3]-boxes[0][1]
 top=boxes[0][1]+round(height*.18);bottom=boxes[0][1]+round(height*.58)
 reach=[float(np.nonzero(a[top:bottom])[1].max()) for a in masks]
 contact=[reach[i]-reach[0] for i in contacts]
 heights=[b[3]-b[1] for b in boxes]
 steps=np.sqrt(((centers[1:]-centers[:-1])**2).sum(axis=1))
 feet_widths=[int(np.nonzero(a[b[3]-round((b[3]-b[1])*.15):b[3]])[1].max()-np.nonzero(a[b[3]-round((b[3]-b[1])*.15):b[3]])[1].min()+1) for a,b in zip(masks,boxes)]
 checks={'tuckedFeet':max(feet_widths)<=110,'authoredPose':pose['poseAuthoredPass'],'exactAirGuardReturn':np.array_equal(np.array(frames[0])[:,:,3],np.array(frames[-1])[:,:,3]) and np.array_equal(np.array(frames[0])[np.array(frames[0])[:,:,3]>0],np.array(frames[-1])[np.array(frames[-1])[:,:,3]>0]),'contactReach':all(recipe.get('reachMin',24)<=x<=recipe['reachMax'] for x in contact),'bodyVolumeStable':float(areas.std()/areas.mean())<=.16,'noFrameJump':float(steps.max())<=34,'tuckedScaleStable':all(.85<=h/height<=1.12 for h in heights)}
 semantic={'kind':kind,'contactFrames':[i+1 for i in contacts],'upperBand':[top,bottom],'reachDelta':contact,'centroidStepMax':round(float(steps.max()),6),'areaCv':round(float(areas.std()/areas.mean()),6),'heights':heights,'lowerFootWidths':feet_widths,'checks':checks,'semanticQaPass':all(checks.values())}
 if 'contactTipBand' in recipe:
  tip_levels=[]
  for i in contacts:
   ys,xs=np.nonzero(masks[i]);tip_levels.append(float(ys[xs>=xs.max()-8].mean()-boxes[0][1])/height)
  checks[recipe.get('contactTipCheck','raisedPunchFist')]=all(recipe['contactTipBand'][0]<=y<=recipe['contactTipBand'][1] for y in tip_levels)
  semantic.update(contactTipFractions=tip_levels,semanticQaPass=all(checks.values()))
 if 'contactTipHeightMax' in recipe or (kind==KIND and 'contactTipHeightMin' in recipe):
  tip_heights=[]
  for i in contacts:
   ys,xs=np.nonzero(masks[i]);tip_ys=ys[xs>=xs.max()-8];tip_heights.append(int(tip_ys.max()-tip_ys.min()+1))
  if 'contactTipHeightMax' in recipe:checks['compactJabFist']=all(h<=recipe['contactTipHeightMax'] for h in tip_heights)
  else:checks['openPalmProfile']=all(h>=recipe['contactTipHeightMin'] for h in tip_heights)
  semantic.update(contactTipHeights=tip_heights,semanticQaPass=all(checks.values()))
 if kind in ('air-heavy-kick','air-light-kick') or sidekick:
  lower_top=boxes[0][1]+round(height*.40);lower_bottom=boxes[0][1]+round(height*.75)
  lower_reach=[float(np.nonzero(a[lower_top:lower_bottom])[1].max()) for a in masks]
  hand_reach=[float(np.nonzero(a[top:boxes[0][1]+round(height*.40)])[1].max()) for a in masks]
  kick_delta=[lower_reach[i]-lower_reach[0] for i in contacts];beyond=[lower_reach[i]-hand_reach[i] for i in contacts]
  foot_levels=[]
  for i in contacts:
   ys,xs=np.nonzero(masks[i]);foot_levels.append(float(ys[xs>=xs.max()-8].mean()-boxes[0][1])/height)
  checks['contactReach']=all(recipe.get('kickReachMin',60)<=x<=recipe.get('kickReachMax',240) for x in kick_delta)
  checks['kickBeyondGuardHands']=all(24<=x<=recipe.get('kickBeyondMax',240) for x in beyond)
  checks['raisedContactFoot']=all(recipe.get('contactFootMin',.35)<=y<=.70 for y in foot_levels)
  semantic.update(lowerBand=[lower_top,lower_bottom],kickReachDelta=kick_delta,kickBeyondHands=beyond,contactFootFractions=foot_levels,semanticQaPass=all(checks.values()))
  if character=='IBUKI' and kind=='air-heavy-kick':
   # Frame3 is the raised-leg windup before the authored heel-drop contact.
   wy,wx=np.nonzero(masks[3]);windup=float(wy[wx>=wx.max()-8].mean()-boxes[0][1])/height;drop=[level-windup for level in foot_levels]
   checks['axeHeelDrop']=0<=windup<=.40 and all(delta>=.15 for delta in drop)
   semantic.update(axeWindupFrame=4,axeWindupFootFraction=windup,axeHeelDropFractions=drop,semanticQaPass=all(checks.values()))
  if 'contactTipHeightMin' in recipe:
   tip_heights=[]
   for i in contacts:
    ys,xs=np.nonzero(masks[i]);tip_ys=ys[xs>=xs.max()-8];tip_heights.append(int(tip_ys.max()-tip_ys.min()+1))
   checks['sideKickHeelProfile']=all(h>=recipe['contactTipHeightMin'] for h in tip_heights)
   extension=[int(np.nonzero(a)[1].max())-320 for a in masks]
   checks['contactExtensionPeak']=min(extension[i] for i in contacts)>=max(x for i,x in enumerate(extension) if i not in contacts)
   semantic.update(contactFootTipHeights=tip_heights,tipReachByFrame=extension,semanticQaPass=all(checks.values()))
  if character=='RYU':
   # Ryu's red punching glove may reach the lower band too. Require a
   # predominantly bare-skin foot at the silhouette tip, not only reach.
   foot_skin=[]
   for i in contacts:
    rgb=np.asarray(frames[i],dtype=np.float32)[:,:,:3];red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    tip=masks[i].copy();tip[:,:int(np.nonzero(tip)[1].max())-12]=False
    skin=(red>65)&(green>35)&(blue>20)&(green>red*.45)&(green<red*.92)&(blue<red*.85)
    foot_skin.append(float(skin[tip].mean()))
   checks['bareContactFoot']=all(x>=.75 for x in foot_skin)
   semantic.update(contactFootSkinFractions=foot_skin,semanticQaPass=all(checks.values()))
 if 'contactRootReachMax' in recipe:
  root_reach=[int(np.nonzero(masks[i])[1].max())-320 for i in contacts];checks['shortContactRootReach']=all(recipe.get('contactRootReachMin',24)<=x<=recipe['contactRootReachMax'] for x in root_reach)
  semantic.update(contactRootReach=root_reach,semanticQaPass=all(checks.values()))
 if kind=='air-medium-kick' and not sidekick and character not in ('ALEX','DUDLEY','MAKOTO'):
  knee_top=boxes[0][1]+round(height*.42);knee_bottom=boxes[0][1]+round(height*.75)
  reds=[];skin_front=[];knee_levels=[];guard_front=[]
  for index,(frame,mask) in enumerate(zip(frames,masks)):
   rgb=np.asarray(frame,dtype=np.float32)[:,:,:3];red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
   cloth=mask&(red>75)&(red>green*1.8)&(red>blue*1.8)&(green<130);cloth[:knee_top]=False;cloth[knee_bottom:]=False
   ys,xs=np.nonzero(cloth)
   if not len(xs):raise ValueError('Missing red knee cloth')
   reds.append(int(xs.max()))
   if index in contacts:
    knee_levels.append(float(ys[xs>=xs.max()-6].mean()-boxes[0][1])/height)
    skin=mask&(red>80)&(green>65)&(blue>30)&(red>green*1.05)&(green>blue*1.15)&(green>red*.45);skin[:knee_top]=False
    sx=np.nonzero(skin)[1]
    if not len(sx):raise ValueError('Missing visible bare feet')
    skin_front.append(int(sx.max()))
    # Raised red knees can enter this vertical band; measure guarded hands by
    # their skin/glove colors rather than counting the knee as a hand.
    guard=mask&(red>65)&(green>35)&(blue>20)&(green>red*.45)&(green<red*.92)&(blue<red*.85);guard[:top]=False;guard[boxes[0][1]+round(height*.40):]=False
    gx=np.nonzero(guard)[1]
    if not len(gx):raise ValueError('Missing guarded hands')
    guard_front.append(int(gx.max()))
  knee_delta=[reds[i]-reds[0] for i in contacts]
  hands=guard_front
  beyond=[reds[i]-hand for i,hand in zip(contacts,hands)];behind=[reds[i]-foot for i,foot in zip(contacts,skin_front)]
  checks['contactReach']=all(20<=x<=120 for x in knee_delta)
  checks['kneeBeyondGuardHands']=all(12<=x<=160 for x in beyond)
  checks['bareFeetBehindKnee']=all(12<=x<=200 for x in behind)
  checks['raisedKnee']=all(.40<=y<=.75 for y in knee_levels)
  semantic.update(kneeBand=[knee_top,knee_bottom],kneeReachDelta=knee_delta,kneeBeyondHands=beyond,guardedHandFront=guard_front,bareFeetBehindKnee=behind,kneeTipFractions=knee_levels,semanticQaPass=all(checks.values()))
 if character in ('ALEX','MAKOTO') and kind=='air-medium-kick':
  knee_top=boxes[0][1]+round(height*.42);knee_bottom=boxes[0][1]+round(height*.75)
  fronts=[];levels=[];spans=[];hands=[];boots=[];leading=[]
  for index,(frame,mask) in enumerate(zip(frames,masks)):
   rgb=np.asarray(frame,dtype=np.float32)[:,:,:3];red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
   cloth=mask&((green>35)&(green>=red*.85)&(green>blue*1.15) if character=='ALEX' else (red>100)&(green>90)&(blue>75)&(red<green*1.35)&(green<blue*1.4));cloth[:knee_top]=False;cloth[knee_bottom:]=False
   ys,xs=np.nonzero(cloth)
   if not len(xs):raise ValueError('Missing '+('olive' if character=='ALEX' else 'off-white')+' knee cloth')
   fronts.append(int(xs.max()))
   if index in contacts:
    tip_ys=ys[xs>=xs.max()-8];levels.append(float(tip_ys.mean()-boxes[0][1])/height);spans.append(int(tip_ys.max()-tip_ys.min()+1))
    hands.append(int(np.nonzero(mask[top:boxes[0][1]+round(height*.40)])[1].max()))
    boots.append(int(np.nonzero(mask[knee_bottom:])[1].max()))
    leading.append(int(np.nonzero(mask)[1].max())-int(xs.max()))
  delta=[fronts[i]-fronts[0] for i in contacts];beyond=[fronts[i]-x for i,x in zip(contacts,hands)];behind=[fronts[i]-x for i,x in zip(contacts,boots)]
  checks['contactReach']=all(20<=x<=120 for x in delta)
  checks['kneeBeyondGuardHands']=all(12<=x<=160 for x in beyond)
  checks['foldedBootsBehindKnee' if character=='ALEX' else 'foldedFeetBehindKnee']=all(12<=x<=200 for x in behind)
  checks['raisedKnee']=all(.40<=y<=.75 for y in levels)
  checks['leadingOliveKnee' if character=='ALEX' else 'leadingGiKnee']=all(x<=8 for x in leading)
  checks['broadKneeCloth']=all(x>=35 for x in spans)
  semantic.update(kneeBand=[knee_top,knee_bottom],kneeReachDelta=delta,kneeBeyondHands=beyond,**{'foldedBootsBehindKnee' if character=='ALEX' else 'foldedFeetBehindKnee':behind},kneeTipFractions=levels,leadingTipGap=leading,kneeClothTipSpans=spans,semanticQaPass=all(checks.values()))
 if character=='MAKOTO' and kind=='air-medium-kick':
  gi_fractions=[]
  for i in contacts:
   rgb=np.asarray(frames[i],dtype=np.float32)[:,:,:3];tip=masks[i].copy();tip[:,:int(np.nonzero(tip)[1].max())-8]=False
   red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];gi=(red>100)&(green>90)&(blue>75)&(red<green*1.35)&(green<blue*1.4);gi_fractions.append(float(gi[tip].mean()))
  checks['giContactCloth']=all(x>=.75 for x in gi_fractions)
  semantic.update(contactGiClothFractions=gi_fractions,semanticQaPass=all(checks.values()))
 if character=='DUDLEY' and kind=='air-medium-kick':
  navy_fractions=[]
  for i in contacts:
   rgb=np.asarray(frames[i],dtype=np.float32)[:,:,:3];tip=masks[i].copy();tip[:,:int(np.nonzero(tip)[1].max())-8]=False
   red,green,blue=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2];navy=(blue>green*1.08)&(blue>red*1.05);navy_fractions.append(float(navy[tip].mean()))
  checks['navyContactGlove']=all(x>=.75 for x in navy_fractions)
  semantic.update(contactGloveNavyFractions=navy_fractions,semanticQaPass=all(checks.values()))
 if character=='ALEX' and kind==KIND:
  tip_levels=[]
  for a in masks:
   ys,xs=np.nonzero(a);tip_levels.append(float(ys[xs>=xs.max()-8].mean()-boxes[0][1])/height)
  drops=[tip_levels[i]-tip_levels[recipe['order'].index(2)] for i in contacts]
  checks['hammerFistLevel']=all(.42<=tip_levels[i]<=.65 for i in contacts)
  checks['descendingHammer']=all(d>=.15 for d in drops)
  semantic.update(hammerTipFractions=tip_levels,hammerDropFractions=drops,semanticQaPass=all(checks.values()))
 if not semantic['semanticQaPass']:raise ValueError(json.dumps({'pose':pose,'semantic':semantic}))
 return pose,semantic
def build(root=ROOT,kind=KIND,character='KEN'):
 if character not in ('KEN','RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI') or (character=='IBUKI' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='GILL' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='URIEN' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='YUN' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='MAKOTO' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='DUDLEY' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='ALEX' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')) or (character=='CHUNLI' and kind not in (KIND,'air-heavy-kick','air-light-punch','air-light-kick','air-medium-punch','air-medium-kick')):raise ValueError('Unsupported character/kind selector')
 if kind not in RECIPES:raise ValueError('Unsupported air normal kind')
 recipe=RECIPES[kind];order=recipe['order'];count=len(order)
 slug=character.lower();r=roster();motion=r.module();motion.FRAME_W=640;directory=root/('public/art/animation-hq/'+slug);source=root/('art-source/roster-idle/'+slug+'/'+kind+'-sheet.png')
 manifest=json.loads((directory/'manifest.json').read_text())
 if manifest.get('character')!=character:raise ValueError('Character manifest mismatch')
 image=Image.open(source).convert('RGBA')
 if image.getchannel('A').getextrema()[0]!=0:raise ValueError('Source needs genuine transparent alpha')
 raw=r.extract(image,recipe['rows']);scale=300/raw[0].height;keys=[];metrics=[]
 for index,body in enumerate(raw):
  size=(round(body.width*scale),round(body.height*scale));body=body.resize(size,Image.Resampling.LANCZOS);mask=np.array(body.getchannel('A'))>32;head=np.nonzero(mask[:round(body.height*.20)])[1];anchor=float(head.mean());x=round(320-anchor);y=90
  cell=Image.new('RGBA',(640,448));cell.alpha_composite(body,(x,y));keys.append(cell);metrics.append({'sourcePose':index+1,'sourceSize':list(raw[index].size),'scaledSize':list(size),'paste':[x,y]})
 frames=[keys[i] for i in order];pose,semantic=qa(frames,motion,kind,character);data=r.webp(frames)
 record={'id':kind,'frames':count,'frameSize':[640,448],'stripSize':[640*count,448],'renderMode':'full','enabled':True,'poseAuthored':True,'sha256':hashlib.sha256(data).hexdigest().upper(),'bytes':len(data),'source':source.relative_to(root).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper(),'sourceGrid':[2,recipe['rows']],'sourceOrder':[i+1 for i in order],'poseQa':pose,'semanticQa':semantic,'normalization':{'reference':'airborne-guard','referenceHeight':300,'uniformScale':scale,'rootMode':'head-axis','headTop':90,'footLock':False},'metrics':metrics}
 r.replace_records(manifest,[record]);r.update_frame_totals(manifest)
 return {directory/(kind+'.webp'):data,directory/'manifest.json':(json.dumps(manifest,indent=2)+'\n').encode()},record
def validate_runtime(root=ROOT,kind=KIND,character='KEN'):
 pending,record=build(root,kind,character)
 for path,data in pending.items():
  if path.read_bytes()!=data:raise ValueError('Runtime/source/metadata mismatch: '+str(path))
 return record
def main():
 parser=ArgumentParser(description=__doc__);parser.add_argument('--character',choices=['KEN','RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI'],default='KEN');parser.add_argument('--kind',choices=list(RECIPES),default=KIND);parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
 if args.install and args.runtime:parser.error('Choose install or runtime')
 pending,record=build(kind=args.kind,character=args.character)
 if args.runtime:validate_runtime(kind=args.kind,character=args.character)
 if args.install:roster().write_pending(pending)
 print(json.dumps(record['semanticQa'],indent=2));print(args.character+'_'+args.kind.upper().replace('-','_')+'_'+('INSTALLED' if args.install else 'RUNTIME_PASS' if args.runtime else 'QA_PASS'))
if __name__=='__main__':main()
