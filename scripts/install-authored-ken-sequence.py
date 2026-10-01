from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path
from PIL import Image, ImageDraw
import cv2
import hashlib
import json
import numpy as np
import re
import subprocess
import sys
from scipy import ndimage

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from pose_ecc_cache import PoseEccCache

ROOT = Path(__file__).resolve().parents[1]
FRAME_W, FRAME_H = 384, 448
EXPECTED = {
    'idle': 6,
    'walk': 12,
    'walk-back': 10,
    'dash': 7,
    'jump': 8,
    'landing': 6,
    'hit': 8,
    'guard': 5,
    'parry': 6,
    'stand-light': 7,
    'stand-heavy': 10,
    'hadoken': 12,
    'shoryuken': 12,
    'tatsumaki': 12,
    'super-rush': 16,
}
TARGET_HEIGHT = {
    'idle': 338, 'walk': 338, 'walk-back': 338, 'dash': 332,
    'jump': 316, 'landing': 336, 'hit': 338, 'guard': 338, 'parry': 338,
    'stand-light': 340, 'stand-heavy': 342, 'hadoken': 340,
    'shoryuken': 334, 'tatsumaki': 318, 'super-rush': 336,
}
GROUND_KINDS = {'idle','walk','walk-back','dash','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','super-rush'}
FULL_POSE_AVG_THRESHOLD = 0.008
FULL_POSE_MAX_THRESHOLD = 0.018
POSE_THRESHOLDS = {
    'idle': (0.003, 0.006),
}
MIN_SOURCE_BODY_HEIGHT = 240
POSE_ECC_CACHE = PoseEccCache(ROOT / 'RC39_POSE_ECC_CACHE.json')

# Idle is a restrained loop: enough authored pose change to feel alive, but not enough
# root/foot/body drift to read as walk, flinch or attack anticipation.
IDLE_SEMANTIC_LIMITS = {
    'loopIoUMin': 0.72,
    'centroidXRangeMax': 12.0,
    'centroidYRangeMax': 10.0,
    'centroidStepMax': 8.0,
    'areaCvMax': 0.075,
    'footCenterRangeMax': 14.0,
    'footWidthCvMax': 0.12,
    'residualAverageMax': 0.050,
    'residualMaxMax': 0.085,
}

# Walk must show a genuine alternating step cycle. These values are based on the
# authored Ryu 12F walk pilot, with wider tolerances for Ken's more aggressive gait.
WALK_SEMANTIC_LIMITS = {
    'loopIoUMin': 0.45,
    'oppositeContactIoUMin': 0.35,
    'oppositeContactIoUMax': 0.90,
    'centroidXRangeMin': 8.0,
    'centroidXRangeMax': 95.0,
    'centroidYRangeMin': 3.0,
    'centroidYRangeMax': 60.0,
    'centroidStepMax': 52.0,
    'areaCvMax': 0.16,
    'footCenterRangeMin': 28.0,
    'footCenterRangeMax': 145.0,
    'footWidthCvMin': 0.06,
    'footWidthCvMax': 0.95,
    'residualAverageMin': 0.008,
    'residualAverageMax': 0.13,
    'residualMaxMin': 0.018,
    'residualMaxMax': 0.18,
}


WALK_BACK_SEMANTIC_LIMITS = {
    'loopIoUMin': 0.42,
    'oppositeContactIoUMin': 0.35,
    'oppositeContactIoUMax': 0.90,
    'centroidXRangeMin': 6.0,
    'centroidXRangeMax': 90.0,
    'centroidYRangeMin': 3.0,
    'centroidYRangeMax': 58.0,
    'centroidStepMax': 52.0,
    'areaCvMax': 0.17,
    'footCenterRangeMin': 24.0,
    'footCenterRangeMax': 145.0,
    'footWidthCvMin': 0.05,
    'footWidthCvMax': 0.95,
    'residualAverageMin': 0.008,
    'residualAverageMax': 0.13,
    'residualMaxMin': 0.018,
    'residualMaxMax': 0.18,
}

# Hit reaction must show a real body recoil and recovery arc rather than a tilted/
# translated standing sprite. The last frame may return very close to neutral.
HIT_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.62,
    'peakRecoilIoUMin': 0.22,
    'peakRecoilIoUMax': 0.78,
    'centroidXRangeMin': 7.0,
    'centroidXRangeMax': 95.0,
    'centroidYRangeMin': 3.0,
    'centroidYRangeMax': 75.0,
    'centroidStepMax': 65.0,
    'areaCvMax': 0.20,
    'footCenterRangeMin': 12.0,
    'footCenterRangeMax': 145.0,
    'footWidthCvMax': 0.80,
    'residualAverageMin': 0.012,
    'residualAverageMax': 0.17,
    'residualMaxMin': 0.028,
    'residualMaxMax': 0.22,
}


# Guard is a compact rooted defensive reaction. It must show a real brace/contact
# silhouette but remain much smaller than the hit-reaction arc.
GUARD_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.68,
    'peakGuardIoUMin': 0.38,
    'peakGuardIoUMax': 0.88,
    'centroidXRangeMin': 3.0,
    'centroidXRangeMax': 45.0,
    'centroidYRangeMin': 2.0,
    'centroidYRangeMax': 35.0,
    'centroidStepMax': 34.0,
    'areaCvMax': 0.16,
    'footCenterRangeMax': 32.0,
    'footWidthCvMax': 0.35,
    'residualAverageMin': 0.006,
    'residualAverageMax': 0.11,
    'residualMaxMin': 0.014,
    'residualMaxMax': 0.16,
}

# Parry is faster and more open than guard, but still a planted defensive action.
PARRY_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.64,
    'peakParryIoUMin': 0.30,
    'peakParryIoUMax': 0.84,
    'centroidXRangeMin': 4.0,
    'centroidXRangeMax': 55.0,
    'centroidYRangeMin': 0.5,
    'centroidYRangeMax': 42.0,
    'centroidStepMax': 42.0,
    'areaCvMax': 0.18,
    'footCenterRangeMax': 38.0,
    'footWidthCvMax': 0.45,
    'residualAverageMin': 0.009,
    'residualAverageMax': 0.13,
    'residualMaxMin': 0.020,
    'residualMaxMax': 0.18,
}

# Standing attacks must show authored limb reach while keeping the grounded root stable.
# These gates reject the old whole-sprite translate/rotate staging strips.
STAND_LIGHT_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.58,
    'contactIoUMin': 0.32,
    'contactIoUMax': 0.94,
    'centroidXRangeMin': 4.0,
    'centroidXRangeMax': 45.0,
    'centroidYRangeMax': 28.0,
    'reachRangeMin': 24.0,
    'reachRangeMax': 105.0,
    'footCenterRangeMax': 38.0,
    'footWidthCvMax': 0.32,
    'areaCvMax': 0.16,
    'residualAverageMin': 0.010,
    'residualAverageMax': 0.15,
    'residualMaxMin': 0.022,
    'residualMaxMax': 0.20,
    'contactFrameIndex': 3,
}

