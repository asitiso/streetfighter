from __future__ import annotations

"""Generate Ken's 7F articulated forward dash from the approved HQ master.

Each phase uses independent local controls for feet, knees, pelvis, torso, head,
arms and hair.  The sequence is intentionally non-looping: ready -> load ->
launch -> max drive -> passing drive -> brake -> recovery bridge.
"""

from pathlib import Path
from PIL import Image
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUTPUT = ROOT / 'art-source/ken/inbox/dash'
PREVIEW = ROOT / 'art-source/ken/ken-dash-articulated-source-preview.png'
FRAME_COUNT = 7

# (x, y, dx, dy, gaussian radius)
POSES: list[list[tuple[float,float,float,float,float]]] = [
    # 01 ready: already leaning into the command; not a duplicate of neutral.
    [(108,408,-4,0,30),(278,408,8,0,30),(145,330,3,5,44),(235,330,6,4,44),
     (190,286,7,6,58),(190,218,14,4,72),(212,138,14,1,48),
     (150,180,-3,6,38),(164,210,1,6,38),(264,235,8,-4,36),(245,205,8,-3,38),(228,102,-5,1,31)],

    # 02 drive-load: center drops onto the rear leg, shoulders coil.
    [(108,408,-10,0,30),(126,376,-8,6,35),(145,330,-6,16,44),
     (278,408,12,0,30),(255,376,8,8,35),(235,330,5,15,44),
     (190,286,-5,21,60),(190,218,2,16,74),(212,138,2,12,50),
     (150,180,-12,13,39),(164,210,-9,12,39),(264,235,3,7,37),(245,205,0,8,39),(228,102,-7,7,31)],

    # 03 launch: rear leg extends while the lead side lifts; keep deformation compact.
    [(108,408,-12,0,31),(126,376,-9,-4,36),(145,330,-2,-2,45),
     (278,408,20,-10,31),(255,376,18,-16,36),(235,330,16,-11,45),
     (190,286,14,9,60),(190,218,25,5,74),(212,138,25,1,50),
     (150,180,-10,5,40),(164,210,-7,6,40),(264,235,13,-9,38),(245,205,11,-8,40),(228,102,-8,0,32)],

    # 04 max-drive: strongest diagonal, but limbs remain compact enough to avoid rubber-band stretch.
    [(108,408,-17,0,31),(126,376,-13,-7,36),(145,330,-4,-5,46),
     (278,408,28,-15,31),(255,376,25,-21,37),(235,330,22,-16,46),
     (190,286,23,12,61),(190,218,39,9,76),(212,138,37,5,50),
     (150,180,-15,9,40),(164,210,-11,10,40),(264,235,18,-13,38),(245,205,15,-11,40),(228,102,-12,2,32)],

    # 05 passing-drive: rear leg comes through instead of being dragged as a stretched trail.
    [(108,408,20,-18,31),(126,376,18,-22,36),(145,330,16,-16,46),
     (278,408,7,0,31),(255,376,9,-2,36),(235,330,12,1,46),
     (190,286,20,7,61),(190,218,31,3,76),(212,138,30,-1,50),
     (150,180,-8,1,40),(164,210,-5,3,40),(264,235,14,-10,38),(245,205,13,-9,40),(228,102,-10,-1,32)],

    # 06 brake: front foot catches, chest starts coming back over the hips.
    [(108,408,12,-6,31),(126,376,10,-7,36),(145,330,8,-3,46),
     (278,408,22,0,31),(255,376,20,3,36),(235,330,16,7,46),
     (190,286,13,10,60),(190,218,19,7,74),(212,138,18,3,50),
     (150,180,-1,2,39),(164,210,2,3,39),(264,235,9,-5,37),(245,205,8,-4,39),(228,102,-6,1,31)],

    # 07 recovery bridge: close to stance, but opposite weight/guard phase from 01.
    [(108,408,10,0,30),(126,376,7,2,35),(145,330,5,7,44),
     (278,408,-6,0,30),(255,376,-3,2,35),(235,330,-2,7,44),
     (190,286,2,8,58),(190,218,8,5,72),(212,138,7,2,48),
     (150,180,8,-3,38),(164,210,7,-2,38),(264,235,-5,6,36),(245,205,-3,5,38),(228,102,5,2,31)],
]


def articulated_warp(source: np.ndarray, controls: list[tuple[float,float,float,float,float]]) -> Image.Image:
    height, width = source.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    dx = np.zeros((height, width), np.float32)
    dy = np.zeros((height, width), np.float32)
    for cx, cy, move_x, move_y, radius in controls:
        weight = np.exp(-((xx-cx)**2 + (yy-cy)**2) / (2 * radius * radius)).astype(np.float32)
        dx += move_x * weight
        dy += move_y * weight
    map_x = xx - dx
    map_y = yy - dy
    channels = [
        cv2.remap(source[:, :, channel], map_x, map_y, cv2.INTER_CUBIC,
                  borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        for channel in range(4)
    ]
    return Image.fromarray(np.stack(channels, axis=2).astype(np.uint8), 'RGBA')


def main() -> None:
    source_image = Image.open(SOURCE).convert('RGBA')
    source = np.asarray(source_image)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for old in OUTPUT.glob('*.png'):
        if not old.name.startswith('_'):
            old.unlink()
    frames=[articulated_warp(source, controls) for controls in POSES]
    for index, frame in enumerate(frames):
        frame.save(OUTPUT/f'{index:02d}.png', optimize=True)
    preview=Image.new('RGBA',(source_image.width*FRAME_COUNT,source_image.height),(0,0,0,0))
    for index,frame in enumerate(frames):
        preview.alpha_composite(frame,(index*source_image.width,0))
    preview.save(PREVIEW,optimize=True)
    print(f'KEN_ARTICULATED_DASH_READY frames={FRAME_COUNT} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')


if __name__=='__main__':
    main()
