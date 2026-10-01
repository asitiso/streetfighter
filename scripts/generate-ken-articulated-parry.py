from __future__ import annotations
"""Generate Ken 6F fast deflect/parry with a planted lower body."""
from pathlib import Path
from PIL import Image
import cv2, numpy as np
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/art/combat-sprites-hq/ken.webp'; OUTPUT=ROOT/'art-source/ken/inbox/parry'; PREVIEW=ROOT/'art-source/ken/ken-parry-articulated-source-preview.png'
POSES=[
 [],
 [(145,330,1,2,44),(235,330,2,2,44),(190,286,3,3,58),(190,218,6,2,72),(212,138,6,1,48),(150,180,2,-4,38),(164,210,3,-4,38),(264,235,10,-10,36),(245,205,8,-8,38),(228,102,-3,0,31)],
 [(145,330,3,5,44),(235,330,4,4,44),(190,286,7,5,58),(190,218,13,2,72),(212,138,14,0,48),(150,180,5,-7,38),(164,210,7,-6,38),(264,235,31,-25,37),(245,205,25,-21,39),(228,102,-7,-1,31)],
 [(145,330,2,4,44),(235,330,3,3,44),(190,286,6,4,58),(190,218,11,1,72),(212,138,12,-1,48),(150,180,3,-5,38),(164,210,5,-4,38),(264,235,25,-18,37),(245,205,20,-15,39),(228,102,-5,-1,31)],
 [(145,330,1,2,44),(235,330,2,2,44),(190,286,2,2,58),(190,218,5,1,72),(212,138,5,0,48),(150,180,1,-2,38),(164,210,2,-2,38),(264,235,11,-8,36),(245,205,9,-6,38),(228,102,-2,0,31)],
 [],
]
def warp(src,controls):
 h,w=src.shape[:2]; yy,xx=np.mgrid[0:h,0:w].astype(np.float32); dx=np.zeros((h,w),np.float32); dy=np.zeros((h,w),np.float32)
 for cx,cy,mx,my,r in controls:
  wt=np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*r*r)).astype(np.float32); dx+=mx*wt; dy+=my*wt
 ch=[cv2.remap(src[:,:,c],xx-dx,yy-dy,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=0) for c in range(4)]
 return Image.fromarray(np.stack(ch,axis=2).astype(np.uint8),'RGBA')
def main():
 im=Image.open(SOURCE).convert('RGBA'); src=np.asarray(im); OUTPUT.mkdir(parents=True,exist_ok=True)
 for p in OUTPUT.glob('*.png'):
  if not p.name.startswith('_'): p.unlink()
 fr=[warp(src,p) for p in POSES]
 for i,f in enumerate(fr): f.save(OUTPUT/f'{i:02d}.png',optimize=True)
 pv=Image.new('RGBA',(im.width*len(fr),im.height),(0,0,0,0)); [pv.alpha_composite(f,(i*im.width,0)) for i,f in enumerate(fr)]; pv.save(PREVIEW,optimize=True); print(f'KEN_ARTICULATED_PARRY_READY frames={len(fr)}')
if __name__=='__main__': main()
