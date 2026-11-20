from PIL import Image
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
src=root/'art-source/makoto-crouch-guard-v1'
im=Image.open(src/'generated-sheet-v1.png').convert('RGBA')
frames=[]; boxes=[]; scale=.65
for i in range(6):
 cell=im.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512))
 box=cell.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
 # Include antialiasing around the opaque silhouette; only crop/scale/translate.
 box=(max(0,box[0]-3),max(0,box[1]-3),min(512,box[2]+3),min(512,box[3]+3))
 body=cell.crop(box); body=body.resize((round(body.width*scale),round(body.height*scale)),Image.Resampling.LANCZOS)
 frame=Image.new('RGBA',(384,448));frame.alpha_composite(body,(192-body.width//2,420-body.height));frames.append(frame);boxes.append(box)
strip=Image.new('RGBA',(2304,448))
for i,f in enumerate(frames):strip.alpha_composite(f,(384*i,0))
out=root/'public/art/animation-hq/makoto/crouch-guard-v1.webp';out.parent.mkdir(parents=True,exist_ok=True);strip.save(out,lossless=True,method=6)
strip.save(src/'packed-preview.png')
manifest={'character':'MAKOTO','kind':'crouch-guard','frames':6,'frameWidth':384,'frameHeight':448,'footBaseline':420,'sharedScale':scale,'sourceCells':boxes,'operations':['alpha-silhouette crop with 3px padding','shared uniform scale','center and foot alignment','lossless horizontal packing'],'runtime':str(out.relative_to(root)).replace(chr(92),'/'),'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'generated-sheet-v1.png',src/'reference-idle.png',src/'generation-prompt.txt',out]}}
(src/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest))
