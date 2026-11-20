from PIL import Image
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1];src=root/'art-source/knockdown-motion-v1/ryu'
def box(im):return im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
im=Image.open(src/'generated-sheet-v1.png').convert('RGBA');assert im.size==(1536,1024);assert im.getchannel('A').histogram()[0]>im.width*im.height*.35
idle=Image.open(root/'public/art/animation-hq/ryu/idle.webp').convert('RGBA');ref=idle.crop((0,0,384,448));ref.save(src/'reference-settle.png');rb=box(ref)
cells=[im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
last=box(cells[5]);scale=(rb[3]-rb[1])/(last[3]-last[1]);assert .4<scale<1.2
frames=[];sourceBounds=[]
for cell in cells[:5]:
 b=box(cell);assert b and min(b[:2])>3 and max(b[2:])<509
 crop=cell.crop((b[0]-3,b[1]-3,b[2]+3,b[3]+3));crop=crop.convert('RGBa').resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS).convert('RGBA');cb=box(crop)
 x=256-crop.width//2;y=rb[3]-cb[3];assert x>=2 and y>=2 and x+crop.width<=510 and y+crop.height<=446
 frame=Image.new('RGBA',(512,448));frame.alpha_composite(crop,(x,y));frames.append(frame);sourceBounds.append(b)
frame=Image.new('RGBA',(512,448));frame.paste(ref,(64,0));frames.append(frame)
assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})==6
for f in frames:
 a=f.getchannel('A');assert not a.crop((0,0,512,2)).getbbox();assert not a.crop((0,446,512,448)).getbbox();assert not a.crop((0,0,2,448)).getbbox();assert not a.crop((510,0,512,448)).getbbox()
assert (box(frames[2])[3]-box(frames[2])[1])<.6*(rb[3]-rb[1]),'Rest pose must lie on floor'
strip=Image.new('RGBA',(3072,448))
for i,f in enumerate(frames):strip.paste(f,(512*i,0))
out=root/'public/art/knockdown-motion-v1/ryu.webp';out.parent.mkdir(parents=True,exist_ok=True);strip.save(out,lossless=True,exact=True,method=6)
check=Image.open(out).convert('RGBA');assert check.tobytes()==strip.tobytes();assert check.crop((5*512+64,0,5*512+448,448)).tobytes()==ref.tobytes();assert out.stat().st_size<650000
strip.save(src/'packed-preview.png')
m={'character':'RYU','kind':'knockdown','frames':6,'frameWidth':512,'frameHeight':448,'sharedScale':scale,'sourceBounds':sourceBounds,'opaqueBounds':[box(f) for f in frames],'uniqueDrawings':6,'groundedRestPass':True,'noClippingPass':True,'recoveryPixelIdentical':True,'recoveryPaddingX':64,'runtime':out.relative_to(root).as_posix(),'bytes':out.stat().st_size,'decodedBytes':3072*448*4,'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'generated-sheet-v1.png',src/'generation-reference.png',src/'reference-settle.png',src/'generation-prompt.txt',src/'spacing-edit-prompt.txt',out]}}
(src/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8');print(json.dumps(m))
