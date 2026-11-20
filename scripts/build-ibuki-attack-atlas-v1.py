from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
from PIL import Image,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'art-source/ibuki-attack-atlas-v1/generated-sheet-v1.png'
REFERENCE=ROOT/'art-source/throw-escape-motion-v1/ibuki/reference-idle.png'
META=ROOT/'art-source/ibuki-attack-atlas-v1/manifest.json'
TARGETS={'lite':ROOT/'public/art/attack-atlases/ibuki-authored-v1.webp','hd':ROOT/'public/art/attack-atlases-hd/ibuki-authored-v1.webp'}
def sha(data):return hashlib.sha256(data).hexdigest()
def shape(im):return im.getchannel('A').point(lambda a:255 if a>=32 else 0)
def foot(mask,b):
 depth=max(8,round((b[3]-b[1])*.12))
 band=mask.crop((0,max(0,b[3]-depth),mask.width,b[3])).getbbox()
 assert band is not None
 return (band[0]+band[2])/2

def build():
 im=Image.open(SOURCE).convert('RGBA'); ref=Image.open(REFERENCE).convert('RGBA');assert ref.size==(384,448)
 rm=shape(ref); rb=rm.getbbox();fx=foot(rm,rb);bottom=rb[3];cells=[]
 for row in range(4):
  for col in range(5):
   box=(round(col*im.width/5),round(row*im.height/4),round((col+1)*im.width/5),round((row+1)*im.height/4))
   cell=im.crop(box);mask=shape(cell);b=mask.getbbox();assert b is not None
   expanded=mask.filter(ImageFilter.MaxFilter(11));outside=sum(a>=8 and m==0 for a,m in zip(cell.getchannel('A').tobytes(),expanded.tobytes()))
   assert outside<=16,('translucent backdrop',row,col,outside)
   assert min(b[0],b[1],cell.width-b[2],cell.height-b[3])>=4,('source clipping',row,col,b)
   assert b[3]-b[1]>.55*cell.height and b[2]-b[0]>.35*cell.width,('missing pose',row,col)
   cells.append((cell,b,foot(mask,b),row,col))
 gain=(rb[3]-rb[1])/max(b[3]-b[1] for _,b,_,_,_ in cells)
 for cell,b,x,row,col in cells:
  gain=min(gain,(fx-8)/max(1,x-b[0]+4),(384-fx-8)/max(1,b[2]-x+4))
 hd=Image.new('RGBA',(1920,1792));lite=Image.new('RGBA',(960,896));frames=[]
 for cell,b,x,row,col in cells:
  crop=(max(0,b[0]-4),max(0,b[1]-4),min(cell.width,b[2]+4),min(cell.height,b[3]+4));sprite=cell.crop(crop)
  sprite=sprite.resize((round(sprite.width*gain),round(sprite.height*gain)),Image.Resampling.LANCZOS)
  left=round(fx-(x-crop[0])*gain);top=round(bottom-(b[3]-crop[1])*gain)
  tile=Image.new('RGBA',(384,448));tile.alpha_composite(sprite,(left,top));bb=shape(tile).getbbox()
  assert bb and min(bb[0],bb[1],384-bb[2],448-bb[3])>=6,('runtime clipping',row,col,bb)
  assert abs(bb[3]-bottom)<=2,('foot baseline',row,col,bb[3],bottom)
  stance=shape(tile).crop((0,bb[3]-round((bb[3]-bb[1])*.16),384,bb[3])).getbbox();assert stance is not None
  assert abs((stance[0]+stance[2])/2-fx)<=3,('stance center',row,col,(stance[0]+stance[2])/2,fx)
  hd.alpha_composite(tile,(col*384,row*448));small=tile.resize((192,224),Image.Resampling.LANCZOS);lite.alpha_composite(small,(col*192,row*224))
  frames.append({'row':row,'column':col,'hdBBox':list(bb),'hdRGBA':sha(tile.tobytes()),'liteRGBA':sha(small.tobytes())})
 assert len({f['hdRGBA'] for f in frames})==20,'All twenty source poses must remain distinct'
 return {'lite':lite,'hd':hd},{'version':'ibuki-authored-attack-v1','source':str(SOURCE.relative_to(ROOT)).replace('\\','/'),'sourceSHA256':sha(SOURCE.read_bytes()),'promptSHA256':sha((SOURCE.parent/'generation-prompt.txt').read_bytes()),'backgroundRemovalPromptSHA256':sha((SOURCE.parent/'background-removal-prompt.txt').read_bytes()) if (SOURCE.parent/'background-removal-prompt.txt').exists() else None,'referenceSHA256':sha(REFERENCE.read_bytes()),'sourceSize':list(im.size),'grid':[5,4],'uniformScale':gain,'footAnchor':[fx,bottom],'frames':frames,'operations':['cell crop with transparent gutter','one uniform scale for all twenty poses','translation to common foot anchor','half-size LITE downsample','lossless WebP encoding']}

def main():
 parser=argparse.ArgumentParser();g=parser.add_mutually_exclusive_group(required=True);g.add_argument('--install',action='store_true');g.add_argument('--check',action='store_true');args=parser.parse_args();images,meta=build()
 if args.install:
  for tier,im in images.items():
   p=TARGETS[tier];p.parent.mkdir(parents=True,exist_ok=True);im.save(p,'WEBP',lossless=True,quality=100,method=6,exact=True)
  meta['runtime']={tier:{'path':'/'+str(p.relative_to(ROOT/'public')).replace('\\','/'),'size':list(images[tier].size),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for tier,p in TARGETS.items()};META.write_text(json.dumps(meta,indent=2),encoding='utf-8')
 else:
  old=json.loads(META.read_text(encoding='utf-8'))
  for k in ['sourceSHA256','promptSHA256','backgroundRemovalPromptSHA256','referenceSHA256','frames','uniformScale','footAnchor']:assert old[k]==meta[k],k
  for tier,p in TARGETS.items():
   assert sha(p.read_bytes())==old['runtime'][tier]['sha256']
   actual=Image.open(p).convert('RGBA');assert actual.size==images[tier].size;assert actual.tobytes()==images[tier].tobytes(),tier+' decoded pixels differ'
 print(json.dumps({'passed':True,'frames':len(meta['frames']),'sizes':{k:list(v.size) for k,v in images.items()},'sourceSHA256':meta['sourceSHA256'],'uniformScale':meta['uniformScale']}))
if __name__=='__main__':main()
