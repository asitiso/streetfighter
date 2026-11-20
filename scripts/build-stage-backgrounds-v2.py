from pathlib import Path
import json,hashlib
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1]
rows=[];thumbs=[]
for name in ['newyork','hongkong','japan','london','society']:
 src=root/'art-source/stage-backgrounds-v2'/f'{name}.png'
 dst=root/'public/art/stage-backgrounds-v2'/f'{name}.webp'
 im=Image.open(src).convert('RGB'); im.save(dst,'WEBP',quality=85,method=6)
 rows.append(dict(id=name,width=im.width,height=im.height,bytes=dst.stat().st_size,decodedBytes=im.width*im.height*4,sourceSha256=hashlib.sha256(src.read_bytes()).hexdigest(),runtimeSha256=hashlib.sha256(dst.read_bytes()).hexdigest()))
 thumb=ImageOps.contain(im,(960,320)); panel=Image.new('RGB',(960,350),'#111827');panel.paste(thumb,(0,25));ImageDraw.Draw(panel).text((12,8),name,fill='white');thumbs.append(panel)
(root/'art-source/stage-backgrounds-v2/qa.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(960,350*len(thumbs)));[sheet.paste(t,(0,i*350)) for i,t in enumerate(thumbs)];sheet.save(root.parent/'outputs/stage-backgrounds-v2-contact.png')
print(json.dumps(rows))
