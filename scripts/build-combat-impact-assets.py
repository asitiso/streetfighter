from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'art-source/combat-impact-v1/generated-atlas-v1.png'
target=ROOT/'public/art/fx/combat-impact-v1.webp'
im=Image.open(source).convert('RGBA');a=np.array(im);h,w=a.shape[:2]
assert w==h and 512<=w<=2048
assert a[:,:,3].min()==0 and a[:,:,3].max()>=240
frames=[]
for row in range(4):
 for col in range(4):
  x0,x1=round(col*w/4),round((col+1)*w/4);y0,y1=round(row*h/4),round((row+1)*h/4)
  cell=a[y0:y1,x0:x1];mask=cell[:,:,3]>=128;yy,xx=np.nonzero(mask)
  assert len(xx)>100 and cell[:,:,3].max()>200
  assert not mask[0,:].any() and not mask[-1,:].any() and not mask[:,0].any() and not mask[:,-1].any(),'Opaque core crosses cell border'
  frames.append({'row':row,'frame':col,'sourceRect':[x0,y0,x1-x0,y1-y0],'coreBox':[int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())],'rgbaSha256':hashlib.sha256(cell.tobytes()).hexdigest()})
assert len({f['rgbaSha256'] for f in frames})==16
im.save(target,'WEBP',lossless=True,exact=True,method=6)
back=np.array(Image.open(target).convert('RGBA'));assert np.array_equal(back[:,:,3],a[:,:,3]);assert np.array_equal(back[a[:,:,3]>0],a[a[:,:,3]>0])
assert target.stat().st_size<2_000_000
report={'status':'passed','generator':'built-in imagegen','source':str(source.relative_to(ROOT)),'runtime':str(target.relative_to(ROOT)),'size':[w,h],'rows':['hit','guard','parry','counter'],'columns':4,'frames':frames,'decodedBytes':w*h*4,'runtimeBytes':target.stat().st_size,'runtimeSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'transparencyPreserved':True,'visiblePixelsLossless':True,'distinctFrames':16}
(ROOT/'art-source/combat-impact-v1/qa.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='frames'},indent=2))