STAND_HEAVY_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.50,
    'contactIoUMin': 0.22,
    'contactIoUMax': 0.75,
    'centroidXRangeMin': 7.0,
    'centroidXRangeMax': 62.0,
    'centroidYRangeMin': 0.75,
    'centroidYRangeMax': 42.0,
    'reachRangeMin': 38.0,
    'reachRangeMax': 145.0,
    'footCenterRangeMax': 58.0,
    'footWidthCvMax': 0.55,
    'areaCvMax': 0.20,
    'residualAverageMin': 0.014,
    'residualAverageMax': 0.18,
    'residualMaxMin': 0.030,
    'residualMaxMax': 0.24,
    'contactFrameIndex': 5,
}

# Projectile release is authored as character motion only. Projectile visuals remain
# runtime effects, so the body strip must show coil -> release -> recovery while the
# feet remain planted. This rejects whole-sprite forward translation.
HADOKEN_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.48,
    'releaseIoUMin': 0.22,
    'releaseIoUMax': 0.92,
    'centroidXRangeMin': 6.0,
    'centroidXRangeMax': 68.0,
    'centroidYRangeMax': 44.0,
    'reachRangeMin': 34.0,
    'reachRangeMax': 155.0,
    'releaseReachDeltaMin': 24.0,
    'footCenterRangeMax': 62.0,
    'footWidthCvMax': 0.58,
    'areaCvMax': 0.22,
    'residualAverageMin': 0.014,
    'residualAverageMax': 0.19,
    'residualMaxMin': 0.030,
    'residualMaxMax': 0.25,
    'releaseFrameIndex': 5,
}

# Rising uppercut must contain a real compression/launch/rise/apex/fall arc. Root
# translation alone is not sufficient because runtime jump height is separate from
# the image pose.
SHORYUKEN_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.42,
    'contactIoUMin': 0.18,
    'contactIoUMax': 0.76,
    'apexIoUMin': 0.16,
    'apexIoUMax': 0.70,
    'centroidXRangeMax': 82.0,
    'centroidYRangeMin': 28.0,
    'centroidYRangeMax': 145.0,
    'topRiseMin': 42.0,
    'topRiseMax': 165.0,
    'areaCvMax': 0.24,
    'footWidthCvMin': 0.06,
    'footWidthCvMax': 1.40,
    'residualAverageMin': 0.020,
    'residualAverageMax': 0.22,
    'residualMaxMin': 0.040,
    'residualMaxMax': 0.28,
    'contactFrameIndex': 4,
    'apexFrameIndex': 7,
}

# Tatsumaki must show genuine rotational kick phases rather than one standing sprite
# rotated/transformed as a whole. The silhouette should cycle through chamber, extension,
# cross-body spin and recovery while preserving readable body volume.
TATSUMAKI_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.36,
    'startEndIoUMax': 0.92,
    'quarterIoUMin': 0.18,
    'quarterIoUMax': 0.78,
    'oppositeIoUMin': 0.16,
    'oppositeIoUMax': 0.74,
    'centroidXRangeMin': 8.0,
    'centroidXRangeMax': 100.0,
    'centroidYRangeMin': 5.0,
    'centroidYRangeMax': 95.0,
    'extentWidthRangeMin': 38.0,
    'extentWidthRangeMax': 190.0,
    'areaCvMax': 0.24,
    'residualAverageMin': 0.022,
    'residualAverageMax': 0.22,
    'residualMaxMin': 0.045,
    'residualMaxMax': 0.30,
    'quarterFrameIndex': 3,
    'oppositeFrameIndex': 6,
}

# Super Rush is a chained grounded multi-hit sequence. It must contain several
# genuinely different contact silhouettes and recover toward neutral. Whole-body
# translation of one punch pose is rejected even if the contact timing matches.
SUPER_RUSH_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.40,
    'contactIoUMin': 0.16,
    'contactIoUMax': 0.84,
    'contactDiversityIoUMax': 0.82,
    'centroidXRangeMin': 10.0,
    'centroidXRangeMax': 110.0,
    'centroidYRangeMin': 2.0,
    'centroidYRangeMax': 80.0,
    'reachRangeMin': 42.0,
    'reachRangeMax': 190.0,
    'footCenterRangeMax': 105.0,
    'areaCvMax': 0.26,
    'residualAverageMin': 0.024,
    'residualAverageMax': 0.24,
    'residualMaxMin': 0.050,
    'residualMaxMax': 0.32,
    'contactFrameIndices': [3,5,7,9,11],
}

# Dash must read as an authored acceleration arc, not a mirrored transform that
# returns to the same neutral silhouette. Thresholds are calibrated against the
# authored Ryu 7F pilot, with room for Ken's more aggressive forward lean.
DASH_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.30,
    'startEndIoUMax': 0.88,
    'midpointIoUMin': 0.28,
    'midpointIoUMax': 0.82,
    'centroidXRangeMin': 10.0,
    'centroidXRangeMax': 75.0,
    'centroidYRangeMin': 10.0,
    'centroidYRangeMax': 75.0,
    'centroidStepMax': 58.0,
    'areaCvMax': 0.18,
    'residualAverageMin': 0.02,
    'residualAverageMax': 0.15,
    'residualMaxMin': 0.04,
    'residualMaxMax': 0.20,
}

# Jump root translation is intentionally normalized away. A valid authored jump
# therefore has to retain anticipation/rise/apex/fall differences in silhouette.
JUMP_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.35,
    'startEndIoUMax': 0.90,
    'apexIoUMin': 0.30,
    'apexIoUMax': 0.72,
    'centroidXRangeMax': 50.0,
    'centroidYRangeMin': 45.0,
    'centroidYRangeMax': 135.0,
    'centroidStepMax': 92.0,
    'areaCvMax': 0.18,
    'footWidthCvMin': 0.15,
    'footWidthCvMax': 1.20,
    'residualAverageMin': 0.03,
    'residualAverageMax': 0.18,
    'residualMaxMin': 0.05,
    'residualMaxMax': 0.22,
}

# Landing needs a visible contact/squash/rebound cycle and a final bridge toward
# neutral. Reversible vertical scaling of one still is explicitly rejected.
LANDING_SEMANTIC_LIMITS = {
    'startEndIoUMin': 0.30,
    'startEndIoUMax': 0.85,
    'squashIoUMin': 0.20,
    'squashIoUMax': 0.70,
    'centroidXRangeMax': 55.0,
    'centroidYRangeMin': 45.0,
    'centroidYRangeMax': 135.0,
    'centroidStepMax': 78.0,
    'areaCvMax': 0.16,
    'footWidthCvMin': 0.15,
    'footWidthCvMax': 0.95,
    'residualAverageMin': 0.03,
    'residualAverageMax': 0.18,
    'residualMaxMin': 0.05,
    'residualMaxMax': 0.22,
}


def alpha_bbox(im: Image.Image):
    return im.getchannel('A').getbbox()


