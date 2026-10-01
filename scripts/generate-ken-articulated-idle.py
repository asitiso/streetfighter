from __future__ import annotations

"""Generate the RC39 Ken 6F articulated idle authoring candidate.

This is intentionally *not* a whole-sprite affine animation.  A small radial
control mesh moves the chest, head/hair, arms, hips and knees independently so
silhouette changes survive affine-registration QA while the feet stay planted.
The output is a transparent 384x448 PNG directory ready for ingest:ken:idle.
"""

from pathlib import Path
from PIL import Image
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUTPUT = ROOT / 'art-source/ken/inbox/idle'
PREVIEW = ROOT / 'art-source/ken/ken-idle-articulated-source-preview.png'

# x, y, dx, dy, gaussian radius.  Coordinates reference the approved 384x448
# Ken HQ master.  Small, overlapping controls behave like a soft 2D rig.
POSES: list[list[tuple[float, float, float, float, float]]] = [
    [],
    [(190,205,0,-2.5,80),(214,132,1,-2,48),(147,178,-4,5,36),(163,205,-3,6,34),(263,235,2,-3,34),(182,285,-1,1,54),(230,100,3,-1,32)],
    [(190,205,0,-4.5,82),(214,132,2,-3.5,48),(147,178,-7,9,34),(163,205,-5,8,34),(263,235,4,-5,32),(182,285,-2,2,54),(230,100,5,-2,30),(145,340,-2,-1,36),(235,345,2,1,36)],
    [(190,205,1.5,-1.8,82),(214,132,2,-1,48),(147,178,3,-4,34),(163,205,2,-3,34),(263,235,7,10,32),(244,205,4,6,34),(182,285,2,1,54),(230,100,4,1,30),(145,340,2,1,36),(235,345,-2,-1,36)],
    [(190,205,0,2.5,82),(214,132,-1,2,48),(147,178,4,-5,34),(163,205,3,-4,34),(263,235,5,7,32),(244,205,3,4,34),(182,285,1,-1,54),(230,100,-3,2,30)],
    [(190,205,0,.5,80),(214,132,-.3,.4,48),(147,178,1,-1,36),(163,205,.8,-.8,34),(263,235,1,1.2,34),(182,285,.3,0,54),(230,100,-.8,.5,32)],
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

    frames: list[Image.Image] = []
    for index, controls in enumerate(POSES):
        frame = articulated_warp(source, controls)
        frame.save(OUTPUT / f'{index:02d}.png', optimize=True)
        frames.append(frame)

    preview = Image.new('RGBA', (source_image.width * len(frames), source_image.height), (0,0,0,0))
    for index, frame in enumerate(frames):
        preview.alpha_composite(frame, (index * source_image.width, 0))
    preview.save(PREVIEW, optimize=True)
    print(f'KEN_ARTICULATED_IDLE_READY frames={len(frames)} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
