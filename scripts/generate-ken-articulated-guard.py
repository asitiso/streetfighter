from __future__ import annotations
"""Generate Ken 5F compact grounded guard reaction."""
from pathlib import Path
from PIL import Image
import cv2, numpy as np
ROOT=Path(__file__).resolve().parents[1]; SOURCE=ROOT/'public/art/combat-sprites-hq/ken.webp'; OUTPUT=ROOT/'art-source/ken/inbox/guard'; PREVIEW=ROOT/'art-source/ken/ken-guard-articulated-source-preview.png'
POSES=[
 [],
 [(145,330,-2,4,44),(235,330,2,4,44),(190,286,-3,5,58),(190,218,-6,5,72),(212,138,-6,4,48),(150,180,8,-10,38),(164,210,10,-9,38),(264,235,-12,-16,36),(245,205,-10,-13,38),(228,102,3,3,31)],
 [(145,330,-4,8,44),(235,330,4,8,44),(190,286,-6,9,58),(190,218,-11,8,72),(212,138,-12,6,48),(150,180,15,-18,38),(164,210,17,-17,38),(264,235,-21,-25,36),(245,205,-18,-21,38),(228,102,6,4,31)],
 [(145,330,-3,6,44),(235,330,3,6,44),(190,286,-4,7,58),(190,218,-8,6,72),(212,138,-8,5,48),(150,180,10,-13,38),(164,210,12,-12,38),(264,235,-15,-18,36),(245,205,-13,-16,38),(228,102,4,3,31)],
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
 pv=Image.new('RGBA',(im.width*len(fr),im.height),(0,0,0,0)); [pv.alpha_composite(f,(i*im.width,0)) for i,f in enumerate(fr)]; pv.save(PREVIEW,optimize=True); print(f'KEN_ARTICULATED_GUARD_READY frames={len(fr)}')
if __name__=='__main__': main()
