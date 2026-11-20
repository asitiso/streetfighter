"""Import the authored victory strip with shared extraction/atomic helpers."""
from pathlib import Path
from argparse import ArgumentParser
import hashlib,importlib.util,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ORDER=[0,0,1,1,2,2,3,3]
def roster():
 spec=importlib.util.spec_from_file_location('victory_roster',ROOT/'scripts/build-roster-motions.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def qa(frames,motion):
 if len(frames)!=8 or any(f.size!=(640,448) for f in frames):raise ValueError('Victory frame count/dimensions mismatch')
 masks=[np.array(f.getchannel('A'))>=32 for f in frames];boxes=[f.getbbox() for f in frames]
 if any(not b for b in boxes):raise ValueError('Empty victory pose')
 if any(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any() for a in masks):raise ValueError('Clipped victory pose')
 centers=np.array([[np.nonzero(a)[1].mean(),np.nonzero(a)[0].mean()] for a in masks]);feet=[];floors=[];widths=[]
 for a in masks:
  y,x=np.nonzero(a);bottom=y.max();fy,fx=np.nonzero(a[max(0,bottom-24):bottom+1]);feet.append(float(fx.mean()));floors.append(int(bottom));widths.append(int(fx.max()-fx.min()+1))
 area=np.array([a.sum() for a in masks]);heights=[b[3]-b[1] for b in boxes]
 distinct=len({hashlib.sha256(np.where(np.array(f)[:,:,3:4]>0,np.array(f),0).tobytes()).digest() for f in frames})
 pose=motion.pose_qa(frames,'stand-heavy')
 checks={'authoredJoints':pose['poseAuthoredPass'],'fourDistinctDrawings':distinct==4,'plantedFeet':np.ptp(feet)<=2 and np.ptp(floors)<=1,'stableStance':max(widths)/min(widths)<=1.3,'bodyVolumeStable':float(area.std()/area.mean())<=.18,'scaleStable':all(.9<=h/heights[0]<=1.1 for h in heights),'noFrameJump':float(np.linalg.norm(np.diff(centers,axis=0),axis=1).max())<=30}
 checks={k:bool(v) for k,v in checks.items()}
 semantic={'checks':checks,'semanticQaPass':bool(all(checks.values())),'distinctDrawings':distinct,'footCenters':feet,'footFloors':floors,'stanceWidths':widths,'areaCv':round(float(area.std()/area.mean()),6),'centroidStepMax':round(float(np.linalg.norm(np.diff(centers,axis=0),axis=1).max()),6)}
 if not semantic['semanticQaPass']:raise ValueError(json.dumps({'pose':pose,'semantic':semantic}))
 return pose,semantic
def build(root=ROOT,character='KEN'):
 if character not in {'KEN','RYU','CHUNLI','IBUKI','ALEX','DUDLEY','MAKOTO','YUN','URIEN','GILL'}:raise ValueError('Unsupported victory character')
 directory=root/f'public/art/animation-hq/{character.lower()}';source=root/f'art-source/roster-idle/{character.lower()}/victory-sheet.png';manifest=json.loads((directory/'manifest.json').read_text())
 if manifest.get('character')!=character:raise ValueError('Character manifest mismatch')
 image=Image.open(source).convert('RGBA')
 if image.getchannel('A').getextrema()[0]!=0:raise ValueError('Source requires transparent alpha')
 r=roster();motion=r.module();motion.FRAME_W=640;raw=r.extract(image,2)
 idle=next(x for x in manifest['records'] if x['id']=='idle');idle_data=(directory/'idle.webp').read_bytes()
 if hashlib.sha256(idle_data).hexdigest().upper()!=idle['sha256']:raise ValueError('Idle reference checksum mismatch')
 ref=Image.open(directory/'idle.webp').convert('RGBA').crop((0,0,idle['frameSize'][0],448));mask=np.array(ref.getchannel('A'))>=32;y,x=np.nonzero(mask);floor=int(y.max());height=int(y.max()-y.min()+1);fx=np.nonzero(mask[max(0,floor-24):floor+1])[1];center=float(fx.mean())+(640-ref.width)/2;scale=height/raw[0].height;keys=[]
 for body in raw:
  body=body.resize((round(body.width*scale),round(body.height*scale)),Image.Resampling.LANCZOS);a=np.array(body.getchannel('A'))>=32;yy,xx=np.nonzero(a);bottom=int(yy.max());foot=np.nonzero(a[max(0,bottom-24):bottom+1])[1];px=round(center-float(foot.mean()));py=floor-bottom;cell=Image.new('RGBA',(640,448));cell.alpha_composite(body,(px,py));keys.append(cell)
 frames=[keys[i] for i in ORDER];pose,semantic=qa(frames,motion);data=r.webp(frames)
 record={'id':'victory','frames':8,'frameSize':[640,448],'stripSize':[5120,448],'renderMode':'full','enabled':True,'poseAuthored':True,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'source':source.relative_to(root).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest().upper(),'sourceGrid':[2,2],'sourceOrder':[i+1 for i in ORDER],'poseQa':pose,'semanticQa':semantic,'normalization':{'reference':'installed-idle','referenceHeight':height,'footFloor':floor,'footCenter':center,'uniformScale':scale,'footLock':True}}
 r.replace_records(manifest,[record]);r.update_frame_totals(manifest)
 return {directory/'victory.webp':data,directory/'manifest.json':(json.dumps(manifest,indent=2)+'\n').encode()},record
def validate_runtime(root=ROOT,character='KEN'):
 pending,record=build(root,character)
 if any(p.read_bytes()!=data for p,data in pending.items()):raise ValueError('Victory runtime/source/metadata mismatch')
 return record
def main():
 p=ArgumentParser(description=__doc__);p.add_argument('--character',default='KEN');g=p.add_mutually_exclusive_group();g.add_argument('--install',action='store_true');g.add_argument('--runtime',action='store_true');a=p.parse_args();pending,record=build(character=a.character)
 if a.runtime:validate_runtime(character=a.character)
 if a.install:roster().write_pending(pending)
 print(json.dumps(record,indent=2));print(a.character+'_VICTORY_'+('INSTALLED' if a.install else 'RUNTIME_PASS' if a.runtime else 'QA_PASS'))
if __name__=='__main__':main()
