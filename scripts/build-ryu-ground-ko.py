from pathlib import Path
from argparse import ArgumentParser
from io import BytesIO
import json,hashlib
import numpy as np
from PIL import Image
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'art-source/ko-motion-v1/ryu';RUNTIME=ROOT/'public/art/ko-motion-v1/ryu.webp';W,H,N=512,448,8
sha=lambda b:hashlib.sha256(b).hexdigest().upper()
parser=ArgumentParser();parser.add_argument('--install',action='store_true');parser.add_argument('--runtime',action='store_true');args=parser.parse_args()
if args.install and args.runtime:parser.error('Choose install or runtime')
source=SOURCE/'generated-sheet-v1.png';arr=np.array(Image.open(source).convert('RGBA'));labels,count=ndimage.label(arr[:,:,3]>16);sizes=np.bincount(labels.ravel());sizes[0]=0;chosen=np.argsort(sizes)[-N:];assert len(chosen)==N and min(sizes[chosen])>1000,'Eight complete bodies required'
centers=sorted((float(np.nonzero(labels==lab)[0].mean()),float(np.nonzero(labels==lab)[1].mean()),int(lab)) for lab in chosen);ordered=[]
for row in range(2):ordered.extend(sorted(centers[row*4:row*4+4],key=lambda v:v[1]))
raw=[]
for _,_,lab in ordered:
 core=labels==lab;opaque=core&(arr[:,:,3]>128);assert not(opaque[0].any() or opaque[-1].any() or opaque[:,0].any() or opaque[:,-1].any()),'Source body clipped at sheet edge'
 keep=ndimage.binary_dilation(core,iterations=2);body=arr.copy();body[:,:,3][~keep]=0;im=Image.fromarray(body);box=im.getbbox();assert box;raw.append(im.crop(box))
idle=Image.open(ROOT/'public/art/animation-hq/ryu/idle.webp').convert('RGBA').crop((0,0,384,448));ibox=idle.getbbox();reference_height=ibox[3]-ibox[1];scale=reference_height/raw[0].height;baseline=int(np.nonzero(np.array(idle.getchannel('A'))>32)[0].max());frames=[];metrics=[]
for i,im in enumerate(raw):
 size=(round(im.width*scale),round(im.height*scale));assert size[0]<W-16 and size[1]<H-16,'Source anatomy cannot fit uncut at uniform scale';drawing=im.resize(size,Image.Resampling.LANCZOS);x=(W-size[0])//2;y=baseline-size[1]+1;assert y>0
 frame=Image.new('RGBA',(W,H));frame.alpha_composite(drawing,(x,y));mask=np.array(frame.getchannel('A'))>32;assert mask.any();assert not(mask[0].any() or mask[-1].any() or mask[:,0].any() or mask[:,-1].any()),'Packed body clipped';frames.append(frame);metrics.append({'frame':i,'sourceSize':list(im.size),'scaledSize':list(size),'paste':[x,y],'bbox':list(frame.getbbox()),'opaqueArea':int(mask.sum())})
visible=lambda im:np.where(np.array(im)[:,:,3:4]>0,np.array(im),0).tobytes()
assert len({sha(visible(f)) for f in frames})==N,'Eight unique original drawings required'
first,last=metrics[0],metrics[-1];assert last['scaledSize'][1]<first['scaledSize'][1]*.55 and last['scaledSize'][0]>first['scaledSize'][0]*1.25,'KO must settle to a horizontal lying body'
areas=np.array([m['opaqueArea'] for m in metrics],dtype=float);assert min(areas)/areas[0]>.45 and max(areas)/areas[0]<1.7,'Body volume inconsistent'
centroids=[]
for f in frames:
 ys,xs=np.nonzero(np.array(f.getchannel('A'))>32);centroids.append([float(xs.mean()),float(ys.mean())])
steps=np.linalg.norm(np.diff(np.array(centroids),axis=0),axis=1);assert max(steps)<90,'Collapse contains a large pose jump'
strip=Image.new('RGBA',(W*N,H))
for i,f in enumerate(frames):strip.alpha_composite(f,(i*W,0))
buffer=BytesIO();strip.save(buffer,'WEBP',lossless=True,method=6);data=buffer.getvalue();assert len(data)<750000,'KO download must stay below750KB'
decoded=Image.open(BytesIO(data)).convert('RGBA');assert visible(decoded)==visible(strip),'Lossless packing must preserve visible RGBA'
report={'passed':True,'character':'RYU','revision':'ground-ko-v1','source':'art-source/ko-motion-v1/ryu/generated-sheet-v1.png','sourceSha256':sha(source.read_bytes()),'runtime':'public/art/ko-motion-v1/ryu.webp','runtimeSha256':sha(data),'bytes':len(data),'frames':N,'frameSize':[W,H],'decodedBytes':W*H*N*4,'sourceGrid':[4,2],'sourceOrder':list(range(1,9)),'uniformScale':scale,'referenceHeight':reference_height,'sourceReferenceHeight':raw[0].height,'groundBaseline':baseline,'uniqueDrawings':N,'encoding':{'rgb':'lossless','alphaLossless':True},'maximumCentroidStep':float(max(steps)),'horizontalRestPass':True,'noClippingPass':True,'metrics':metrics}
if args.runtime:
 assert RUNTIME.read_bytes()==data,'Runtime must reconstruct exactly from source';assert json.loads((SOURCE/'qa.json').read_text())==report
else:
 (SOURCE/'qa.json').write_text(json.dumps(report,indent=2)+'\n');strip.save(SOURCE/'candidate-ko.png');(SOURCE/'candidate-ko.webp').write_bytes(data)
 if args.install:RUNTIME.parent.mkdir(parents=True,exist_ok=True);RUNTIME.write_bytes(data)
print(json.dumps(report));print('RYU_GROUND_KO_'+('RUNTIME_PASS' if args.runtime else 'INSTALL_PASS' if args.install else 'SOURCE_PASS'))
