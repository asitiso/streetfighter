from __future__ import annotations
"""Generate Ken 8F grounded hit reaction using localized articulated warps."""
from pathlib import Path
from PIL import Image
import cv2, numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/art/combat-sprites-hq/ken.webp'; OUTPUT=ROOT/'art-source/ken/inbox/hit'; PREVIEW=ROOT/'art-source/ken/ken-hit-articulated-source-preview.png'
POSES=[
 [],
 [(108,408,-3,0,30),(278,408,4,0,30),(145,330,-4,8,44),(235,330,5,7,44),(190,286,-5,9,58),(190,218,-9,10,72),(212,138,-10,9,48),(150,180,-8,9,38),(164,210,-7,9,38),(264,235,-4,6,36),(245,205,-5,7,38),(228,102,5,6,31)],
 [(108,408,-7,0,30),(126,376,-5,2,35),(145,330,-8,5,44),(278,408,8,0,30),(255,376,6,3,35),(235,330,7,8,44),(190,286,-12,8,59),(190,218,-22,3,73),(212,138,-24,-1,49),(150,180,-15,2,39),(164,210,-13,2,39),(264,235,-14,12,37),(245,205,-13,10,39),(228,102,10,-2,31)],
 [(108,408,-14,0,31),(126,376,-11,1,36),(145,330,-13,4,45),(278,408,16,0,31),(255,376,13,4,36),(235,330,12,11,45),(190,286,-20,12,60),(190,218,-35,4,75),(212,138,-37,-3,50),(150,180,-22,2,40),(164,210,-19,3,40),(264,235,-22,18,38),(245,205,-20,16,40),(228,102,16,-3,32)],
 [(108,408,-20,0,31),(126,376,-17,2,36),(145,330,-16,5,45),(278,408,8,0,31),(255,376,8,4,36),(235,330,9,10,45),(190,286,-17,10,60),(190,218,-29,5,74),(212,138,-30,0,50),(150,180,-18,4,40),(164,210,-15,5,40),(264,235,-18,15,38),(245,205,-16,13,40),(228,102,12,0,32)],
 [(108,408,-12,0,31),(126,376,-10,2,36),(145,330,-10,5,45),(278,408,5,0,31),(255,376,5,3,36),(235,330,6,8,45),(190,286,-11,8,60),(190,218,-18,5,74),(212,138,-19,2,50),(150,180,-12,5,39),(164,210,-10,6,39),(264,235,-11,11,37),(245,205,-10,10,39),(228,102,8,1,31)],
 [(108,408,-5,0,30),(278,408,3,0,30),(145,330,-5,4,44),(235,330,4,5,44),(190,286,-5,5,58),(190,218,-8,4,72),(212,138,-8,3,48),(150,180,-5,4,38),(164,210,-4,4,38),(264,235,-5,5,36),(245,205,-4,5,38),(228,102,3,2,31)],
 [],
]
def warp(src,controls):
 h,w=src.shape[:2]; yy,xx=np.mgrid[0:h,0:w].astype(np.float32); dx=np.zeros((h,w),np.float32); dy=np.zeros((h,w),np.float32)
 for cx,cy,mx,my,r in controls:
  wt=np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*r*r)).astype(np.float32); dx+=mx*wt; dy+=my*wt
 mxg=xx-dx; myg=yy-dy
 ch=[cv2.remap(src[:,:,c],mxg,myg,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=0) for c in range(4)]
 return Image.fromarray(np.stack(ch,axis=2).astype(np.uint8),'RGBA')
def main():
 im=Image.open(SOURCE).convert('RGBA'); src=np.asarray(im); OUTPUT.mkdir(parents=True,exist_ok=True)
 for p in OUTPUT.glob('*.png'):
  if not p.name.startswith('_'): p.unlink()
 fr=[warp(src,p) for p in POSES]
 for i,f in enumerate(fr): f.save(OUTPUT/f'{i:02d}.png',optimize=True)
 pv=Image.new('RGBA',(im.width*len(fr),im.height),(0,0,0,0))
 for i,f in enumerate(fr): pv.alpha_composite(f,(i*im.width,0))
 pv.save(PREVIEW,optimize=True); print(f'KEN_ARTICULATED_HIT_READY frames={len(fr)}')
if __name__=='__main__': main()
