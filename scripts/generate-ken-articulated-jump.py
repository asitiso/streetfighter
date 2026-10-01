from __future__ import annotations

"""Generate Ken's 8F articulated jump cycle from the approved HQ master.

The runtime removes root translation for jump sprites, so the authored motion
must survive as real silhouette changes: compression, leg tuck, apex compactness,
extension and landing preparation.  Local radial controls are used instead of a
whole-sprite transform.
"""

from pathlib import Path
from PIL import Image
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'public/art/combat-sprites-hq/ken.webp'
OUTPUT=ROOT/'art-source/ken/inbox/jump'
PREVIEW=ROOT/'art-source/ken/ken-jump-articulated-source-preview.png'

POSES: list[list[tuple[float,float,float,float,float]]] = [
    # 01 anticipation
    [(108,408,-5,0,30),(278,408,6,0,30),(145,330,-4,10,44),(235,330,4,10,44),
     (190,286,0,12,58),(190,218,4,9,72),(212,138,4,7,48),
     (150,180,-7,8,38),(164,210,-5,8,38),(264,235,5,2,36),(245,205,3,3,38),(228,102,-4,4,31)],
    # 02 compression
    [(108,408,-8,0,30),(126,376,-6,6,35),(145,330,-10,27,45),
     (278,408,10,0,30),(255,376,7,7,35),(235,330,10,28,45),
     (190,286,0,32,60),(190,218,2,32,74),(212,138,2,28,50),
     (150,180,-12,20,39),(164,210,-9,21,39),(264,235,7,16,37),(245,205,5,17,39),(228,102,-7,15,31)],
    # 03 launch
    [(108,408,-12,-15,31),(126,376,-7,-20,36),(145,330,0,-12,45),
     (278,408,18,-28,31),(255,376,15,-30,36),(235,330,12,-22,45),
     (190,286,7,-15,60),(190,218,14,-24,74),(212,138,14,-27,50),
     (150,180,-8,-13,39),(164,210,-5,-14,39),(264,235,10,-18,37),(245,205,8,-18,39),(228,102,-9,-18,31)],
    # 04 rise: both legs begin tucking under the hips
    [(108,408,46,-72,32),(126,376,39,-59,37),(145,330,27,-36,46),
     (278,408,-42,-74,32),(255,376,-35,-60,37),(235,330,-25,-38,46),
     (190,286,5,-14,61),(190,218,9,-19,75),(212,138,10,-20,50),
     (150,180,-2,-10,40),(164,210,0,-10,40),(264,235,6,-10,38),(245,205,5,-10,40),(228,102,-10,-14,32)],
    # 05 apex: compact knee tuck, arms protect the torso
    [(108,408,70,-104,33),(126,376,57,-85,38),(145,330,37,-55,47),
     (278,408,-68,-103,33),(255,376,-55,-84,38),(235,330,-37,-55,47),
     (190,286,0,-8,62),(190,218,0,-8,76),(212,138,0,-10,51),
     (150,180,8,-7,40),(164,210,9,-6,40),(264,235,-10,-5,38),(245,205,-8,-5,40),(228,102,-5,-8,32)],
    # 06 fall: legs extend again but remain off the ground
    [(108,408,38,-58,32),(126,376,31,-48,37),(145,330,22,-29,46),
     (278,408,-24,-48,32),(255,376,-19,-40,37),(235,330,-13,-24,46),
     (190,286,-3,2,61),(190,218,-6,1,75),(212,138,-7,0,50),
     (150,180,2,1,40),(164,210,3,1,40),(264,235,-6,3,38),(245,205,-4,3,40),(228,102,8,0,32)],
    # 07 landing prepare: feet reach down, knees stay soft
    [(108,408,12,-18,31),(126,376,10,-12,36),(145,330,5,9,45),
     (278,408,-10,-16,31),(255,376,-8,-10,36),(235,330,-5,10,45),
     (190,286,-2,18,60),(190,218,-5,17,74),(212,138,-6,14,50),
     (150,180,4,10,39),(164,210,5,11,39),(264,235,-7,11,37),(245,205,-5,11,39),(228,102,7,9,31)],
    # 08 contact bridge: asymmetric crouch so it is not a duplicate of anticipation
    [(108,408,9,0,30),(126,376,7,5,35),(145,330,7,20,45),
     (278,408,-5,0,30),(255,376,-3,4,35),(235,330,-5,17,45),
     (190,286,4,25,60),(190,218,8,23,74),(212,138,8,19,50),
     (150,180,7,13,39),(164,210,8,14,39),(264,235,-4,15,37),(245,205,-2,14,39),(228,102,5,13,31)],
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
    print(f'KEN_ARTICULATED_JUMP_READY frames={len(frames)} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')

if __name__=='__main__': main()
