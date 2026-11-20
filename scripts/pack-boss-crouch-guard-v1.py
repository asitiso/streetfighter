from PIL import Image
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
for character in ['URIEN','GILL']:
 src=root/'art-source/boss-crouch-guard-v1'/character.lower()
 im=Image.open(src/'generated-sheet-v1.png').convert('RGBA')
 assert im.size==(1536,1024)
 assert im.getchannel('A').histogram()[0]>im.width*im.height*.4
 frames=[];boxes=[];scale=.65
 for i in range(6):
  cell=im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512))
  opaque=cell.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
  assert opaque and min(opaque[0],opaque[1])>3 and max(opaque[2],opaque[3])<509
  box=(opaque[0]-3,opaque[1]-3,opaque[2]+3,opaque[3]+3)
  body=cell.crop(box)
  body=body.convert('RGBa').resize((round(body.width*scale),round(body.height*scale)),Image.Resampling.LANCZOS).convert('RGBA')
  frame=Image.new('RGBA',(384,448));frame.alpha_composite(body,(192-body.width//2,420-body.height));frames.append(frame);boxes.append(box)
 assert len({hashlib.sha256(f.tobytes()).hexdigest() for f in frames})==6
 strip=Image.new('RGBA',(2304,448))
 for i,f in enumerate(frames):strip.alpha_composite(f,(384*i,0))
 out=root/'public/art/animation-hq'/character.lower()/'crouch-guard-v1.webp'
 strip.save(out,lossless=True,exact=True,method=6)
 assert Image.open(out).convert('RGBA').tobytes()==strip.tobytes()
 assert out.stat().st_size<600000
 strip.save(src/'packed-preview.png')
 meta={'character':character,'kind':'crouch-guard','frames':6,'frameWidth':384,'frameHeight':448,'footBaseline':420,'sharedScale':scale,'sourceCells':boxes,'runtime':out.relative_to(root).as_posix(),'bytes':out.stat().st_size,'decodedBytes':2304*448*4,'operations':['alpha silhouette crop with 3px padding','shared .65 scale in premultiplied alpha','center and align baseline420','lossless exact WebP packing'],'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'generated-sheet-v1.png',src/'reference-crouch.png',src/'generation-prompt.txt',out]}}
 (src/'manifest.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
 print(json.dumps(meta))
