from __future__ import annotations
"""Author Ken's grounded standing attacks with piecewise articulated forearm motion.

Unlike the old whole-sprite affine staging, this keeps the feet/root planted and
rotates the right forearm/glove around the elbow while the upper body receives a
small localized drive. The source remains the existing 384x448 HQ Ken artwork.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/art/combat-sprites-hq/ken.webp'
INBOX = ROOT / 'art-source/ken/inbox'
PREVIEW_DIR = ROOT / 'art-source/ken'

FOREARM_POLY = [
    (237,207),(262,205),(275,220),(292,231),(303,245),(300,267),
    (287,278),(268,276),(249,260),(237,243),(231,224),
]
ELBOW_PIVOT = (248, 210)

LIGHT = {
    'angles': [0,22,55,92,64,28,0],
    'torso_dx': [0,2,5,11,7,3,0],
    'torso_dy': [0,0,0,0,0,0,0],
    'arm_dx': [0,3,8,18,12,5,0],
    'arm_dy': [0,0,0,0,0,0,0],
    'guard_dx': [0,0,0,0,0,0,0],
    'guard_dy': [0,0,0,0,0,0,0],
    'forearm_extra_x': [0,0,0,0,0,0,0],
}

HEAVY = {
    'angles': [0,10,28,52,76,100,88,62,30,0],
    'torso_dx': [0,-1,2,7,14,22,17,10,4,0],
    'torso_dy': [0,0,1,4,10,18,12,6,2,0],
    'arm_dx': [0,1,4,10,20,34,26,15,6,0],
    'arm_dy': [0,0,0,1,2,4,3,2,1,0],
    'guard_dx': [0,-1,-2,-4,-7,-10,-8,-5,-2,0],
    'guard_dy': [0,-1,-2,-3,-5,-7,-5,-3,-2,0],
    'forearm_extra_x': [0,0,0,0,2,6,3,0,0,0],
}


def extract_forearm(source: Image.Image):
    w, h = source.size
    mask = Image.new('L', (w,h), 0)
    ImageDraw.Draw(mask).polygon(FOREARM_POLY, fill=255)
    segment = Image.new('RGBA', (w,h), (0,0,0,0))
    segment.paste(source, (0,0), mask)
    arr = np.asarray(source).copy()
    alpha = arr[..., 3]
    alpha[np.asarray(mask) > 0] = 0
    arr[..., 3] = alpha
    return Image.fromarray(arr, 'RGBA'), segment


def localized_warp(base: Image.Image, *, torso_dx: float, torso_dy: float,
                   arm_dx: float, arm_dy: float, guard_dx: float, guard_dy: float):
    a = np.asarray(base)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = np.zeros((h,w), np.float32)
    dy = np.zeros((h,w), np.float32)
    controls = [
        (205,180,torso_dx,torso_dy,90),
        (250,188,arm_dx,arm_dy,48),
        (175,190,guard_dx,guard_dy,50),
    ]
    for cx, cy, mx, my, radius in controls:
        if abs(mx) < 1e-6 and abs(my) < 1e-6:
            continue
        weight = np.exp(-((xx-cx)**2 + (yy-cy)**2)/(2*radius*radius)).astype(np.float32)
        dx += mx * weight
        dy += my * weight
    channels = [
        cv2.remap(a[:,:,c], xx-dx, yy-dy, cv2.INTER_CUBIC,
                  borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        for c in range(4)
    ]
    return Image.fromarray(np.stack(channels, axis=2).astype(np.uint8), 'RGBA')



def clear_hanging_arm_ghosts(body: Image.Image) -> Image.Image:
    """Remove residual pixels from the original hanging forearm after body warps.

    The articulated forearm is composited back afterward. Restrict cleanup to the
    original hand corridor and skin/brown glove colors so red gi/pants stay intact.
    """
    a = np.asarray(body).copy()
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    r = a[...,0].astype(np.float32); g = a[...,1].astype(np.float32); b = a[...,2].astype(np.float32)
    ratio_g = g / np.maximum(r, 1.0)
    ratio_b = b / np.maximum(r, 1.0)
    skin = (r > 150) & (g > 65) & (ratio_g > .34) & (ratio_b < .72)
    brown = (r > 45) & (r < 175) & (ratio_g > .28) & (ratio_g < .78) & (ratio_b > .12) & (ratio_b < .62)
    corridor = (xx >= 220) & (xx <= 345) & (yy >= 225) & (yy <= 292)
    kill = corridor & (skin | brown) & (a[...,3] > 0)
    a[...,3][kill] = 0
    return Image.fromarray(a, 'RGBA')

def make_frames(source: Image.Image, spec: dict):
    w, h = source.size
    base, forearm = extract_forearm(source)
    frames = []
    count = len(spec['angles'])
    for i in range(count):
        body = localized_warp(
            base,
            torso_dx=spec['torso_dx'][i], torso_dy=spec['torso_dy'][i],
            arm_dx=spec['arm_dx'][i], arm_dy=spec['arm_dy'][i],
            guard_dx=spec['guard_dx'][i], guard_dy=spec['guard_dy'][i],
        )
        if spec['angles'][i] != 0:
            body = clear_hanging_arm_ghosts(body)
        limb = forearm.rotate(
            spec['angles'][i],
            resample=Image.Resampling.BICUBIC,
            center=ELBOW_PIVOT,
        )
        shift_x = round(spec['torso_dx'][i] + spec['arm_dx'][i] + spec['forearm_extra_x'][i])
        shift_y = max(0, round(spec['torso_dy'][i] / 2 + spec['arm_dy'][i] / 2))
        shifted = Image.new('RGBA', (w,h), (0,0,0,0))
        shifted.alpha_composite(limb, (shift_x, shift_y))
        frame = body.copy()
        frame.alpha_composite(shifted)
        frames.append(frame)
    return frames


def save_sequence(kind: str, frames: list[Image.Image]):
    out = INBOX / kind
    out.mkdir(parents=True, exist_ok=True)
    for path in out.glob('*'):
        if path.suffix.lower() in {'.png','.webp','.jpg','.jpeg'} and not path.name.startswith('_'):
            path.unlink()
    for i, frame in enumerate(frames):
        frame.save(out / f'{i:02d}.png', optimize=True)

    w, h = frames[0].size
    strip = Image.new('RGBA', (w*len(frames), h), (0,0,0,0))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (i*w,0))
    preview = PREVIEW_DIR / f'ken-{kind}-articulated-source-preview.png'
    strip.save(preview, optimize=True)
    return preview


def main():
    source = Image.open(SOURCE).convert('RGBA')
    if source.size != (384,448):
        raise SystemExit(f'KEN HQ source must remain 384x448, got {source.size}')
    results = {}
    for kind, spec in [('stand-light', LIGHT), ('stand-heavy', HEAVY)]:
        frames = make_frames(source, spec)
        preview = save_sequence(kind, frames)
        results[kind] = {'frames': len(frames), 'preview': str(preview.relative_to(ROOT))}
    print('KEN_ARTICULATED_STANDING_ATTACKS_READY', results)


if __name__ == '__main__':
    main()
