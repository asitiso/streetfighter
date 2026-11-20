from PIL import Image
from pathlib import Path
import numpy as np,json,hashlib
root=Path(__file__).resolve().parents[1];src=root/'art-source/super-hit-v1/ibuki'
def box(im):return im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
def center(im):
 a=np.asarray(im.getchannel('A'),dtype=float);y,x=np.indices(a.shape);return float((x*a).sum()/a.sum()),float((y*a).sum()/a.sum())
im=Image.open(src/'generated-sheet-v1.png').convert('RGBA');assert im.size==(1536,1024);assert im.getchannel('A').histogram()[0]>im.width*im.height*.35
ref=Image.open(root/'public/art/animation-hq/ibuki/idle.webp').convert('RGBA').crop((0,0,384,448));rb=box(ref)
cells=[im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
bounds=[box(c) for c in cells];assert all(b and min(b[:2])>3 and max(b[2:])<509 for b in bounds),bounds
scale=.9*(rb[3]-rb[1])/max(b[3]-b[1] for b in bounds);assert .4<scale<1.5
target=(255.5,center(ref)[1]);frames=[]
for cell,b in zip(cells,bounds):
 crop=cell.crop((b[0]-3,b[1]-3,b[2]+3,b[3]+3));crop=crop.convert('RGBa').resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS).convert('RGBA');cx,cy=center(crop)
 x,y=round(target[0]-cx),round(target[1]-cy);assert x>=2 and y>=2 and x+crop.width<=510 and y+crop.height<=446
 f=Image.new('RGBA',(512,448));f.alpha_composite(crop,(x,y));frames.append(f)
for f in frames:
 a=f.getchannel('A');assert not a.crop((0,0,512,2)).getbbox();assert not a.crop((0,446,512,448)).getbbox();assert not a.crop((0,0,2,448)).getbbox();assert not a.crop((510,0,512,448)).getbbox();assert max(abs(v-t) for v,t in zip(center(f),target))<.75
assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})==6
strip=Image.new('RGBA',(3072,448))
for i,f in enumerate(frames):strip.paste(f,(i*512,0))
out=root/'public/art/super-hit-v1/ibuki.webp';out.parent.mkdir(parents=True,exist_ok=True);strip.save(out,lossless=True,exact=True,method=6)
assert Image.open(out).convert('RGBA').tobytes()==strip.tobytes();assert out.stat().st_size<650000
strip.save(src/'packed-preview.png')
meta={'character':'IBUKI','kind':'super-hit','frames':6,'frameWidth':512,'frameHeight':448,'sharedScale':scale,'sourceBounds':bounds,'opaqueBounds':[box(f) for f in frames],'centroidTarget':target,'centroids':[center(f) for f in frames],'centroidLockPass':True,'uniqueDrawings':6,'noClippingPass':True,'runtime':out.relative_to(root).as_posix(),'bytes':out.stat().st_size,'decodedBytes':3072*448*4,'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'generated-sheet-v1.png',src/'generation-reference.png',src/'generation-prompt.txt',out]}}
(src/'manifest.json').write_text(json.dumps(meta,indent=2),encoding='utf-8');print(json.dumps(meta))
