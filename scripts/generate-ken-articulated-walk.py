from __future__ import annotations

"""Generate Ken's 12F articulated walk candidate from the approved HQ master.

The cycle uses independent radial controls for both feet/ankles/knees, hips,
torso, head, arms and hair. A foot is genuinely lifted during each half-cycle;
this keeps contact/passing phases readable instead of translating one still.
"""

from pathlib import Path
from PIL import Image
import cv2
import math
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUTPUT = ROOT / 'art-source/ken/inbox/walk'
PREVIEW = ROOT / 'art-source/ken/ken-walk-articulated-source-preview.png'
FRAME_COUNT = 12


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


def controls_for_frame(index: int) -> list[tuple[float,float,float,float,float]]:
    # 11 intervals close frame 12 exactly onto frame 1 for a seamless loop.
    phase = 2 * math.pi * index / (FRAME_COUNT - 1)
    stride = math.sin(phase)
    cadence = math.cos(phase)
    left_lift = max(0.0, stride)
    right_lift = max(0.0, -stride)
    compression = (1 - abs(stride)) * 5.5

    # Grounded feet travel inward while the opposite foot lifts. This produces
    # readable alternating contact without exceeding the semantic foot-travel cap.
    left_foot_x = 28 * stride if stride >= 0 else 35 * right_lift
    right_foot_x = -35 * left_lift if stride >= 0 else -28 * stride
    left_ankle_x = 22 * stride if stride >= 0 else 27 * right_lift
    right_ankle_x = -27 * left_lift if stride >= 0 else -22 * stride
    left_knee_x = 15 * stride if stride >= 0 else 18 * right_lift
    right_knee_x = -18 * left_lift if stride >= 0 else -15 * stride

    return [
        (108,408, left_foot_x, -27*left_lift, 30),
        (126,376, left_ankle_x, -20*left_lift + compression*.3, 35),
        (145,330, left_knee_x, -12*left_lift + compression, 44),
        (278,408, right_foot_x, -27*right_lift, 30),
        (255,376, right_ankle_x, -20*right_lift + compression*.3, 35),
        (235,330, right_knee_x, -12*right_lift + compression, 44),
        (190,286, 8*stride, compression*.9, 58),
        (190,218, 12*stride, compression*.35 - 3*cadence, 72),
        (212,138, 10*stride, -2*cadence + compression*.15, 48),
        (150,180, -15*stride, 10*stride, 38),
        (164,210, -12*stride, 9*stride, 38),
        (264,235, 15*stride, -10*stride, 36),
        (245,205, 11*stride, -8*stride, 38),
        (228,102, -7*stride, -2.5*cadence, 31),
    ]


def main() -> None:
    source_image = Image.open(SOURCE).convert('RGBA')
    source = np.asarray(source_image)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for old in OUTPUT.glob('*.png'):
        if not old.name.startswith('_'):
            old.unlink()

    frames = [articulated_warp(source, controls_for_frame(i)) for i in range(FRAME_COUNT)]
    for index, frame in enumerate(frames):
        frame.save(OUTPUT / f'{index:02d}.png', optimize=True)

    preview = Image.new('RGBA', (source_image.width * FRAME_COUNT, source_image.height), (0,0,0,0))
    for index, frame in enumerate(frames):
        preview.alpha_composite(frame, (index * source_image.width, 0))
    preview.save(PREVIEW, optimize=True)
    print(f'KEN_ARTICULATED_WALK_READY frames={FRAME_COUNT} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
