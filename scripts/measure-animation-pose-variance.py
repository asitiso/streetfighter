from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path
from PIL import Image
import cv2
import json
import sys
import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from pose_ecc_cache import PoseEccCache

ROOT = Path(__file__).resolve().parents[1]
FRAME_W, FRAME_H = 384, 448
FULL_POSE_AVG_THRESHOLD = 0.008
FULL_POSE_MAX_THRESHOLD = 0.018
POSE_ECC_CACHE = PoseEccCache(ROOT / 'RC39_POSE_ECC_CACHE.json')
POSE_THRESHOLDS = {
    ('KEN', 'idle'): (0.003, 0.006),
}

TARGETS = {
    'RYU': {
        'stand-light': 7,
        'stand-heavy': 10,
        'hadoken': 12,
        'shoryuken': 12,
    },
    'KEN': {
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
    },
}


def alpha_frame(strip: Image.Image, index: int) -> np.ndarray:
    frame = strip.crop((index * FRAME_W, 0, (index + 1) * FRAME_W, FRAME_H))
    return np.asarray(frame.getchannel('A'), dtype=np.float32) / 255.0


def affine_residual(reference: np.ndarray, candidate: np.ndarray) -> float:
    warp = np.eye(2, 3, dtype=np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5)
    try:
        cv2.findTransformECC(reference, candidate, warp, cv2.MOTION_AFFINE, criteria)
        aligned = cv2.warpAffine(
            candidate,
            warp,
            (FRAME_W, FRAME_H),
            flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=0,
        )
    except cv2.error:
        aligned = candidate
    return float(np.mean(np.abs(aligned - reference)))


def measure(character: str, output: Path, strict_missing: bool = False) -> dict:
    character = character.upper()
    if character not in TARGETS:
        raise SystemExit(f'unsupported character: {character}')
    anim = ROOT / 'public/art/animation-hq' / character.lower()
    records = []
    for name, count in TARGETS[character].items():
        path = anim / f'{name}.webp'
        if not path.exists() or path.stat().st_size == 0:
            if strict_missing:
                raise SystemExit(f'{character} {name}: missing strip {path}')
            records.append({
                'sequence': name,
                'frames': count,
                'missing': True,
                'affineResidualAverage': 0.0,
                'affineResidualMax': 0.0,
                'fullPoseAverageThreshold': FULL_POSE_AVG_THRESHOLD,
                'fullPoseMaxThreshold': FULL_POSE_MAX_THRESHOLD,
                'poseAuthoredPass': False,
                'requiredRuntimeMode': 'disabled',
            })
            continue

        strip = Image.open(path).convert('RGBA')
        if strip.size != (FRAME_W * count, FRAME_H):
            raise SystemExit(f'{character} {name}: invalid strip size {strip.size}')
        masks = [alpha_frame(strip, i) for i in range(count)]
        avg_threshold, max_threshold = POSE_THRESHOLDS.get((character, name), (FULL_POSE_AVG_THRESHOLD, FULL_POSE_MAX_THRESHOLD))
        cached = POSE_ECC_CACHE.get(masks, avg_threshold, max_threshold)
        if cached is None:
            ref = masks[0]
            residuals = [affine_residual(ref, mask) for mask in masks[1:]]
            avg = float(np.mean(residuals)) if residuals else 0.0
            maximum = float(np.max(residuals)) if residuals else 0.0
            cached = {
                'affineResidualAverage': round(avg, 6),
                'affineResidualMax': round(maximum, 6),
                'fullPoseAverageThreshold': avg_threshold,
                'fullPoseMaxThreshold': max_threshold,
                'poseAuthoredPass': avg >= avg_threshold and maximum >= max_threshold,
            }
            POSE_ECC_CACHE.put(masks, avg_threshold, max_threshold, cached, label=f'{character}:{name}')
        pose_authored_pass = bool(cached['poseAuthoredPass'])
        records.append({
            'sequence': name,
            'frames': count,
            'missing': False,
            'affineResidualAverage': cached['affineResidualAverage'],
            'affineResidualMax': cached['affineResidualMax'],
            'fullPoseAverageThreshold': cached['fullPoseAverageThreshold'],
            'fullPoseMaxThreshold': cached['fullPoseMaxThreshold'],
            'poseAuthoredPass': pose_authored_pass,
            'requiredRuntimeMode': 'full' if pose_authored_pass else 'bridge',
        })

    result = {
        'candidate': '0.0.63-rc.38',
        'character': character,
        'method': 'alpha-mask affine alignment residual',
        'purpose': ('reject whole-sprite transform-only attack strips from full-contact HQ animation' if character == 'RYU' else 'reject whole-sprite transform-only Ken strips from authored HQ runtime animation'),
        'records': records,
        'allFullPosePass': all(r['poseAuthoredPass'] for r in records),
        'bridgeRequiredCount': sum(not r['poseAuthoredPass'] for r in records),
        'missingCount': sum(bool(r.get('missing')) for r in records),
    }
    output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('--character', default='RYU', choices=sorted(TARGETS))
    parser.add_argument('--output', default=None)
    parser.add_argument('--strict-missing', action='store_true')
    args = parser.parse_args()
    char = args.character.upper()
    default_name = 'RC36_RYU_POSE_VARIANCE.json' if char == 'RYU' else 'RC39_KEN_POSE_VARIANCE.json'
    out = Path(args.output) if args.output else ROOT / default_name
    result = measure(char, out, strict_missing=args.strict_missing)
    print(json.dumps(result, indent=2))
