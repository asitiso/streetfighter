from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import cv2, numpy as np, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/mnt/data/a_clean_graphic_sprite_sheet_style_image_a_high_r.png')
OUT = ROOT/'public/art/animation-hq/ryu/idle.webp'
PREVIEW = ROOT/'RC37_RYU_AUTHORED_IDLE_QA.png'
FRAME_W, FRAME_H = 384, 448
TARGET_BASELINE = 430
TARGET_HEIGHT = 372
TARGET_CENTER_X = 194

src = Image.open(SRC).convert('RGB')
SW, SH = src.size
if (SW, SH) != (1536, 1024):
    raise SystemExit(f'unexpected source size {(SW, SH)}')

frames=[]
metrics=[]
# top six panels: exact 256px columns; avoid header/number/timing captions
for i in range(6):
    x0=i*256
    x1=(i+1)*256
    panel=np.array(src.crop((x0, 105, x1, 582)))[:,:,::-1].copy()  # BGR
    h,w=panel.shape[:2]
    mask=np.zeros((h,w),np.uint8)
    bgd=np.zeros((1,65),np.float64)
    fgd=np.zeros((1,65),np.float64)
    rect=(3,3,w-6,h-6)
    cv2.grabCut(panel, mask, rect, bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    alpha=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype('uint8')
    # Largest connected component = character. Nearby headband strands get retained by dilation/union.
    num, labels, stats, cents=cv2.connectedComponentsWithStats(alpha,8)
    if num <= 1:
        raise SystemExit(f'no foreground frame {i+1}')
    order=list(range(1,num))
    order.sort(key=lambda k: stats[k,cv2.CC_STAT_AREA], reverse=True)
    main=order[0]
    keep=np.zeros_like(alpha)
    main_box=stats[main]
    mx,my,mw,mh,ma=map(int,main_box)
    for k in order:
        x,y,ww,hh,area=map(int,stats[k])
        if area < 25:
            continue
        near = not (x+ww < mx-32 or x > mx+mw+32 or y+hh < my-32 or y > my+mh+32)
        if k==main or near:
            keep[labels==k]=255
    keep=cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8), iterations=1)
    ys,xs=np.where(keep>0)
    bx0,bx1=int(xs.min()),int(xs.max())+1
    by0,by1=int(ys.min()),int(ys.max())+1
    rgba=cv2.cvtColor(panel, cv2.COLOR_BGR2RGBA)
    rgba[:,:,3]=keep
    crop=Image.fromarray(rgba[by0:by1,bx0:bx1], 'RGBA')
    scale=TARGET_HEIGHT/crop.height
    nw=max(1,round(crop.width*scale)); nh=max(1,round(crop.height*scale))
    if nw>300:
        scale*=300/nw; nw=max(1,round(crop.width*scale)); nh=max(1,round(crop.height*scale))
    crop=crop.resize((nw,nh), Image.Resampling.LANCZOS)
    dest=Image.new('RGBA',(FRAME_W,FRAME_H),(0,0,0,0))
    px=round(TARGET_CENTER_X-nw/2)
    py=TARGET_BASELINE-nh
    dest.alpha_composite(crop,(px,py))
    frames.append(dest)
    metrics.append({'frame':i+1,'sourceBBox':[bx0,by0,bx1,by1],'paste':[px,py],'size':[nw,nh], 'alphaBBox':dest.getchannel('A').getbbox()})

strip=Image.new('RGBA',(FRAME_W*6,FRAME_H),(0,0,0,0))
for i,fr in enumerate(frames): strip.alpha_composite(fr,(i*FRAME_W,0))
OUT.parent.mkdir(parents=True,exist_ok=True)
strip.save(OUT,format='WEBP',lossless=True,quality=100,method=6)
raw=OUT.read_bytes()

# manifest update
mp=ROOT/'public/art/animation-hq/ryu/manifest.json'
manifest=json.loads(mp.read_text())
manifest['pipeline']='rc37-authored-gated-v3'
manifest['enabledFrameTotal']=18
manifest['fullFrameTotal']=18
for rec in manifest['records']:
    if rec['id']=='idle':
        rec.update({
            'frames':6,'frameSize':[384,448],'stripSize':[2304,448],
            'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper(),
            'enabled':True,'renderMode':'full','poseAuthored':True,
        })
mp.write_text(json.dumps(manifest,indent=2))

# QA preview
canvas=Image.new('RGB',(6*300,520),(20,22,28))
d=ImageDraw.Draw(canvas)
for i,fr in enumerate(frames):
    bg=Image.new('RGB',(292,448),(38,40,46))
    thumb=fr.copy(); thumb.thumbnail((288,430),Image.Resampling.LANCZOS)
    bg.paste(thumb,((292-thumb.width)//2,448-thumb.height),thumb)
    x=i*300+4
    canvas.paste(bg,(x,48))
    d.text((x+8,10),f'IDLE {i+1}',fill=(245,245,250))
canvas.save(PREVIEW)

(ROOT/'RC37_RYU_AUTHORED_IDLE_METRICS.json').write_text(json.dumps({
    'source':str(SRC),'output':str(OUT),'frameCount':6,'frameSize':[384,448],
    'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper(),'metrics':metrics
},indent=2))
print(json.dumps({'output':str(OUT),'preview':str(PREVIEW),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper()},indent=2))
