from __future__ import annotations

from pathlib import Path
from PIL import Image
import importlib.util
import json
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))
from pose_ecc_cache import PoseEccCache

FRAME_W, FRAME_H = 384, 448
CACHE = PoseEccCache(ROOT / 'RC39_POSE_ECC_CACHE.json')


def masks_for(character: str, kind: str, count: int) -> list[np.ndarray]:
    path = ROOT / f'public/art/animation-hq/{character.lower()}/{kind}.webp'
    strip = Image.open(path).convert('RGBA')
    if strip.size != (FRAME_W * count, FRAME_H):
        raise SystemExit(f'{character} {kind}: unexpected strip size {strip.size}')
    return [
        np.asarray(strip.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H)).getchannel('A'), dtype=np.float32) / 255.0
        for i in range(count)
    ]


def seed_result(character: str, kind: str, count: int, result: dict, provenance: str) -> None:
    masks = masks_for(character, kind, count)
    CACHE.put(
        masks,
        float(result['fullPoseAverageThreshold']),
        float(result['fullPoseMaxThreshold']),
        {
            'affineResidualAverage': float(result['affineResidualAverage']),
            'affineResidualMax': float(result['affineResidualMax']),
            'fullPoseAverageThreshold': float(result['fullPoseAverageThreshold']),
            'fullPoseMaxThreshold': float(result['fullPoseMaxThreshold']),
            'poseAuthoredPass': bool(result['poseAuthoredPass']),
        },
        label=f'{character}:{kind}',
        provenance=provenance,
    )


ken_report = json.loads((ROOT / 'RC39_KEN_POSE_VARIANCE.json').read_text(encoding='utf-8'))
for rec in ken_report['records']:
    if rec.get('missing'):
        continue
    seed_result('KEN', rec['sequence'], int(rec['frames']), rec, 'seed:RC39_KEN_POSE_VARIANCE.json')

# The current package already contains the previously completed known-good Ryu walk
# and locomotion evidence. Seed those immutable reference strips so Ken pipeline QA
# does not spend minutes recomputing ECC for unchanged control assets.
walk = json.loads((ROOT / 'RC36_AUTHORED_RYU_WALK_VARIANCE.json').read_text(encoding='utf-8'))
seed_result('RYU', 'walk', 12, {
    'affineResidualAverage': walk['avg'],
    'affineResidualMax': walk['max'],
    'fullPoseAverageThreshold': 0.008,
    'fullPoseMaxThreshold': 0.018,
    'poseAuthoredPass': bool(walk['avg'] >= 0.008 and walk['max'] >= 0.018),
}, 'seed:RC36_AUTHORED_RYU_WALK_VARIANCE.json')

locomotion = json.loads((ROOT / 'RC39_KEN_LOCOMOTION_SEMANTIC_QA.json').read_text(encoding='utf-8'))
for case in locomotion['cases']:
    kind = case['sequence']
    count = {'dash': 7, 'jump': 8, 'landing': 6}[kind]
    seed_result('RYU', kind, count, case['ryuPose'], 'seed:RC39_KEN_LOCOMOTION_SEMANTIC_QA.json')

print('POSE_ECC_CACHE_SEEDED', json.dumps(CACHE.stats(), ensure_ascii=False))
