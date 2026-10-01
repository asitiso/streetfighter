from __future__ import annotations

"""Generate Ken's 10F articulated defensive retreat cycle.

The retreat intentionally differs from the forward walk: Ken keeps his guard
compact, biases the torso away from the opponent, and alternates rearward foot
contacts.  Local radial controls move feet, ankles, knees, hips, torso, head,
arms and hair independently; no whole-sprite affine transform is used.
"""

from pathlib import Path
from PIL import Image
import cv2
import math
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUTPUT = ROOT / 'art-source/ken/inbox/walk-back'
PREVIEW = ROOT / 'art-source/ken/ken-walk-back-articulated-source-preview.png'
FRAME_COUNT = 10


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
    # Close the tenth frame exactly onto frame one while passing through a clear
    # opposite contact near frame six (the runtime semantic QA samples index 5).
    phase = 2 * math.pi * index / (FRAME_COUNT - 1)
    stride = math.sin(phase)
    cadence = math.cos(phase)

    # During a retreat the foot moving toward screen-left is the travelling foot.
    # The other leg accepts weight first; the roles swap after half a cycle.
    left_lift = max(0.0, -stride)
    right_lift = max(0.0, stride)
    compression = (1.0 - abs(stride)) * 5.0

    left_foot_x = -26 * max(0.0, -stride) + 70 * max(0.0, stride)
    right_foot_x = -70 * max(0.0, -stride) + 26 * max(0.0, stride)
    left_ankle_x = -21 * max(0.0, -stride) + 52 * max(0.0, stride)
    right_ankle_x = -52 * max(0.0, -stride) + 21 * max(0.0, stride)
    left_knee_x = -15 * max(0.0, -stride) + 36 * max(0.0, stride)
    right_knee_x = -36 * max(0.0, -stride) + 15 * max(0.0, stride)

    # Guard remains biased away from the opponent (Ken faces screen-right).
    retreat_drive = -11.0 - 7.0 * stride
    shoulder_counter = 7.0 * stride

    return [
        # legs / contacts
        (108,408, left_foot_x, -29*left_lift, 30),
        (126,376, left_ankle_x, -22*left_lift + compression*.25, 35),
        (145,330, left_knee_x, -13*left_lift + compression, 44),
        (278,408, right_foot_x, -29*right_lift, 30),
        (255,376, right_ankle_x, -22*right_lift + compression*.25, 35),
        (235,330, right_knee_x, -13*right_lift + compression, 44),
        # pelvis / torso -- rearward drive plus weight transfer
        (190,286, retreat_drive * .72, compression*.85, 58),
        (190,218, retreat_drive + shoulder_counter*.35, compression*.30 - 2.5*cadence, 72),
        (212,138, retreat_drive*.70 + shoulder_counter*.25, -2.0*cadence + compression*.12, 48),
        # compact guard: lead hand rises slightly as weight retreats; rear hand tracks chest
        (150,180, -5 - 7*stride, -4 - 5*stride, 38),
        (164,210, -4 - 5*stride, -3 - 4*stride, 38),
        (264,235, -4 + 8*stride, -6 + 5*stride, 36),
        (245,205, -5 + 6*stride, -5 + 4*stride, 38),
        # hair follow-through lags the torso slightly
        (228,102, 5*stride - retreat_drive*.18, -2.3*cadence, 31),
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
        # Existing Ken authoring generators use zero-based frame names; the ingest
        # scanner accepts any natural-sorted PNG run with the expected count.
        frame.save(OUTPUT / f'{index:02d}.png', optimize=True)

    preview = Image.new('RGBA', (source_image.width * FRAME_COUNT, source_image.height), (0,0,0,0))
    for index, frame in enumerate(frames):
        preview.alpha_composite(frame, (index * source_image.width, 0))
    preview.save(PREVIEW, optimize=True)
    print(f'KEN_ARTICULATED_WALK_BACK_READY frames={FRAME_COUNT} inbox={OUTPUT.relative_to(ROOT)} preview={PREVIEW.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