def remove_dark_background(im: Image.Image) -> Image.Image:
    arr = np.asarray(im.convert('RGBA')).copy()
    rgb = arr[..., :3].astype(np.int16)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    mask = (lum > 31) | (sat > 18)
    # Remove connected presentation text/grid fragments by keeping body-sized components.
    labels, _ = ndimage.label(mask)
    components = []
    for i, sl in enumerate(ndimage.find_objects(labels), 1):
        if sl is None:
            continue
        ys, xs = sl
        area = int((labels[ys, xs] == i).sum())
        h = ys.stop - ys.start
        w = xs.stop - xs.start
        if area >= 300 and h >= 40 and w >= 18:
            components.append((area, h, w, i, sl))
    if not components:
        arr[..., 3] = 0
        return Image.fromarray(arr, 'RGBA')
    components.sort(reverse=True)
    # Prefer the largest tall component; attach nearby effect pieces only if close to it.
    _, _, _, main_i, main_sl = components[0]
    union = labels == main_i
    my, mx = main_sl
    mx0, mx1, my0, my1 = mx.start, mx.stop, my.start, my.stop
    for area, h, w, i, sl in components[1:]:
        ys, xs = sl
        close = not (xs.stop < mx0 - 40 or xs.start > mx1 + 90 or ys.stop < my0 - 55 or ys.start > my1 + 55)
        if close and area >= 180:
            union |= labels == i
    arr[..., 3] = np.where(union, 255, 0).astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')


def load_frames(source: Path, count: int, cols: int | None, rows: int | None, dark_bg: bool, crop: tuple[int,int,int,int] | None = None, indices: list[int] | None = None):
    if source.is_dir():
        files = sorted([
            p for p in source.iterdir()
            if p.suffix.lower() in {'.png','.webp','.jpg','.jpeg'} and not p.name.startswith('_')
        ])
        if len(files) != count:
            raise SystemExit(f'expected {count} frame files, got {len(files)}')
        frames = [Image.open(p).convert('RGBA') for p in files]
    else:
        if not cols or not rows:
            raise SystemExit('--cols and --rows are required for a sheet source')
        if cols * rows < count:
            raise SystemExit('grid has fewer cells than expected frames')
        sheet = Image.open(source).convert('RGBA')
        if crop is not None:
            x, y, w, h = crop
            if w <= 0 or h <= 0:
                raise SystemExit('--crop width/height must be positive')
            if x < 0 or y < 0 or x + w > sheet.width or y + h > sheet.height:
                raise SystemExit(f'--crop {crop} is outside source {sheet.size}')
            sheet = sheet.crop((x, y, x + w, y + h))
        cw = sheet.width / cols
        ch = sheet.height / rows
        frames = []
        source_indices = indices if indices is not None else list(range(count))
        if len(source_indices) != count:
            raise SystemExit(f'expected {count} selected indices, got {len(source_indices)}')
        if any(i < 0 or i >= cols * rows for i in source_indices):
            raise SystemExit(f'--indices must be 1..{cols*rows} (or 0-based internally)')
        for i in source_indices:
            r, c = divmod(i, cols)
            box = (round(c*cw), round(r*ch), round((c+1)*cw), round((r+1)*ch))
            frames.append(sheet.crop(box))
    if dark_bg:
        frames = [remove_dark_background(frame) for frame in frames]
    return frames


def normalize_frames(kind: str, frames: list[Image.Image], min_source_body_height: int = MIN_SOURCE_BODY_HEIGHT, allow_opaque_source: bool = False):
    bboxes = []
    for i, frame in enumerate(frames):
        alpha_extrema = frame.getchannel('A').getextrema()
        if not allow_opaque_source and alpha_extrema == (255, 255):
            raise SystemExit(
                f'{kind} frame {i+1}: opaque source background detected. '
                'Provide transparent authored frames, or use a supported background-extraction mode before ingest.'
            )
        bbox = alpha_bbox(frame)
        if not bbox:
            raise SystemExit(f'{kind} frame {i+1}: empty alpha')
        bboxes.append(bbox)
    source_heights = [b[3] - b[1] for b in bboxes]
    min_h = min(source_heights)
    if min_h < min_source_body_height:
        raise SystemExit(
            f'{kind}: source body resolution too low ({min_h}px < {min_source_body_height}px). '
            'Use the dedicated HQ per-motion sheet, not the overview/reference infographic.'
        )

    target_h = TARGET_HEIGHT[kind]
    median_h = float(np.median(source_heights))
    scale = target_h / median_h
    center_x = FRAME_W // 2
    baseline = 423
    normalized = []
    metrics = []
    for i, (frame, bbox) in enumerate(zip(frames, bboxes)):
        crop = frame.crop(bbox)
        sw = max(1, round(crop.width * scale))
        sh = max(1, round(crop.height * scale))
        if sw > FRAME_W - 10:
            fit = (FRAME_W - 10) / sw
            sw, sh = round(sw * fit), round(sh * fit)
        crop = crop.resize((sw, sh), Image.Resampling.LANCZOS)
        dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
        x = round(center_x - sw / 2)
        if kind in GROUND_KINDS:
            y = baseline - sh
        else:
            # preserve pose differences while removing root-translation from source layout
            y = round(220 - sh / 2)
        dest.alpha_composite(crop, (x, y))
        normalized.append(dest)
        metrics.append({'frame': i+1, 'sourceBBox': list(bbox), 'sourceBodyHeight': source_heights[i], 'paste':[x,y], 'scaledSize':[sw,sh]})
    return normalized, metrics


