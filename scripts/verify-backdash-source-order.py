"""Regress the 2x4 sheet order when pose centroids have different heights."""
from pathlib import Path
import importlib.util
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('dash_import',root/'scripts/build-backdash-motion-v2.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
sheet=Image.new('RGBA',(2048,1024));draw=ImageDraw.Draw(sheet)
colors=[(40+i*30,80,150,255) for i in range(8)]
# Heights deliberately make centroid sorting disagree with reading order.
for i,color in enumerate(colors):
 x=(i%4)*512+150;y=(i//4)*512+50+[40,0,60,20,20,60,0,40][i]
 draw.rectangle((x,y,x+120,y+300),fill=color)
frames=p.extract_sheet(sheet)
assert [f.getpixel((f.width//2,f.height//2)) for f in frames]==colors,'Contact/return poses must follow row-major order, independent of centroid height'
missing=sheet.copy();ImageDraw.Draw(missing).rectangle((1536,512,2047,1023),fill=(0,0,0,0))
try:p.extract_sheet(missing)
except ValueError:pass
else:raise AssertionError('Missing drawing must fail')
clipped=sheet.copy();ImageDraw.Draw(clipped).rectangle((0,90,270,390),fill=colors[0])
try:p.extract_sheet(clipped)
except ValueError:pass
else:raise AssertionError('Clipped drawing must fail')
print('BACKDASH_SOURCE_ORDER_PASS row-major=8 missing/clipped=rejected')
