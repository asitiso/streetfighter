from __future__ import annotations

"""Generate Ken's 6F articulated landing: contact -> squash -> rebound -> settle."""

from pathlib import Path
from PIL import Image
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/art/combat-sprites-hq/ken.webp'
OUTPUT=ROOT/'art-source/ken/inbox/landing'
PREVIEW=ROOT/'art-source/ken/ken-landing-articulated-source-preview.png'

POSES: list[list[tuple[float,float,float,float,float]]] = [
    # 01 pre-contact: narrow, descending stance
    [(108,408,22,-22,31),(126,376,18,-18,36),(145,330,12,-2,46),
     (278,408,-18,-20,31),(255,376,-15,-17,36),(235,330,-10,0,46),
     (190,286,0,12,61),(190,218,0,10,75),(212,138,0,7,50),
     (150,180,3,5,40),(164,210,4,5,40),(264,235,-4,6,38),(245,205,-3,6,40),(228,102,4,4,32)],
    # 02 ground contact: feet spread and knees start absorbing load
    [(108,408,-8,0,31),(126,376,-5,8,36),(145,330,-12,23,46),
     (278,408,10,0,31),(255,376,7,8,36),(235,330,13,24,46),
     (190,286,0,30,62),(190,218,0,30,76),(212,138,0,26,51),
     (150,180,-7,18,40),(164,210,-5,19,40),(264,235,7,18,38),(245,205,5,19,40),(228,102,-5,16,32)],
    # 03 maximum squash: deep crouch without flattening the torso into a smear
    [(108,408,-15,0,32),(126,376,-11,10,37),(145,330,-18,34,47),
     (278,408,17,0,32),(255,376,13,10,37),(235,330,19,35,47),
     (190,286,0,44,64),(190,218,0,47,78),(212,138,0,43,53),
     (150,180,-10,30,42),(164,210,-8,31,42),(264,235,9,29,40),(245,205,8,30,42),(228,102,-6,27,33)],
    # 04 rebound: recover through an intermediate crouch so the motion does not pop upward
    [(108,408,-10,0,31),(126,376,-7,4,36),(145,330,-10,15,46),
     (278,408,12,0,31),(255,376,8,4,36),(235,330,11,16,46),
     (190,286,0,22,62),(190,218,1,17,76),(212,138,2,13,51),
     (150,180,-6,9,40),(164,210,-4,10,40),(264,235,5,9,38),(245,205,4,9,40),(228,102,-4,7,32)],
    # 05 settle: small after-bounce with opposite weight bias
    [(108,408,4,0,30),(126,376,3,2,35),(145,330,6,11,45),
     (278,408,-7,0,30),(255,376,-5,3,35),(235,330,-7,12,45),
     (190,286,4,17,60),(190,218,7,14,74),(212,138,7,10,50),
     (150,180,8,7,39),(164,210,8,8,39),(264,235,-5,9,37),(245,205,-3,8,39),(228,102,5,7,31)],
    # 06 neutral bridge: near stance but intentionally different from pre-contact
    [(108,408,-3,0,30),(278,408,5,0,30),(145,330,2,5,44),(235,330,4,6,44),
     (190,286,6,7,58),(190,218,10,4,72),(212,138,10,1,48),
     (150,180,-4,5,38),(164,210,-2,5,38),(264,235,7,-2,36),(245,205,6,-2,38),(228,102,-4,1,31)],
]


def articulated_warp(source: np.ndarray, controls):
    h,w=source.shape[:2]
    yy,xx=np.mgrid[0:h,0:w].astype(np.float32)
    dx=np.zeros((h,w),np.float32); dy=np.zeros((h,w),np.float32)
    for cx,cy,mx,my,r in controls:
        wt=np.exp(-((xx-cx)**2+(yy-cy)**2)/(2*r*r)).astype(np.float32)
        dx += mx*wt; dy += my*wt
    map_x=xx-dx; map_y=yy-dy
    channels=[cv2.remap(source[:,:,c],map_x,map_y,cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT,borderValue=0) for c in range(4)]
    return Image.fromarray(np.stack(channels,axis=2).astype(np.uint8),'RGBA')


def main():
    src_im=Image.open(SOURCE).convert('RGBA'); src=np.asarray(src_im)
    OUTPUT.mkdir(parents=True,exist_ok=True)
    for old in OUTPUT.glob('*.png'):
        if not old.name.startswith('_'): old.unlink()
    frames=[articulated_warp(src,p) for p in POSES]
    for i,fr in enumerate(frames): fr.save(OUTPUT/f'{i:02d}.png',optimize=True)
    preview=Image.new('RGBA',(src_im.width*len(frames),src_im.height),(0,0,0,0))
    for i,fr in enumerate(frames): preview.alpha_composite(fr,(i*src_im.width,0))
    preview.save(PREVIEW,optimize=True)
    print(f'KEN_ARTICULATED_LANDING_READY frames={len(frames)} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')

if __name__=='__main__': main()
