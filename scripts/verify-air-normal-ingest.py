"""Positive and adversarial tests for the scoped airborne normal importer."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from argparse import ArgumentParser
import importlib.util,json,shutil
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('air_normal',ROOT/'scripts/build-air-normal.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
parser=ArgumentParser();parser.add_argument('--character',choices=['KEN','RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI'],default='KEN');parser.add_argument('--kind',choices=list(m.RECIPES),default=m.KIND);args=parser.parse_args();kind=args.kind;character=args.character;slug=character.lower()
count=len(m.RECIPES[kind]['order']);contacts=m.RECIPES[kind]['contacts']
r=m.roster();motion=r.module();motion.FRAME_W=640
pending,record=m.build(kind=kind,character=character);strip=Image.open(ROOT/('public/art/animation-hq/'+slug+'/'+kind+'.webp')).convert('RGBA');frames=[strip.crop((i*640,0,(i+1)*640,448)) for i in range(count)];m.qa(frames,motion,kind,character)
checks=0
if character=='MAKOTO' and kind=='air-light-kick':
 assert record['poseQa']['scope']=='lower-body-joints'
 assert record['poseQa']['fullBodyAveragePass'] and record['poseQa']['lowerBodyQa']['poseAuthoredPass']
 assert motion.FRAME_H==448
if character=='MAKOTO' and kind in ('air-light-punch','air-medium-punch'):
 assert record['poseQa']['scope']=='upper-body-joints'
 assert record['poseQa']['fullBodyAveragePass'] and record['poseQa']['upperBodyQa']['poseAuthoredPass']
 assert motion.FRAME_H==448,'Regional QA must restore shared render height'

def reject(fn,cue=None):
 global checks
 try:fn()
 except (ValueError,FileNotFoundError) as e:
  if cue:assert cue in str(e),str(e)
  if character in ('URIEN','GILL') and cue in ('raisedPunchFist','compactJabFist','shortContactRootReach','kickBeyondGuardHands','contactReach','raisedContactFoot'):
   assert json.loads(str(e))['semantic']['checks'][cue] is False,str(e)
  if character in ('YUN','IBUKI') and cue in ('openPalmProfile','axeHeelDrop','raisedPunchFist','shortContactRootReach','kickBeyondGuardHands','compactJabFist','contactReach','raisedContactFoot'):
   assert json.loads(str(e))['semantic']['checks'][cue] is False,str(e)
  if character=='MAKOTO' and (kind=='air-medium-punch' and cue in ('raisedPunchFist','compactJabFist','contactReach') or kind=='air-medium-kick' and cue in ('contactReach','kneeBeyondGuardHands','foldedFeetBehindKnee','leadingGiKnee','broadKneeCloth','giContactCloth')):
   assert json.loads(str(e))['semantic']['checks'][cue] is False,'Expected semantic gate must actually fail: '+str(e)
  checks+=1;return
 raise AssertionError('Invalid air motion accepted')
for index in contacts:
 bad=list(frames);bad[index]=frames[0];reject(lambda:m.qa(bad,motion,kind,character),'contactReach')
reject(lambda:m.qa([frames[0]]*count,motion,kind,character),'authoredPose')
translated=[]
for i in range(count):
 cell=Image.new('RGBA',(640,448));cell.alpha_composite(frames[0],(i*2,0));translated.append(cell)
reject(lambda:m.qa(translated,motion,kind,character),'authoredPose')
bad=list(frames);bad[-1]=frames[3];reject(lambda:m.qa(bad,motion,kind,character),'exactAirGuardReturn')
bad=list(frames);bad[5]=frames[5].copy();bad[5].putpixel((0,100),(255,0,0,255));reject(lambda:m.qa(bad,motion,kind,character),'Clipped')
ground=Image.open(ROOT/('public/art/animation-hq/'+slug+'/stand-heavy.webp')).convert('RGBA');ground_record=next(x for x in json.loads((ROOT/('public/art/animation-hq/'+slug+'/manifest.json')).read_bytes())['records'] if x['id']=='stand-heavy');gw=ground_record['frameSize'][0];gn=ground_record['frames'];planted=[]
for i in range(count):
 body=ground.crop((min(i,gn-1)*gw,0,(min(i,gn-1)+1)*gw,448));box=body.getbbox();body=body.crop(box);body=body.resize((round(body.width*300/body.height),300));cell=Image.new('RGBA',(640,448));cell.alpha_composite(body,(320-body.width//2,90));planted.append(cell)
reject(lambda:m.qa(planted,motion,kind,character),'tuckedFeet')
if kind in ('air-heavy-kick','air-light-kick'):
 peer=Image.open(ROOT/('public/art/animation-hq/'+slug+'/air-heavy-punch.webp')).convert('RGBA')
 ground_kick=Image.open(ROOT/('public/art/animation-hq/'+slug+'/stand-heavy-kick.webp')).convert('RGBA');record_ground=next(x for x in json.loads((ROOT/('public/art/animation-hq/'+slug+'/manifest.json')).read_bytes())['records'] if x['id']=='stand-heavy-kick');width_ground=record_ground['frameSize'][0]
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'bareContactFoot' if character=='RYU' else 'raisedContactFoot' if character in ('ALEX','MAKOTO') and kind=='air-light-kick' else 'kickBeyondGuardHands')
  bad=list(frames);body=ground_kick.crop((5*width_ground,0,6*width_ground,448));cell=Image.new('RGBA',(640,448));cell.alpha_composite(body,((640-width_ground)//2,0));bad[index]=cell;reject(lambda:m.qa(bad,motion,kind,character))
if kind in ('air-light-punch','air-light-kick','air-medium-punch'):
 reject(lambda:m.qa(frames[:-1],motion,kind,character),'frame count')
 peer=Image.open(ROOT/('public/art/animation-hq/'+slug+'/air-heavy-kick.webp')).convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedContactFoot' if character in ('ALEX','URIEN') and kind=='air-light-kick' else 'shortContactRootReach' if kind=='air-light-kick' else 'raisedPunchFist' if kind=='air-medium-punch' else 'contactReach')
if kind=='air-medium-kick':
 reject(lambda:m.qa(frames[:-1],motion,kind,character),'frame count')
 for peer_kind,peer_index in [('air-heavy-punch',4),('air-heavy-kick',4),('air-light-kick',2)]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach' if character=='IBUKI' and peer_kind=='air-light-kick' else 'sideKickHeelProfile' if character=='CHUNLI' and peer_kind=='air-light-kick' else ('leadingGiKnee' if peer_kind=='air-heavy-punch' else 'broadKneeCloth') if character=='MAKOTO' else 'broadKneeCloth' if character=='ALEX' else 'bodyPunchLevel' if character=='DUDLEY' else ('kickBeyondGuardHands' if peer_kind=='air-heavy-punch' else 'shortContactRootReach') if character in ('YUN','URIEN','GILL','IBUKI') else None)
if character in ('RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI') and kind=='air-medium-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/ken/air-medium-kick.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((3*640,0,4*640,448));reject(lambda:m.qa(bad,motion,kind,character),'navyContactGlove' if character=='DUDLEY' else None)
if character=='RYU' and kind in ('air-light-punch','air-medium-punch'):
 peer=Image.open(ROOT/('public/art/animation-hq/'+slug+'/air-heavy-punch.webp')).convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedPunchFist')
if character=='ALEX' and kind=='air-medium-kick':
 for peer_kind,peer_index in [('air-light-punch',2),('air-medium-punch',3)]:
  peer=Image.open(ROOT/('public/art/animation-hq/alex/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'leadingOliveKnee')
if character=='ALEX' and kind in ('air-light-punch','air-medium-punch'):
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedPunchFist')
if character=='CHUNLI' and kind in ('air-light-punch','air-medium-punch'):
 peer=Image.open(ROOT/'public/art/animation-hq/chunli/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'compactJabFist')
if character=='CHUNLI' and kind=='air-medium-kick':
 bad=list(frames);cell=Image.new('RGBA',(640,448));cell.alpha_composite(frames[contacts[0]],(12,0));bad[2]=cell;reject(lambda:m.qa(bad,motion,kind,character),'contactExtensionPeak')
if character in ('RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL','IBUKI'):
 reject(lambda:m.qa(frames[:-1],motion,kind,character),'frame count')
 reject(lambda:m.build(kind=kind,character='UNKNOWN'),'Unsupported character/kind')
if character=='DUDLEY' and kind=='air-medium-kick':
 for peer_slug,peer_kind,peer_index in [('dudley','air-light-punch',2),('dudley','air-medium-punch',3),('alex','air-heavy-punch',4)]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'bodyPunchLevel')
if character=='DUDLEY' and kind=='air-medium-punch':
 for peer_kind,peer_index in [('air-heavy-punch',4),('air-light-punch',2)]:
  peer=Image.open(ROOT/('public/art/animation-hq/dudley/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach')
if character=='DUDLEY' and kind=='air-light-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/dudley/air-light-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((2*640,0,3*640,448));reject(lambda:m.qa(bad,motion,kind,character),'kickBeyondGuardHands')
if character=='DUDLEY' and kind=='air-light-punch':
 peer=Image.open(ROOT/'public/art/animation-hq/dudley/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach')
if character=='DUDLEY' and kind==m.KIND:
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedPunchFist')
if character=='MAKOTO' and kind=='air-medium-kick':
 for peer_slug,peer_kind,peer_index,cue in [('makoto','air-light-punch',2,'leadingGiKnee'),('makoto','air-medium-punch',3,'leadingGiKnee'),('alex','air-medium-kick',3,'giContactCloth')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='MAKOTO' and kind=='air-medium-punch':
 for peer_slug,cue in [('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
 for peer_kind,peer_index in [('air-heavy-punch',4),('air-light-punch',2)]:
  peer=Image.open(ROOT/('public/art/animation-hq/makoto/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach')
if character=='MAKOTO' and kind=='air-light-kick':
 frozen=[];upper=frames[0].crop((0,0,640,210))
 for dx in [0,48,-48,48,-48,48,0,0]:
  cell=frames[0].copy();cell.paste((0,0,0,0),(0,0,640,210));cell.alpha_composite(upper,(dx,0));frozen.append(cell)
 try:m.qa(frozen,motion,kind,character)
 except ValueError as e:
  evidence=json.loads(str(e))['pose'];assert evidence['fullBodyQa']['poseAuthoredPass'];assert not evidence['lowerBodyQa']['poseAuthoredPass'];assert not evidence['poseAuthoredPass'];checks+=1
 else:raise AssertionError('Frozen legs accepted as authored kick')
 assert motion.FRAME_H==448
 with patch.object(motion,'pose_qa',side_effect=[record['poseQa']['fullBodyQa'],ValueError('fixture lower-region failure')]):
  reject(lambda:m.qa(frames,motion,kind,character),'fixture lower-region failure')
 assert motion.FRAME_H==448
 for peer_slug,peer_kind,peer_index in [('makoto','air-light-punch',2),('alex','air-heavy-punch',4)]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedContactFoot')
if character=='MAKOTO' and kind=='air-light-punch':
 for peer_slug,peer_kind,peer_index,cue in [('makoto','air-heavy-punch',4,'contactReach'),('alex','air-heavy-punch',4,'raisedPunchFist'),('chunli','air-heavy-punch',4,'compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='MAKOTO' and kind in ('air-light-punch','air-medium-punch'):
 # Moving only legs must not satisfy authored upper-body motion, even when full-body ECC passes.
 frozen=[];lower=frames[0].crop((0,264,640,448))
 for dx in [0]+[48 if i%2 else -48 for i in range(1,count-2)]+[0,0]:
  cell=frames[0].copy();cell.paste((0,0,0,0),(0,264,640,448));cell.alpha_composite(lower,(dx,264));frozen.append(cell)
 try:m.qa(frozen,motion,kind,character)
 except ValueError as e:
  evidence=json.loads(str(e))['pose'];assert evidence['fullBodyQa']['poseAuthoredPass'];assert not evidence['upperBodyQa']['poseAuthoredPass'];assert not evidence['poseAuthoredPass'];checks+=1
 else:raise AssertionError('Frozen arms accepted as authored jab')
 assert motion.FRAME_H==448
 with patch.object(motion,'pose_qa',side_effect=[record['poseQa']['fullBodyQa'],ValueError('fixture upper-region failure')]):
  reject(lambda:m.qa(frames,motion,kind,character),'fixture upper-region failure')
 assert motion.FRAME_H==448,'Regional QA must restore render height after failure'
if character=='MAKOTO' and kind=='air-heavy-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'shortContactRootReach')
if character=='MAKOTO' and kind==m.KIND:
 for peer_slug,cue in [('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character in ('URIEN','GILL') and kind=='air-medium-punch':
 for peer_kind,peer_index in [('air-heavy-punch',4),('air-light-punch',2)]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach')
 for peer_slug,cue in [('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character in ('URIEN','GILL') and kind=='air-light-kick':
 for peer_slug,peer_kind,peer_index in [('alex','air-heavy-punch',4),(slug,'air-light-punch',2)]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedContactFoot')
if character in ('URIEN','GILL') and kind=='air-light-punch':
 for peer_slug,cue in [(slug,'contactReach'),('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character in ('URIEN','GILL') and kind=='air-heavy-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'contactReach' if character=='GILL' else 'shortContactRootReach')
if character in ('URIEN','GILL') and kind==m.KIND:
 for peer_slug,cue in [('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='URIEN':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='YUN' and kind=='air-medium-punch':
 for peer_slug,peer_kind,peer_index,cue in [('yun','air-heavy-punch',4,'compactJabFist'),('yun','air-light-punch',2,'shortContactRootReach'),('alex','air-heavy-punch',4,'raisedPunchFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='YUN' and kind=='air-light-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedContactFoot')
if character=='YUN' and kind=='air-light-punch':
 for peer_slug,cue in [('yun','compactJabFist'),('alex','raisedPunchFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='YUN' and kind=='air-heavy-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'shortContactRootReach')
if character=='YUN' and kind==m.KIND:
 for peer_slug,cue in [('makoto','openPalmProfile'),('alex','raisedPunchFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='YUN':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='MAKOTO':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='DUDLEY':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='ALEX':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='ALEX' and kind==m.KIND:
 for index in contacts:
  bad=list(frames);cell=frames[index].copy();tip=cell.crop((430,90,640,448));cell.paste((0,0,0,0),(430,90,640,448));cell.alpha_composite(tip,(430,25));bad[index]=cell;reject(lambda:m.qa(bad,motion,kind,character),'hammerFistLevel')
if character=='CHUNLI':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='GILL':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='IBUKI' and kind==m.KIND:
 peer=Image.open(ROOT/'public/art/animation-hq/gill/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'openPalmProfile')
 peer=Image.open(ROOT/'public/art/animation-hq/alex/air-heavy-punch.webp').convert('RGBA')
 for index in contacts:
  bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),'raisedPunchFist')
if character=='IBUKI':reject(lambda:m.build(kind='unknown-air-kind',character=character),'Unsupported character/kind')
if character=='IBUKI' and kind=='air-heavy-kick':
 peer=Image.open(ROOT/'public/art/animation-hq/gill/air-heavy-kick.webp').convert('RGBA')
 peer_frames=[peer.crop((i*640,0,(i+1)*640,448)) for i in range(count)]
 reject(lambda:m.qa(peer_frames,motion,kind,character),'axeHeelDrop')
 bad=list(frames);bad[3]=frames[contacts[0]];reject(lambda:m.qa(bad,motion,kind,character),'axeHeelDrop')
if character=='IBUKI' and kind=='air-light-punch':
 for peer_slug,cue in [('ibuki','compactJabFist'),('alex','raisedPunchFist'),('chunli','compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/air-heavy-punch.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((4*640,0,5*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='IBUKI' and kind=='air-light-kick':
 for peer_slug,peer_kind,peer_index,cue in [('ibuki','air-light-punch',2,'kickBeyondGuardHands'),('alex','air-heavy-punch',4,'contactReach')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='IBUKI' and kind=='air-medium-punch':
 for peer_slug,peer_kind,peer_index,cue in [('ibuki','air-heavy-punch',4,'compactJabFist'),('ibuki','air-light-punch',2,'contactReach'),('alex','air-heavy-punch',4,'raisedPunchFist'),('chunli','air-heavy-punch',4,'compactJabFist')]:
  peer=Image.open(ROOT/('public/art/animation-hq/'+peer_slug+'/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),cue)
if character=='IBUKI' and kind=='air-medium-kick':
 for peer_kind,peer_index in [('air-light-punch',2),('air-medium-punch',3)]:
  peer=Image.open(ROOT/('public/art/animation-hq/ibuki/'+peer_kind+'.webp')).convert('RGBA')
  for index in contacts:
   bad=list(frames);bad[index]=peer.crop((peer_index*640,0,(peer_index+1)*640,448));reject(lambda:m.qa(bad,motion,kind,character),'kickBeyondGuardHands')
with TemporaryDirectory() as td:
 root=Path(td);source=root/('art-source/roster-idle/'+slug+'/'+kind+'-sheet.png');source.parent.mkdir(parents=True);shutil.copy2(ROOT/('art-source/roster-idle/'+slug+'/'+kind+'-sheet.png'),source);directory=root/('public/art/animation-hq/'+slug);directory.mkdir(parents=True);shutil.copy2(ROOT/('public/art/animation-hq/'+slug+'/manifest.json'),directory/'manifest.json');new,rec=m.build(root,kind,character);r.write_pending(new);m.validate_runtime(root,kind,character);original={p:p.read_bytes() for p in new};
 asset=directory/(kind+'.webp');asset.write_bytes(b'corrupt');reject(lambda:m.validate_runtime(root,kind,character),'mismatch');asset.write_bytes(original[asset]);
 manifest=directory/'manifest.json';data=json.loads(manifest.read_bytes());next(x for x in data['records'] if x['id']==kind)['sourceOrder'][4]=1;manifest.write_text(json.dumps(data));reject(lambda:m.validate_runtime(root,kind,character),'mismatch');manifest.write_bytes(original[manifest]);
 if character in ('RYU','CHUNLI','ALEX','DUDLEY','MAKOTO','GILL','IBUKI'):
  data=json.loads(original[manifest]);data['character']='KEN';manifest.write_text(json.dumps(data));reject(lambda:m.build(root,kind,character),'Character manifest mismatch');manifest.write_bytes(original[manifest])
 source_original=source.read_bytes();Image.new('RGBA',(1024,1536),(10,10,10,255)).save(source);reject(lambda:m.build(root,kind,character),'transparent');source.write_bytes(source_original);
 source.unlink();reject(lambda:m.build(root,kind,character));source.write_bytes(source_original);
 # Inject one manifest-write failure: shared atomic helper must restore both files.
 write=Path.write_bytes;failed=[False]
 def faulty(path,data):
  if path==manifest and not failed[0]:failed[0]=True;raise OSError('fixture write failure')
  return write(path,data)
 try:
  with patch.object(Path,'write_bytes',faulty):r.write_pending({asset:b'replaced',manifest:b'replaced'})
 except OSError:pass
 else:raise AssertionError('Expected injected failure')
 assert all(p.read_bytes()==b for p,b in original.items());checks+=1
 before=json.loads(original[manifest]);after=json.loads(m.build(root,kind,character)[0][manifest]);assert before==after;checks+=1
print('AIR_NORMAL_INGEST_PASS',{'character':character,'kind':kind,'negativeAndPreservationChecks':checks,'frames':count,'reusedAtomicRosterHelpers':True})