def affine_residual(reference: np.ndarray, candidate: np.ndarray) -> float:
    warp = np.eye(2, 3, dtype=np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
    try:
        cv2.findTransformECC(reference, candidate, warp, cv2.MOTION_AFFINE, criteria)
        aligned = cv2.warpAffine(candidate, warp, (FRAME_W, FRAME_H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    except cv2.error:
        aligned = candidate
    return float(np.mean(np.abs(aligned - reference)))


def pose_qa(frames: list[Image.Image], kind: str | None = None):
    masks = [np.asarray(frame.getchannel('A'), dtype=np.float32) / 255.0 for frame in frames]
    avg_threshold, max_threshold = POSE_THRESHOLDS.get(kind or '', (FULL_POSE_AVG_THRESHOLD, FULL_POSE_MAX_THRESHOLD))
    cached = POSE_ECC_CACHE.get(masks, avg_threshold, max_threshold)
    if cached is not None:
        return cached

    residuals = [affine_residual(masks[0], mask) for mask in masks[1:]]
    avg = float(np.mean(residuals)) if residuals else 0.0
    maximum = float(np.max(residuals)) if residuals else 0.0
    result = {
        'affineResidualAverage': round(avg, 6),
        'affineResidualMax': round(maximum, 6),
        'fullPoseAverageThreshold': avg_threshold,
        'fullPoseMaxThreshold': max_threshold,
        'poseAuthoredPass': avg >= avg_threshold and maximum >= max_threshold,
    }
    POSE_ECC_CACHE.put(masks, avg_threshold, max_threshold, result, label=kind or 'unknown')
    return result


def _binary_mask(frame: Image.Image) -> np.ndarray:
    return np.asarray(frame.getchannel('A'), dtype=np.uint8) >= 32


def _mask_centroid(mask: np.ndarray) -> tuple[float, float]:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return (0.0, 0.0)
    return (float(xs.mean()), float(ys.mean()))


def _iou(a: np.ndarray, b: np.ndarray) -> float:
    union = np.logical_or(a, b).sum()
    if union == 0:
        return 0.0
    return float(np.logical_and(a, b).sum() / union)


def _foot_metrics(mask: np.ndarray) -> tuple[float, float]:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return (0.0, 0.0)
    bottom = int(ys.max())
    # Read only the grounded silhouette band, not trouser sway higher in the body.
    band = mask[max(0, bottom - 13):bottom + 1]
    by, bx = np.nonzero(band)
    if len(bx) == 0:
        return (0.0, 0.0)
    return (float(bx.mean()), float(bx.max() - bx.min() + 1))


def _x_extent(mask: np.ndarray) -> tuple[float, float]:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return (0.0, 0.0)
    return (float(xs.min()), float(xs.max()))


def _standing_attack_semantic_qa(frames: list[Image.Image], pose: dict | None, kind: str, limits: dict):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    extents = [_x_extent(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot]); foot_w = np.asarray([f[1] for f in foot])
    reach = np.asarray([x1 for _, x1 in extents])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    contact = min(len(masks)-1, int(limits['contactFrameIndex']))
    values = {
        'startEndIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'contactIoU': _iou(masks[0], masks[contact]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'reachRange': float(np.ptp(reach)) if len(reach) else 0.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std()/foot_w_mean) if foot_w_mean else 1.0,
        'areaCv': float(areas.std()/area_mean) if area_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks = {
        'recoveryTowardNeutral': values['startEndIoU'] >= limits['startEndIoUMin'],
        'contactPoseDistinct': limits['contactIoUMin'] <= values['contactIoU'] <= limits['contactIoUMax'],
        'bodyDrivePresent': limits['centroidXRangeMin'] <= values['centroidXRange'] <= limits['centroidXRangeMax'],
        'verticalRootStable': values['centroidYRange'] <= limits['centroidYRangeMax'],
        'attackReachPresent': limits['reachRangeMin'] <= values['reachRange'] <= limits['reachRangeMax'],
        'feetStayPlanted': values['footCenterRange'] <= limits['footCenterRangeMax'],
        'stanceWidthStable': values['footWidthCv'] <= limits['footWidthCvMax'],
        'bodyVolumeStable': values['areaCv'] <= limits['areaCvMax'],
        'authoredMotionAverage': limits['residualAverageMin'] <= values['residualAverage'] <= limits['residualAverageMax'],
        'authoredMotionPeak': limits['residualMaxMin'] <= values['residualMax'] <= limits['residualMaxMax'],
    }
    if 'centroidYRangeMin' in limits:
        checks['bodyTorquePresent'] = values['centroidYRange'] >= limits['centroidYRangeMin']
    return {'kind':kind,'limits':limits,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def stand_light_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    return _standing_attack_semantic_qa(frames, pose, 'stand-light', STAND_LIGHT_SEMANTIC_LIMITS)


def stand_heavy_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    return _standing_attack_semantic_qa(frames, pose, 'stand-heavy', STAND_HEAVY_SEMANTIC_LIMITS)


def hadoken_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks=[_binary_mask(frame) for frame in frames]
    centroids=[_mask_centroid(mask) for mask in masks]
    areas=np.asarray([float(mask.sum()) for mask in masks],dtype=np.float64)
    foot=[_foot_metrics(mask) for mask in masks]
    extents=[_x_extent(mask) for mask in masks]
    cx=np.asarray([c[0] for c in centroids]); cy=np.asarray([c[1] for c in centroids])
    foot_x=np.asarray([f[0] for f in foot]); foot_w=np.asarray([f[1] for f in foot])
    reach=np.asarray([x1 for _,x1 in extents])
    area_mean=float(areas.mean()) if len(areas) else 0.0
    foot_w_mean=float(foot_w.mean()) if len(foot_w) else 0.0
    L=HADOKEN_SEMANTIC_LIMITS; release=min(len(masks)-1,int(L['releaseFrameIndex']))
    pre=float(max(reach[:max(1,release-1)])) if len(reach) else 0.0
    values={
        'startEndIoU':_iou(masks[0],masks[-1]) if masks else 0.0,
        'releaseIoU':_iou(masks[0],masks[release]) if masks else 0.0,
        'centroidXRange':float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange':float(np.ptp(cy)) if len(cy) else 0.0,
        'reachRange':float(np.ptp(reach)) if len(reach) else 0.0,
        'releaseReachDelta':float(reach[release]-pre) if len(reach) else 0.0,
        'footCenterRange':float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv':float(foot_w.std()/foot_w_mean) if foot_w_mean else 1.0,
        'areaCv':float(areas.std()/area_mean) if area_mean else 1.0,
        'residualAverage':float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax':float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks={
        'recoveryTowardNeutral':values['startEndIoU']>=L['startEndIoUMin'],
        'releasePoseDistinct':L['releaseIoUMin']<=values['releaseIoU']<=L['releaseIoUMax'],
        'bodyDrivePresent':L['centroidXRangeMin']<=values['centroidXRange']<=L['centroidXRangeMax'],
        'verticalRootStable':values['centroidYRange']<=L['centroidYRangeMax'],
        'handExtensionPresent':L['reachRangeMin']<=values['reachRange']<=L['reachRangeMax'],
        'releaseExtendsPastGather':values['releaseReachDelta']>=L['releaseReachDeltaMin'],
        'feetStayPlanted':values['footCenterRange']<=L['footCenterRangeMax'],
        'stanceWidthStable':values['footWidthCv']<=L['footWidthCvMax'],
        'bodyVolumeStable':values['areaCv']<=L['areaCvMax'],
        'authoredMotionAverage':L['residualAverageMin']<=values['residualAverage']<=L['residualAverageMax'],
        'authoredMotionPeak':L['residualMaxMin']<=values['residualMax']<=L['residualMaxMax'],
    }
    return {'kind':'hadoken','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def shoryuken_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks=[_binary_mask(frame) for frame in frames]
    centroids=[_mask_centroid(mask) for mask in masks]
    areas=np.asarray([float(mask.sum()) for mask in masks],dtype=np.float64)
    foot=[_foot_metrics(mask) for mask in masks]
    cx=np.asarray([c[0] for c in centroids]); cy=np.asarray([c[1] for c in centroids])
    foot_w=np.asarray([f[1] for f in foot])
    tops=[]
    for mask in masks:
        ys,_=np.nonzero(mask); tops.append(float(ys.min()) if len(ys) else float(FRAME_H))
    tops=np.asarray(tops)
    area_mean=float(areas.mean()) if len(areas) else 0.0
    foot_w_mean=float(foot_w.mean()) if len(foot_w) else 0.0
    L=SHORYUKEN_SEMANTIC_LIMITS
    contact=min(len(masks)-1,int(L['contactFrameIndex'])); apex=min(len(masks)-1,int(L['apexFrameIndex']))
    values={
        'startEndIoU':_iou(masks[0],masks[-1]) if masks else 0.0,
        'contactIoU':_iou(masks[0],masks[contact]) if masks else 0.0,
        'apexIoU':_iou(masks[0],masks[apex]) if masks else 0.0,
        'centroidXRange':float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange':float(np.ptp(cy)) if len(cy) else 0.0,
        'topRise':float(tops[0]-tops.min()) if len(tops) else 0.0,
        'areaCv':float(areas.std()/area_mean) if area_mean else 1.0,
        'footWidthCv':float(foot_w.std()/foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage':float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax':float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks={
        'recoveryTowardNeutral':values['startEndIoU']>=L['startEndIoUMin'],
        'contactPoseDistinct':L['contactIoUMin']<=values['contactIoU']<=L['contactIoUMax'],
        'apexPoseDistinct':L['apexIoUMin']<=values['apexIoU']<=L['apexIoUMax'],
        'horizontalRootControlled':values['centroidXRange']<=L['centroidXRangeMax'],
        'verticalArcPresent':L['centroidYRangeMin']<=values['centroidYRange']<=L['centroidYRangeMax'],
        'risingSilhouettePresent':L['topRiseMin']<=values['topRise']<=L['topRiseMax'],
        'bodyVolumeStable':values['areaCv']<=L['areaCvMax'],
        'legPhaseChanges':L['footWidthCvMin']<=values['footWidthCv']<=L['footWidthCvMax'],
        'authoredMotionAverage':L['residualAverageMin']<=values['residualAverage']<=L['residualAverageMax'],
        'authoredMotionPeak':L['residualMaxMin']<=values['residualMax']<=L['residualMaxMax'],
    }
    return {'kind':'shoryuken','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}

def tatsumaki_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks=[_binary_mask(frame) for frame in frames]
    centroids=[_mask_centroid(mask) for mask in masks]
    areas=np.asarray([float(mask.sum()) for mask in masks],dtype=np.float64)
    extents=[_x_extent(mask) for mask in masks]
    cx=np.asarray([c[0] for c in centroids]); cy=np.asarray([c[1] for c in centroids])
    widths=np.asarray([x1-x0 for x0,x1 in extents],dtype=np.float64)
    area_mean=float(areas.mean()) if len(areas) else 0.0
    L=TATSUMAKI_SEMANTIC_LIMITS
    q=min(len(masks)-1,int(L['quarterFrameIndex'])); opp=min(len(masks)-1,int(L['oppositeFrameIndex']))
    values={
        'startEndIoU':_iou(masks[0],masks[-1]) if masks else 0.0,
        'quarterIoU':_iou(masks[0],masks[q]) if masks else 0.0,
        'oppositeIoU':_iou(masks[0],masks[opp]) if masks else 0.0,
        'centroidXRange':float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange':float(np.ptp(cy)) if len(cy) else 0.0,
        'extentWidthRange':float(np.ptp(widths)) if len(widths) else 0.0,
        'areaCv':float(areas.std()/area_mean) if area_mean else 1.0,
        'residualAverage':float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax':float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks={
        'recoveryTowardNeutral':L['startEndIoUMin']<=values['startEndIoU']<=L['startEndIoUMax'],
        'quarterTurnDistinct':L['quarterIoUMin']<=values['quarterIoU']<=L['quarterIoUMax'],
        'oppositeTurnDistinct':L['oppositeIoUMin']<=values['oppositeIoU']<=L['oppositeIoUMax'],
        'spinTravelsHorizontally':L['centroidXRangeMin']<=values['centroidXRange']<=L['centroidXRangeMax'],
        'spinChangesLevel':L['centroidYRangeMin']<=values['centroidYRange']<=L['centroidYRangeMax'],
        'kickExtensionChanges':L['extentWidthRangeMin']<=values['extentWidthRange']<=L['extentWidthRangeMax'],
        'bodyVolumeStable':values['areaCv']<=L['areaCvMax'],
        'authoredMotionAverage':L['residualAverageMin']<=values['residualAverage']<=L['residualAverageMax'],
        'authoredMotionPeak':L['residualMaxMin']<=values['residualMax']<=L['residualMaxMax'],
    }
    return {'kind':'tatsumaki','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def super_rush_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks=[_binary_mask(frame) for frame in frames]
    centroids=[_mask_centroid(mask) for mask in masks]
    areas=np.asarray([float(mask.sum()) for mask in masks],dtype=np.float64)
    extents=[_x_extent(mask) for mask in masks]
    foot=[_foot_metrics(mask) for mask in masks]
    cx=np.asarray([c[0] for c in centroids]); cy=np.asarray([c[1] for c in centroids])
    reach=np.asarray([x1 for _,x1 in extents],dtype=np.float64)
    foot_x=np.asarray([f[0] for f in foot],dtype=np.float64)
    area_mean=float(areas.mean()) if len(areas) else 0.0
    L=SUPER_RUSH_SEMANTIC_LIMITS
    contacts=[min(len(masks)-1,int(i)) for i in L['contactFrameIndices']]
    contact_ious=[_iou(masks[0],masks[i]) for i in contacts]
    diversity=[]
    for a,b in zip(contacts,contacts[1:]): diversity.append(_iou(masks[a],masks[b]))
    values={
        'startEndIoU':_iou(masks[0],masks[-1]) if masks else 0.0,
        'contactIoUMinObserved':float(min(contact_ious)) if contact_ious else 0.0,
        'contactIoUMaxObserved':float(max(contact_ious)) if contact_ious else 0.0,
        'contactDiversityIoUMin':float(min(diversity)) if diversity else 1.0,
        'centroidXRange':float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange':float(np.ptp(cy)) if len(cy) else 0.0,
        'reachRange':float(np.ptp(reach)) if len(reach) else 0.0,
        'footCenterRange':float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'areaCv':float(areas.std()/area_mean) if area_mean else 1.0,
        'residualAverage':float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax':float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks={
        'recoveryTowardNeutral':values['startEndIoU']>=L['startEndIoUMin'],
        'allContactsDistinctFromBase':all(L['contactIoUMin']<=v<=L['contactIoUMax'] for v in contact_ious),
        'contactChainHasVariety':values['contactDiversityIoUMin']<=L['contactDiversityIoUMax'],
        'forwardRushPresent':L['centroidXRangeMin']<=values['centroidXRange']<=L['centroidXRangeMax'],
        'bodyLevelsChange':L['centroidYRangeMin']<=values['centroidYRange']<=L['centroidYRangeMax'],
        'multiHitReachPresent':L['reachRangeMin']<=values['reachRange']<=L['reachRangeMax'],
        'groundTravelControlled':values['footCenterRange']<=L['footCenterRangeMax'],
        'bodyVolumeStable':values['areaCv']<=L['areaCvMax'],
        'authoredMotionAverage':L['residualAverageMin']<=values['residualAverage']<=L['residualAverageMax'],
        'authoredMotionPeak':L['residualMaxMin']<=values['residualMax']<=L['residualMaxMax'],
    }
    return {'kind':'super-rush','limits':L,**{k:round(v,6) for k,v in values.items()},'contactIoUs':[round(v,6) for v in contact_ious],'contactPairIoUs':[round(v,6) for v in diversity],'checks':checks,'semanticQaPass':all(checks.values())}


def idle_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids])
    cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot])
    foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    residual_avg = float((pose or {}).get('affineResidualAverage', 0.0))
    residual_max = float((pose or {}).get('affineResidualMax', 0.0))
    values = {
        'loopIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': residual_avg,
        'residualMax': residual_max,
    }
    checks = {
        'loopClosure': values['loopIoU'] >= IDLE_SEMANTIC_LIMITS['loopIoUMin'],
        'rootXStable': values['centroidXRange'] <= IDLE_SEMANTIC_LIMITS['centroidXRangeMax'],
        'rootYStable': values['centroidYRange'] <= IDLE_SEMANTIC_LIMITS['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= IDLE_SEMANTIC_LIMITS['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= IDLE_SEMANTIC_LIMITS['areaCvMax'],
        'feetPlanted': values['footCenterRange'] <= IDLE_SEMANTIC_LIMITS['footCenterRangeMax'],
        'stanceWidthStable': values['footWidthCv'] <= IDLE_SEMANTIC_LIMITS['footWidthCvMax'],
        'motionRestrainedAverage': values['residualAverage'] <= IDLE_SEMANTIC_LIMITS['residualAverageMax'],
        'motionRestrainedPeak': values['residualMax'] <= IDLE_SEMANTIC_LIMITS['residualMaxMax'],
    }
    return {
        'kind': 'idle',
        'limits': IDLE_SEMANTIC_LIMITS,
        **{k: round(v, 6) for k, v in values.items()},
        'checks': checks,
        'semanticQaPass': all(checks.values()),
    }


def walk_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids])
    cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot])
    foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    opposite_index = 6 if len(masks) >= 7 else max(0, len(masks) // 2)
    values = {
        'loopIoU': _iou(masks[-1], masks[0]) if masks else 0.0,
        'oppositeContactIoU': _iou(masks[0], masks[opposite_index]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = WALK_SEMANTIC_LIMITS
    checks = {
        'loopClosure': values['loopIoU'] >= L['loopIoUMin'],
        'oppositeContactDifferent': L['oppositeContactIoUMin'] <= values['oppositeContactIoU'] <= L['oppositeContactIoUMax'],
        'rootTravelPresent': L['centroidXRangeMin'] <= values['centroidXRange'] <= L['centroidXRangeMax'],
        'verticalCadencePresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'footTravelPresent': L['footCenterRangeMin'] <= values['footCenterRange'] <= L['footCenterRangeMax'],
        'stanceChanges': L['footWidthCvMin'] <= values['footWidthCv'] <= L['footWidthCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {
        'kind': 'walk',
        'limits': L,
        **{k: round(v, 6) for k, v in values.items()},
        'checks': checks,
        'semanticQaPass': all(checks.values()),
    }


def walk_back_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot]); foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    opposite_index = 5 if len(masks) >= 6 else max(0, len(masks) // 2)
    values = {
        'loopIoU': _iou(masks[-1], masks[0]) if masks else 0.0,
        'oppositeContactIoU': _iou(masks[0], masks[opposite_index]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = WALK_BACK_SEMANTIC_LIMITS
    checks = {
        'loopClosure': values['loopIoU'] >= L['loopIoUMin'],
        'oppositeContactDifferent': L['oppositeContactIoUMin'] <= values['oppositeContactIoU'] <= L['oppositeContactIoUMax'],
        'retreatShapeTravelPresent': L['centroidXRangeMin'] <= values['centroidXRange'] <= L['centroidXRangeMax'],
        'verticalCadencePresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'footTravelPresent': L['footCenterRangeMin'] <= values['footCenterRange'] <= L['footCenterRangeMax'],
        'stanceChanges': L['footWidthCvMin'] <= values['footWidthCv'] <= L['footWidthCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {'kind':'walk-back','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def hit_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot]); foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    peak = min(len(masks)-1, 3)
    values = {
        'startEndIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'peakRecoilIoU': _iou(masks[0], masks[peak]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = HIT_SEMANTIC_LIMITS
    checks = {
        'recoveryReturnsNearNeutral': values['startEndIoU'] >= L['startEndIoUMin'],
        'peakRecoilDistinct': L['peakRecoilIoUMin'] <= values['peakRecoilIoU'] <= L['peakRecoilIoUMax'],
        'recoilTravelPresent': L['centroidXRangeMin'] <= values['centroidXRange'] <= L['centroidXRangeMax'],
        'compressionPresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'footSlideReadable': L['footCenterRangeMin'] <= values['footCenterRange'] <= L['footCenterRangeMax'],
        'stanceNotExploded': values['footWidthCv'] <= L['footWidthCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {'kind':'hit','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def _defense_semantic_common(frames: list[Image.Image], pose: dict | None, kind: str, limits: dict, peak_index: int, peak_key: str):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_x = np.asarray([f[0] for f in foot]); foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    peak = min(max(0, peak_index), max(0, len(masks)-1))
    values = {
        'startEndIoU': _iou(masks[-1], masks[0]) if masks else 0.0,
        peak_key: _iou(masks[0], masks[peak]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std()/area_mean) if area_mean else 1.0,
        'footCenterRange': float(np.ptp(foot_x)) if len(foot_x) else 0.0,
        'footWidthCv': float(foot_w.std()/foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage',0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax',0.0)),
    }
    checks = {
        'returnTowardNeutral': values['startEndIoU'] >= limits['startEndIoUMin'],
        'peakPoseDifferent': limits[peak_key+'Min'] <= values[peak_key] <= limits[peak_key+'Max'],
        'rootMotionPresent': limits['centroidXRangeMin'] <= values['centroidXRange'] <= limits['centroidXRangeMax'],
        'verticalResponsePresent': limits['centroidYRangeMin'] <= values['centroidYRange'] <= limits['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= limits['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= limits['areaCvMax'],
        'feetStayPlanted': values['footCenterRange'] <= limits['footCenterRangeMax'],
        'stanceWidthStable': values['footWidthCv'] <= limits['footWidthCvMax'],
        'authoredMotionAverage': limits['residualAverageMin'] <= values['residualAverage'] <= limits['residualAverageMax'],
        'authoredMotionPeak': limits['residualMaxMin'] <= values['residualMax'] <= limits['residualMaxMax'],
    }
    return {'kind':kind,'limits':limits,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def guard_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    return _defense_semantic_common(frames, pose, 'guard', GUARD_SEMANTIC_LIMITS, 2, 'peakGuardIoU')


def parry_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    return _defense_semantic_common(frames, pose, 'parry', PARRY_SEMANTIC_LIMITS, 2, 'peakParryIoU')


def dash_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    cx = np.asarray([c[0] for c in centroids])
    cy = np.asarray([c[1] for c in centroids])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    midpoint = min(len(masks)-1, len(masks)//2)
    area_mean = float(areas.mean()) if len(areas) else 0.0
    values = {
        'startEndIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'midpointIoU': _iou(masks[0], masks[midpoint]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = DASH_SEMANTIC_LIMITS
    checks = {
        'recoveryNotDuplicate': L['startEndIoUMin'] <= values['startEndIoU'] <= L['startEndIoUMax'],
        'drivePoseDistinct': L['midpointIoUMin'] <= values['midpointIoU'] <= L['midpointIoUMax'],
        'forwardLeanPresent': L['centroidXRangeMin'] <= values['centroidXRange'] <= L['centroidXRangeMax'],
        'verticalDrivePresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {'kind':'dash','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def jump_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    apex = min(len(masks)-1, 4)
    values = {
        'startEndIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'apexIoU': _iou(masks[0], masks[apex]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = JUMP_SEMANTIC_LIMITS
    checks = {
        'contactBridgeNotDuplicate': L['startEndIoUMin'] <= values['startEndIoU'] <= L['startEndIoUMax'],
        'apexPoseDistinct': L['apexIoUMin'] <= values['apexIoU'] <= L['apexIoUMax'],
        'horizontalShapeStable': values['centroidXRange'] <= L['centroidXRangeMax'],
        'verticalPhasePresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'aerialLegShapeChanges': L['footWidthCvMin'] <= values['footWidthCv'] <= L['footWidthCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {'kind':'jump','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def landing_semantic_qa(frames: list[Image.Image], pose: dict | None = None):
    masks = [_binary_mask(frame) for frame in frames]
    centroids = [_mask_centroid(mask) for mask in masks]
    areas = np.asarray([float(mask.sum()) for mask in masks], dtype=np.float64)
    foot = [_foot_metrics(mask) for mask in masks]
    cx = np.asarray([c[0] for c in centroids]); cy = np.asarray([c[1] for c in centroids])
    foot_w = np.asarray([f[1] for f in foot])
    steps = np.hypot(np.diff(cx), np.diff(cy)) if len(cx) > 1 else np.asarray([0.0])
    area_mean = float(areas.mean()) if len(areas) else 0.0
    foot_w_mean = float(foot_w.mean()) if len(foot_w) else 0.0
    squash = min(len(masks)-1, 2)
    values = {
        'startEndIoU': _iou(masks[0], masks[-1]) if masks else 0.0,
        'squashIoU': _iou(masks[0], masks[squash]) if masks else 0.0,
        'centroidXRange': float(np.ptp(cx)) if len(cx) else 0.0,
        'centroidYRange': float(np.ptp(cy)) if len(cy) else 0.0,
        'centroidStepMax': float(steps.max()) if len(steps) else 0.0,
        'areaCv': float(areas.std() / area_mean) if area_mean else 1.0,
        'footWidthCv': float(foot_w.std() / foot_w_mean) if foot_w_mean else 1.0,
        'residualAverage': float((pose or {}).get('affineResidualAverage', 0.0)),
        'residualMax': float((pose or {}).get('affineResidualMax', 0.0)),
    }
    L = LANDING_SEMANTIC_LIMITS
    checks = {
        'neutralBridgeNotDuplicate': L['startEndIoUMin'] <= values['startEndIoU'] <= L['startEndIoUMax'],
        'squashPoseDistinct': L['squashIoUMin'] <= values['squashIoU'] <= L['squashIoUMax'],
        'horizontalRootStable': values['centroidXRange'] <= L['centroidXRangeMax'],
        'compressionPresent': L['centroidYRangeMin'] <= values['centroidYRange'] <= L['centroidYRangeMax'],
        'noFrameJump': values['centroidStepMax'] <= L['centroidStepMax'],
        'bodyVolumeStable': values['areaCv'] <= L['areaCvMax'],
        'stanceAbsorbsImpact': L['footWidthCvMin'] <= values['footWidthCv'] <= L['footWidthCvMax'],
        'authoredMotionAverage': L['residualAverageMin'] <= values['residualAverage'] <= L['residualAverageMax'],
        'authoredMotionPeak': L['residualMaxMin'] <= values['residualMax'] <= L['residualMaxMax'],
    }
    return {'kind':'landing','limits':L,**{k:round(v,6) for k,v in values.items()},'checks':checks,'semanticQaPass':all(checks.values())}


def semantic_qa(kind: str, frames: list[Image.Image], pose: dict):
    if kind == 'idle':
        return idle_semantic_qa(frames, pose)
    if kind == 'walk':
        return walk_semantic_qa(frames, pose)
    if kind == 'walk-back':
        return walk_back_semantic_qa(frames, pose)
    if kind == 'hit':
        return hit_semantic_qa(frames, pose)
    if kind == 'guard':
        return guard_semantic_qa(frames, pose)
    if kind == 'parry':
        return parry_semantic_qa(frames, pose)
    if kind == 'stand-light':
        return stand_light_semantic_qa(frames, pose)
    if kind == 'stand-heavy':
        return stand_heavy_semantic_qa(frames, pose)
    if kind == 'hadoken':
        return hadoken_semantic_qa(frames, pose)
    if kind == 'shoryuken':
        return shoryuken_semantic_qa(frames, pose)
    if kind == 'tatsumaki':
        return tatsumaki_semantic_qa(frames, pose)
    if kind == 'super-rush':
        return super_rush_semantic_qa(frames, pose)
    if kind == 'dash':
        return dash_semantic_qa(frames, pose)
    if kind == 'jump':
        return jump_semantic_qa(frames, pose)
    if kind == 'landing':
        return landing_semantic_qa(frames, pose)
    return {'kind': kind, 'semanticQaPass': True, 'checks': {'notRequired': True}}


def make_strip(frames: list[Image.Image]):
    strip = Image.new('RGBA', (FRAME_W * len(frames), FRAME_H), (0,0,0,0))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (i * FRAME_W, 0))
    return strip


def make_preview(kind: str, frames: list[Image.Image], out: Path):
    cols = min(4, len(frames))
    rows = (len(frames) + cols - 1) // cols
    preview = Image.new('RGBA', (FRAME_W * cols, FRAME_H * rows), (20,22,28,255))
    draw = ImageDraw.Draw(preview)
    for i, frame in enumerate(frames):
        x = (i % cols) * FRAME_W
        y = (i // cols) * FRAME_H
        preview.alpha_composite(frame, (x,y))
        draw.rectangle((x,y,x+FRAME_W-1,y+FRAME_H-1), outline=(85,100,130,255), width=1)
        draw.text((x+10,y+10), f'{kind} {i+1:02d}', fill=(255,255,255,255))
    preview.save(out)


def patch_registry(kind: str):
    path = ROOT / 'src/render/AnimationSequenceLibrary.ts'
    lines = path.read_text(encoding='utf-8').splitlines()
    matches = [i for i, line in enumerate(lines) if "characterId:'KEN'" in line and f"kind:'{kind}'" in line]
    if len(matches) != 1:
        raise SystemExit(f'could not uniquely locate KEN {kind} registry line')
    i = matches[0]
    line = lines[i]
    line = re.sub(r"enabled:(?:true|false)", "enabled:true", line, count=1)
    line = re.sub(r"poseAuthored:(?:true|false)", "poseAuthored:true", line, count=1)
    line = re.sub(r"source:'[^']+'", "source:'authored-hq'", line, count=1)
    lines[i] = line
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def update_manifest(kind: str, strip_path: Path, qa: dict, semantic: dict, source: Path, metrics: list[dict]):
    manifest_path = ROOT / 'public/art/animation-hq/ken/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['pipeline'] = 'rc39-ken-authored-gated-v4'
    data = strip_path.read_bytes()
    record = next((r for r in manifest['records'] if r['id'] == kind), None)
    if record is None:
        raise SystemExit(f'missing manifest record: {kind}')
    record.update({
        'frames': EXPECTED[kind],
        'frameSize': [FRAME_W, FRAME_H],
        'stripSize': [FRAME_W * EXPECTED[kind], FRAME_H],
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest().upper(),
        'enabled': True,
        'renderMode': 'full',
        'poseAuthored': True,
        'stagingOnly': False,
        'authoredSource': str(source),
        'poseQa': qa,
        'semanticQa': semantic,
    })
    manifest['enabledFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r.get('enabled'))
    manifest['fullFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r.get('enabled') and r.get('renderMode') == 'full')
    manifest['bridgeFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r.get('enabled') and r.get('renderMode') == 'bridge')
    manifest['stagingFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r.get('stagingOnly'))
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

    qa_path = ROOT / f'RC39_KEN_{kind.upper().replace("-","_")}_AUTHORED_QA.json'
    qa_path.write_text(json.dumps({'character':'KEN','sequence':kind,'source':str(source),'metrics':metrics,'poseQa':qa,'semanticQa':semantic}, indent=2), encoding='utf-8')


def main():
    parser = ArgumentParser(description='Install a genuinely pose-authored Ken sequence after source-resolution and affine-residual QA.')
    parser.add_argument('kind', choices=sorted(EXPECTED))
    parser.add_argument('source', type=Path)
    parser.add_argument('--cols', type=int)
    parser.add_argument('--rows', type=int)
    parser.add_argument('--dark-background', action='store_true')
    parser.add_argument('--crop', help='Optional sheet ROI as x,y,width,height before grid splitting.')
    parser.add_argument('--indices', help='Optional 1-based comma-separated grid cells to select/reorder. Must match target frame count.')
    parser.add_argument('--min-source-body-height', type=int, default=MIN_SOURCE_BODY_HEIGHT, help='Override source-resolution gate for diagnostics only; production default is 240.')
    parser.add_argument('--allow-opaque-source', action='store_true', help='Diagnostics only. Production authored sources should have transparent alpha or use background extraction.')
    parser.add_argument('--preview-only', action='store_true', help='Run extraction/QA without touching runtime assets.')
    parser.add_argument('--skip-verify', action='store_true', help='Skip transactional npm run verify:ken-pipeline after installation.')
    args = parser.parse_args()

    kind = args.kind
    crop = None
    if args.crop:
        try:
            values = tuple(int(v.strip()) for v in args.crop.split(','))
        except ValueError:
            raise SystemExit('--crop must be x,y,width,height')
        if len(values) != 4:
            raise SystemExit('--crop must be x,y,width,height')
        crop = values
    indices = None
    if args.indices:
        try:
            indices = [int(v.strip()) - 1 for v in args.indices.split(',') if v.strip()]
        except ValueError:
            raise SystemExit('--indices must be comma-separated integers')
    frames = load_frames(args.source, EXPECTED[kind], args.cols, args.rows, args.dark_background, crop=crop, indices=indices)
    frames, metrics = normalize_frames(
        kind,
        frames,
        min_source_body_height=args.min_source_body_height,
        allow_opaque_source=args.allow_opaque_source,
    )
    qa = pose_qa(frames, kind)
    semantic = semantic_qa(kind, frames, qa)

    preview_path = ROOT / f'RC39_KEN_{kind.upper().replace("-","_")}_AUTHORED_PREVIEW.png'
    make_preview(kind, frames, preview_path)

    candidate_dir = ROOT / 'art-source/ken/authored-candidates'
    candidate_dir.mkdir(parents=True, exist_ok=True)
    candidate = candidate_dir / f'{kind}.webp'
    make_strip(frames).save(candidate, 'WEBP', lossless=True, quality=100, method=4)

    if not qa['poseAuthoredPass']:
        report = {'installed':False,'character':'KEN','sequence':kind,'reason':'pose-variance-gate','preview':str(preview_path),'candidate':str(candidate),'poseQa':qa,'semanticQa':semantic}
        print(json.dumps(report, indent=2))
        raise SystemExit(2)

    if not semantic['semanticQaPass']:
        report = {'installed':False,'character':'KEN','sequence':kind,'reason':'motion-semantic-gate','preview':str(preview_path),'candidate':str(candidate),'poseQa':qa,'semanticQa':semantic}
        print(json.dumps(report, indent=2))
        raise SystemExit(2)

    if args.preview_only:
        print(json.dumps({'installed':False,'previewOnly':True,'character':'KEN','sequence':kind,'preview':str(preview_path),'candidate':str(candidate),'poseQa':qa,'semanticQa':semantic}, indent=2))
        return

    runtime = ROOT / f'public/art/animation-hq/ken/{kind}.webp'
    manifest_path = ROOT / 'public/art/animation-hq/ken/manifest.json'
    registry_path = ROOT / 'src/render/AnimationSequenceLibrary.ts'
    previous_runtime = runtime.read_bytes() if runtime.exists() else None
    previous_manifest = manifest_path.read_text(encoding='utf-8')
    previous_registry = registry_path.read_text(encoding='utf-8')
    try:
        runtime.write_bytes(candidate.read_bytes())
        update_manifest(kind, runtime, qa, semantic, args.source, metrics)
        patch_registry(kind)
        verify_result = None
        if not args.skip_verify:
            proc = subprocess.run(
                ['npm','run','verify:ken-pipeline'],
                cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
            )
            verify_result = {'command':'npm run verify:ken-pipeline','returnCode':proc.returncode,'tail':proc.stdout[-5000:]}
            if proc.returncode != 0:
                raise RuntimeError('Ken pipeline verification failed after install')
    except Exception as exc:
        if previous_runtime is None:
            runtime.unlink(missing_ok=True)
        else:
            runtime.write_bytes(previous_runtime)
        manifest_path.write_text(previous_manifest, encoding='utf-8')
        registry_path.write_text(previous_registry, encoding='utf-8')
        subprocess.run(
            ['python3','scripts/measure-animation-pose-variance.py','--character','KEN','--strict-missing'],
            cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        report = {'installed':False,'rolledBack':True,'character':'KEN','sequence':kind,'reason':'post-install-verification-failed','error':str(exc)}
        print(json.dumps(report, indent=2))
        raise SystemExit(3)
    result = {'installed':True,'rolledBack':False,'character':'KEN','sequence':kind,'runtime':str(runtime),'preview':str(preview_path),'poseQa':qa,'semanticQa':semantic,'verified':not args.skip_verify}
    if verify_result is not None:
        result['verify'] = verify_result
    (ROOT / 'RC39_KEN_LAST_INSTALL.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
