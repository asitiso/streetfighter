from pathlib import Path
import importlib.util
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('walk_forward_import',root/'scripts/build-walk-forward-motion-v2.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
sheet=Image.new('RGBA',(2048,2048));draw=ImageDraw.Draw(sheet);colors=[(40+i*12,80,150,255) for i in range(16)]
for i,color in enumerate(colors):
 x=i%4*512+150;y=i//4*512+40+[40,0,60,20][i%4];draw.rectangle((x,y,x+120,y+300),fill=color)
frames=p.extract_sheet(sheet)
assert [f.getpixel((f.width//2,f.height//2)) for f in frames]==colors
missing=sheet.copy();ImageDraw.Draw(missing).rectangle((1536,1536,2047,2047),fill=(0,0,0,0))
try:p.extract_sheet(missing)
except ValueError:pass
else:raise AssertionError('Missing pose accepted')
clipped=sheet.copy();ImageDraw.Draw(clipped).rectangle((0,80,270,380),fill=colors[0])
try:p.extract_sheet(clipped)
except ValueError:pass
else:raise AssertionError('Clipped pose accepted')
print('WALK_FORWARD_SOURCE_ORDER_PASS row-major=16 missing/clipped=rejected')
