from PIL import Image,ImageChops,ImageDraw
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
ACTORS=['ryu','ken','chunli','alex','dudley','makoto','ibuki','yun']
CAPS={"ryu":18000000,"ken":20000000,"chunli":21000000,"alex":19500000,"dudley":14000000,"makoto":16500000,"ibuki":18500000,"yun":18000000}
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def box(im):return im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox()
def feet(im):
 b=box(im);area=im.getchannel('A').crop((0,b[3]-max(8,round((b[3]-b[1])*.12)),im.width,b[3])).point(lambda v:255 if v>128 else 0).getbbox();return(area[0]+area[2])/2
records=[];gallery=Image.new('RGBA',(1152,8*224))
for row,name in enumerate(ACTORS):
 source=ROOT/('art-source/low-parry-v1/'+name);raw=Image.open(source/'generated-sheet-v1.png').convert('RGBA');ref=Image.open(source/'reference-settle.png').convert('RGBA')
 assert raw.size==(1536,1024),(name,raw.size)
 cells=[raw.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
 rb=box(ref);last=box(cells[5]);scale=(rb[3]-rb[1])/(last[3]-last[1]);assert .35<scale<1.2,(name,scale)
 frames=[];bounds=[]
 for cell in cells[:5]:
  b=box(cell);assert b and b[0]>0 and b[1]>0 and b[2]<512 and b[3]<512,(name,b)
  crop=cell.crop((max(0,b[0]-3),max(0,b[1]-3),min(512,b[2]+3),min(512,b[3]+3)))
  crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS);cb=box(crop);x=round(feet(ref)-feet(crop));y=rb[3]-cb[3]
  assert x>=0 and y>=0 and x+crop.width<=384 and y+crop.height<=448,(name,x,y,crop.size)
  frame=Image.new('RGBA',(384,448));frame.alpha_composite(crop,(x,y));frames.append(frame);bounds.append(b)
 frames.append(ref.copy());assert len(set(hashlib.sha256(f.tobytes()).hexdigest() for f in frames))==6,name+' unique poses';strip=Image.new('RGBA',(2304,448))
 for i,frame in enumerate(frames):strip.paste(frame,(i*384,0));thumb=frame.resize((192,224),Image.Resampling.LANCZOS);gallery.alpha_composite(thumb,(i*192,row*224))
 out=ROOT/('public/art/animation-hq/'+name+'/crouch-parry-v1.webp');strip.save(out,lossless=True,method=6,exact=True);strip.save(source/'packed-preview.png')
 check=Image.open(out).convert('RGBA').crop((1920,0,2304,448));assert check.tobytes()==ref.tobytes(),name+' recovery must be pixel-identical'
 legacy=json.loads((ROOT/('public/art/animation-hq/'+name+'/manifest.json')).read_text(encoding='utf-8'));total=sum(r['bytes'] for r in legacy['records'] if r['enabled'])+(ROOT/('public/art/animation-hq/'+name+'/crouch-guard-v1.webp')).stat().st_size+out.stat().st_size
 assert total<CAPS[name],(name,total,CAPS[name]);assert out.stat().st_size<600000,(name,out.stat().st_size)
 manifest={'character':name.upper(),'kind':'crouch-parry','frames':6,'frameWidth':384,'frameHeight':448,'sharedScale':scale,'sourceBounds':bounds,'recoveryFrame':5,'recoveryPixelIdentical':True,'runtime':str(out.relative_to(ROOT)).replace(chr(92),'/'),'bytes':out.stat().st_size,'stageEntryBytes':total,'stageEntryCap':CAPS[name],'sha256':{p.name:digest(p) for p in [source/'generated-sheet-v1.png',source/'reference-idle.png',source/'reference-settle.png',source/'generation-prompt.txt',out]}}
 (source/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');records.append(manifest)
(ROOT/'art-source/low-parry-v1/manifest.json').write_text(json.dumps({'kind':'crouch-parry','characters':records,'frames':48},indent=2),encoding='utf-8')
gallery.save(ROOT/'../outputs/low-parry-artwork-contact.png');print(json.dumps([{'character':r['character'],'bytes':r['bytes'],'scale':r['sharedScale'],'stageEntryBytes':r['stageEntryBytes']} for r in records]))
