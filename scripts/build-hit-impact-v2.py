from pathlib import Path
from io import BytesIO
import argparse,hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'art-source/hit-impact-v2/generated-sheet-v2.png'
target=ROOT/'public/art/fx/hit-impact-v2.webp'
parser=argparse.ArgumentParser();parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
im=Image.open(source).convert('RGBA');a=np.array(im);height,width=a.shape[:2]
assert abs(width/height-2)<.01 and width>=1024
assert a[:,:,3].min()==0 and a[:,:,3].max()>=240,'Genuine transparent source required'
strip=Image.new('RGBA',(1536,192));frames=[];mass=[]
for i in range(8):
 row,col=divmod(i,4);x0,x1=round(col*width/4),round((col+1)*width/4);y0,y1=round(row*height/2),round((row+1)*height/2)
 cell=im.crop((x0,y0,x1,y1));pixels=np.array(cell);alpha=pixels[:,:,3];core=alpha>=128;yy,xx=np.nonzero(core)
 assert len(xx)>12 and alpha.max()>=200,'Missing source spark'
 assert not (alpha[:3,:]>8).any() and not (alpha[-3:,:]>8).any() and not (alpha[:,:3]>8).any() and not (alpha[:,-3:]>8).any(),'Source spark clips cell edge'
 # Equal source-grid cells are uniformly reduced, never fitted to each drawing.
 packed=cell.resize((192,192),Image.Resampling.LANCZOS);strip.paste(packed,(i*192,0));m=float(alpha.sum());mass.append(m)
 frames.append({'frame':i,'sourceRect':[x0,y0,x1-x0,y1-y0],'corePixels':len(xx),'alphaMass':m,'rgbaSha256':hashlib.sha256(packed.tobytes()).hexdigest()})
assert len({f['rgbaSha256'] for f in frames})==8
assert mass[0]<mass[1]<mass[2]<mass[3],'Initial flash must expand'
assert all(mass[i]>mass[i+1] for i in range(3,7)),'Hit spark must decay after peak'
assert mass[7]<mass[3]*.2,'Final remnants must fade'
buf=BytesIO();strip.save(buf,'WEBP',lossless=True,exact=True,method=6);data=buf.getvalue();back=np.array(Image.open(BytesIO(data)).convert('RGBA'));expected=np.array(strip)
assert np.array_equal(back[:,:,3],expected[:,:,3]);assert np.array_equal(back[expected[:,:,3]>0],expected[expected[:,:,3]>0])
assert len(data)<500000
report={'status':'passed','generator':'built-in imagegen','source':source.relative_to(ROOT).as_posix(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSize':[width,height],'runtime':target.relative_to(ROOT).as_posix(),'size':[1536,192],'columns':8,'frames':frames,'decodedBytes':1536*192*4,'runtimeBytes':len(data),'runtimeSha256':hashlib.sha256(data).hexdigest(),'transparencyPreserved':True,'visiblePixelsLossless':True,'distinctFrames':8,'phaseEvolutionPassed':True,'normalization':'equal source grid cell downsample only; no per-effect fitting or synthesized frames'}
if args.runtime:
 assert target.read_bytes()==data,'Exact runtime reconstruction required'
 assert json.loads((ROOT/'art-source/hit-impact-v2/qa.json').read_text())==report
else:
 target.write_bytes(data);(ROOT/'art-source/hit-impact-v2/qa.json').write_text(json.dumps(report,indent=2)+'\n');strip.save(ROOT/'art-source/hit-impact-v2/candidate-hit.png')
print(json.dumps({k:v for k,v in report.items() if k!='frames'},indent=2));print('HIT_IMPACT_V2_'+('RUNTIME_PASS' if args.runtime else 'SOURCE_PASS'))
