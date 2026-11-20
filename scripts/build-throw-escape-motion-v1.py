"""Pack six original AI-authored poses; only uniform resize and translation."""
from pathlib import Path
import argparse, hashlib, json, io
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/throw-escape-motion-v1'
SLUGS='ryu ken chunli alex dudley makoto ibuki yun urien gill'.split()
def sha(b): return hashlib.sha256(b).hexdigest()
def metrics(im):
 a=np.asarray(im)[:,:,3]; yy,xx=np.where(a>=24)
 assert len(xx)>1000,'empty pose'
 bottom=int(yy.max()); foot=np.where((a>=24)&(np.indices(a.shape)[0]>=bottom-10))[1]
 return (int(xx.min()),int(yy.min()),int(xx.max()),bottom),(float(foot.min()+foot.max())/2,bottom)
def validate_cell(im):
 a=np.asarray(im)[:,:,3]
 assert (a==0).mean()>.2,'opaque source cell'
 edge=np.concatenate([a[:3,:].ravel(),a[-3:,:].ravel(),a[:,:3].ravel(),a[:,-3:].ravel()])
 assert edge.max()<24,'source drawing clipped at grid edge'
 metrics(im)
def build(slug):
 folder=SOURCE/slug; original=folder/'generated-sheet-v1.png'; refpath=folder/'reference-idle.png'
 source=Image.open(original).convert('RGBA'); ref=Image.open(refpath).convert('RGBA')
 assert source.size==(1536,1024) and ref.size==(384,448)
 cells=[source.crop(((i%3)*512,(i//3)*512,(i%3+1)*512,(i//3+1)*512)) for i in range(6)]
 for cell in cells: validate_cell(cell)
 rb,rf=metrics(ref); sb,sf=metrics(cells[5]); scale=(rb[3]-rb[1]+1)/(sb[3]-sb[1]+1)
 bounds=[metrics(im)[0] for im in cells]
 span=max(b[2] for b in bounds)-min(b[0] for b in bounds)+1
 scale=min(scale,374/span)
 size=round(512*scale); resized=[im.resize((size,size),Image.Resampling.LANCZOS) for im in cells]
 _,lastfoot=metrics(resized[5]); dx=round(rf[0]-lastfoot[0])
 bounds=[metrics(im)[0] for im in resized]
 dx=max(4-min(b[0] for b in bounds),min(dx,379-max(b[2] for b in bounds)))
 frames=[]; placements=[]
 for im in resized:
  _,foot=metrics(im); dy=round(rf[1]-foot[1]); out=Image.new('RGBA',(384,448));out.paste(im,(dx,dy))
  b,_=metrics(out); assert b[0]>0 and b[1]>0 and b[2]<383 and b[3]<447,(slug,b)
  frames.append(out); placements.append([dx,dy])
 hashes=[sha(im.tobytes()) for im in frames]; assert len(set(hashes))==6
 strip=Image.new('RGBA',(2304,448))
 for i,im in enumerate(frames): strip.paste(im,(384*i,0))
 buf=io.BytesIO(); strip.save(buf,format='WEBP',lossless=True,method=6)
 data=buf.getvalue(); assert len(data)<=600000,(slug,len(data))
 decoded=Image.open(io.BytesIO(data)).convert('RGBA');a=np.asarray(strip);b=np.asarray(decoded)
 assert np.array_equal(a[:,:,3],b[:,:,3]); mask=a[:,:,3]>0; assert np.array_equal(a[:,:,:3][mask],b[:,:,:3][mask])
 row=Image.new('RGB',(7*192,240),'#213148'); d=ImageDraw.Draw(row);d.text((4,2),slug,fill='white')
 for i,im in enumerate([ref]+frames): row.paste(im.resize((192,224)),(i*192,16),im.resize((192,224)))
 return data,dict(character=slug,frames=6,frameSize=[384,448],sourceSHA256=sha(original.read_bytes()),promptSHA256=sha((folder/'generation-prompt.txt').read_bytes()),referenceSHA256=sha(refpath.read_bytes()),runtimeSHA256=sha(data),bytes=len(data),decodedBytes=2304*448*4,scale=scale,placements=placements,frameHashes=hashes,provenance='builtin image_gen; original poses; uniform resize and translation only',encoding='lossless WebP'),row
parser=argparse.ArgumentParser();parser.add_argument('--install',action='store_true');args=parser.parse_args()
# Negative controls test validation without changing any source artwork.
for bad in [Image.new('RGBA',(512,512),(255,255,255,255)),Image.new('RGBA',(512,512))]:
 if bad.getpixel((0,0))[3]==0:
  ImageDraw.Draw(bad).rectangle((0,80,250,470),fill=(255,0,0,255))
 try: validate_cell(bad)
 except AssertionError: pass
 else: raise AssertionError('invalid source accepted')
rows=[];reports=[]
for slug in SLUGS:
 data,report,row=build(slug);target=ROOT/'public/art/throw-escape-v1'/f'{slug}.webp'
 if args.install: target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 else: assert target.read_bytes()==data,f'{slug} runtime differs'
 reports.append(report);rows.append(row)
report=dict(schema=1,characters=reports,totalFrames=60,totalBytes=sum(r['bytes'] for r in reports),decodedBytes=sum(r['decodedBytes'] for r in reports))
manifest=SOURCE/'manifest.json'
if args.install:
 manifest.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 contact=Image.new('RGB',(1344,2400),'#213148')
 for i,row in enumerate(rows):contact.paste(row,(0,i*240))
 contact.save(SOURCE/'runtime-contact-sheet.jpg',quality=95)
else: assert json.loads(manifest.read_text(encoding='utf-8'))==report
print(json.dumps(dict(passed=True,characters=10,frames=60,bytes=report['totalBytes'],decodedBytes=report['decodedBytes'])))
