from PIL import Image
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
def box(im):return im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
def feet(im):
 b=box(im);q=im.getchannel('A').crop((0,b[3]-max(8,round((b[3]-b[1])*.12)),im.width,b[3])).point(lambda v:255 if v>128 else 0).getbbox();return(q[0]+q[2])/2
for name in ['urien','gill']:
 src=root/'art-source/boss-crouch-parry-v1'/name
 im=Image.open(src/'generated-sheet-v1.png').convert('RGBA');assert im.size==(1536,1024)
 assert im.getchannel('A').histogram()[0]>im.width*im.height*.4
 guard=Image.open(root/'public/art/animation-hq'/name/'crouch-guard-v1.webp').convert('RGBA')
 ref=guard.crop((1920,0,2304,448));ref.save(src/'reference-settle.png')
 cells=[im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
 rb=box(ref);last=box(cells[5]);scale=(rb[3]-rb[1])/(last[3]-last[1]);assert .35<scale<1.2
 frames=[];bounds=[]
 for cell in cells[:5]:
  b=box(cell);assert b and min(b[0],b[1])>3 and max(b[2],b[3])<509
  crop=cell.crop((b[0]-3,b[1]-3,b[2]+3,b[3]+3))
  crop=crop.convert('RGBa').resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS).convert('RGBA')
  cb=box(crop);x=round(feet(ref)-feet(crop));y=rb[3]-cb[3]
  assert x>=2 and y>=2 and x+crop.width<=382 and y+crop.height<=446
  frame=Image.new('RGBA',(384,448));frame.alpha_composite(crop,(x,y));frames.append(frame);bounds.append(b)
 frames.append(ref.copy());assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})==6
 strip=Image.new('RGBA',(2304,448))
 for i,f in enumerate(frames):strip.paste(f,(384*i,0))
 out=root/'public/art/animation-hq'/name/'crouch-parry-v1.webp';strip.save(out,lossless=True,exact=True,method=6)
 decoded=Image.open(out).convert('RGBA');assert decoded.tobytes()==strip.tobytes();assert decoded.crop((1920,0,2304,448)).tobytes()==ref.tobytes()
 assert out.stat().st_size<600000
 for f in frames:
  a=f.getchannel('A');assert not a.crop((0,0,384,2)).getbbox();assert not a.crop((0,446,384,448)).getbbox();assert not a.crop((0,0,2,448)).getbbox();assert not a.crop((382,0,384,448)).getbbox()
 strip.save(src/'packed-preview.png')
 m={'character':name.upper(),'kind':'crouch-parry','frames':6,'frameWidth':384,'frameHeight':448,'sharedScale':scale,'sourceBounds':bounds,'recoveryFrame':5,'recoveryPixelIdentical':True,'uniqueDrawings':6,'transparentBorders':True,'groundBaselineStable':True,'runtime':out.relative_to(root).as_posix(),'bytes':out.stat().st_size,'decodedBytes':2304*448*4,'opaqueBounds':[box(f) for f in frames],'operations':['alpha silhouette crop','uniform premultiplied-alpha scale matched to settle pose','foot alignment','last cell copied exactly from existing guard recovery','exact lossless packing'],'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'generated-sheet-v1.png',src/'reference-low-guard.png',src/'reference-settle.png',src/'generation-prompt.txt',out]}}
 (src/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8');print(json.dumps(m))
