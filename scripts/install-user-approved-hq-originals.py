#!/usr/bin/env python3
from PIL import Image
from pathlib import Path
import hashlib, json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
CHARACTERS={
 'RYU':('ryu','ryu_master_new_original_v01.png'),
 'CHUNLI':('chunli','chunli_master_new_original_v01.png'),
 'KEN':('ken','ken_master_new_original_v01.png'),
 'IBUKI':('ibuki','ibuki_master_new_original_v01.png'),
}

def sha256(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def premul_resize(im:Image.Image, size:tuple[int,int])->Image.Image:
    rgba=np.asarray(im.convert('RGBA')).astype(np.float32)/255.0
    a=rgba[...,3:4]
    prem=np.concatenate([rgba[...,:3]*a,a],axis=2)
    chans=[]
    for i in range(4):
        ch=Image.fromarray(np.clip(prem[...,i]*255,0,255).astype(np.uint8),'L')
        chans.append(np.asarray(ch.resize(size,Image.Resampling.LANCZOS)).astype(np.float32)/255.0)
    p=np.stack(chans,axis=2); alpha=p[...,3:4]
    rgb=np.where(alpha>1/255, p[...,:3]/np.maximum(alpha,1/255), 0)
    out=np.concatenate([rgb,alpha],axis=2)
    return Image.fromarray(np.clip(out*255,0,255).astype(np.uint8),'RGBA')

records=[]
for cid,(slug,name) in CHARACTERS.items():
    src=ROOT/'art-source/hq-character-masters/new-originals'/slug/name
    lite=Image.open(ROOT/'public/art/combat-sprites'/f'{slug}.webp').convert('RGBA')
    source=Image.open(src).convert('RGBA')
    bbox=source.getchannel('A').getbbox()
    if not bbox: raise RuntimeError(f'{cid}: empty source alpha')
    crop=source.crop(bbox)
    lb=lite.getchannel('A').getbbox()
    if not lb: raise RuntimeError(f'{cid}: empty lite alpha')
    # Preserve the established in-game height/ground line exactly at 2x,
    # but preserve the newly authored horizontal silhouette/aspect ratio.
    target_h=(lb[3]-lb[1])*2
    target_w=round(crop.width*(target_h/crop.height))
    if target_w>372:
        scale=372/target_w; target_w=372; target_h=round(target_h*scale)
    resized=premul_resize(crop,(target_w,target_h))
    frame=Image.new('RGBA',(384,448),(0,0,0,0))
    center_x=((lb[0]+lb[2])/2)*2
    ground_y=lb[3]*2
    x=round(center_x-target_w/2); y=round(ground_y-target_h)
    x=max(0,min(384-target_w,x)); y=max(0,min(448-target_h,y))
    frame.alpha_composite(resized,(x,y))
    out=ROOT/'public/art/combat-sprites-hq'/f'{slug}.webp'
    out.parent.mkdir(parents=True,exist_ok=True)
    frame.save(out,'WEBP',lossless=True,method=6)
    ob=frame.getchannel('A').getbbox()
    records.append({
      'character':cid,'slug':slug,
      'sourceFile':str(src.relative_to(ROOT)),'sourceWidth':source.width,'sourceHeight':source.height,
      'sourceAlphaBbox':list(bbox),'runtimeFile':f'/art/combat-sprites-hq/{slug}.webp',
      'runtimeWidth':384,'runtimeHeight':448,'runtimeAlphaBbox':list(ob) if ob else None,
      'runtimeSha256':sha256(out),'approvalBasis':'user-approved-new-original',
      'preservedGroundY':ground_y,'referenceLiteAlphaBbox':list(lb),
    })

manifest={
 'candidate':'0.0.61-rc.36','pipeline':'hq-new-original-user-approved-v1',
 'fallbackOrder':['HQ NEW ORIGINAL','HD REMASTER','LITE'],
 'approvedCharacters':['RYU','CHUNLI','KEN','IBUKI'],
 'records':records,
 'note':'Uses the user-approved newly generated high-resolution originals without pose-fidelity rejection. Runtime fitting preserves established character height and ground contact while retaining each new original silhouette.'
}
(ROOT/'public/art/hq-character-master-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
(ROOT/'art-source/hq-character-masters/MASTER_SOURCE_MANIFEST.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(manifest,indent=2,ensure_ascii=False))
