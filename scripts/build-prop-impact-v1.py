from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
root=Path(__file__).resolve().parents[1];src=root/'art-source/prop-impact-v1/source.png';im=Image.open(src).convert('RGBA');assert im.size==(1536,1024);atlas=Image.new('RGBA',(768,512));rows=[]
for row,name in enumerate(['wood','metal','glass','cloth']):
 hashes=[]
 for frame in range(6):
  tile=im.crop((frame*256,row*256,(frame+1)*256,(row+1)*256)).convert('RGBa').resize((128,128),Image.Resampling.LANCZOS).convert('RGBA');hashes.append(hashlib.sha256(tile.tobytes()).hexdigest());atlas.alpha_composite(tile,(frame*128,row*128))
 assert len(set(hashes))==6
 rows.append(dict(material=name,frames=6,uniqueFrames=6))
dst=root/'public/art/prop-impact-v1/atlas.webp';atlas.save(dst,'WEBP',lossless=True,method=6,exact=True);assert np.array_equal(np.array(atlas),np.array(Image.open(dst).convert('RGBA')))
qa=dict(width=768,height=512,cell=128,frames=24,bytes=dst.stat().st_size,decodedBytes=768*512*4,sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),runtimeSha256=hashlib.sha256(dst.read_bytes()).hexdigest(),rows=rows)
(root/'art-source/prop-impact-v1/qa.json').write_text(json.dumps(qa,indent=2)+'\n',encoding='utf-8');matte=Image.new('RGBA',atlas.size,'#354052');matte.alpha_composite(atlas);matte.convert('RGB').save(root.parent/'outputs/prop-impact-v1-contact.png');print(json.dumps(qa))
