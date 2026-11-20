from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
root=Path(__file__).resolve().parents[1];src=root/'art-source/stage-ambient-v1/source.png';im=Image.open(src).convert('RGBA');cell=128;atlas=Image.new('RGBA',(768,640));rows=[]
assert im.width%6==0 and im.height%5==0
cw,ch=im.width//6,im.height//5
for row,name in enumerate(['subway-steam','cooking-vapor','maple-leaves','rain-ripple','brazier-flame']):
 tiles=[im.crop((i*cw,row*ch,(i+1)*cw,(row+1)*ch)) for i in range(6)];mask=np.stack([np.array(t)[:,:,3]>=24 for t in tiles]).any(axis=0);ys,xs=np.where(mask);assert len(xs)>40;box=(max(0,int(xs.min())-3),max(0,int(ys.min())-3),min(cw,int(xs.max())+4),min(ch,int(ys.max())+4));scale=112/max(box[2]-box[0],box[3]-box[1]);size=(round((box[2]-box[0])*scale),round((box[3]-box[1])*scale));hashes=[]
 for i,t in enumerate(tiles):
  t=t.crop(box).convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA');atlas.alpha_composite(t,(i*cell+(cell-size[0])//2,row*cell+120-size[1]));hashes.append(hashlib.sha256(t.tobytes()).hexdigest())
 assert len(set(hashes))==6,(name,'All six frames must be distinct')
 rows.append(dict(kind=name,sourceCell=[cw,ch],commonCrop=list(box),packedSize=list(size),frames=6,uniqueFrames=6))
dst=root/'public/art/stage-ambient-v1/atlas.webp';atlas.save(dst,'WEBP',lossless=True,method=6,exact=True);assert np.array_equal(np.array(atlas),np.array(Image.open(dst).convert('RGBA')))
qa=dict(width=768,height=640,cell=128,baseline=120,frames=30,bytes=dst.stat().st_size,decodedBytes=768*640*4,runtimeSha256=hashlib.sha256(dst.read_bytes()).hexdigest(),sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),rows=rows)
(root/'art-source/stage-ambient-v1/qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf-8');matte=Image.new('RGBA',atlas.size,'#354052');matte.alpha_composite(atlas);matte.convert('RGB').save(root.parent/'outputs/stage-ambient-v1-contact.png');print(json.dumps({k:v for k,v in qa.items() if k!='rows'}))
