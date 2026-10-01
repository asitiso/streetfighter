from __future__ import annotations

from pathlib import Path
from PIL import Image
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUT = ROOT / 'public/art/animation-hq/ken'
OUT.mkdir(parents=True, exist_ok=True)

BASE = Image.open(SRC).convert('RGBA')
W, H = BASE.size
if (W, H) != (384, 448):
    raise SystemExit(f'KEN HQ source must remain 384x448, got {(W, H)}')

ATTACKS = {
    'stand-light': 7,
    'stand-heavy': 10,
    'hadoken': 12,
    'shoryuken': 12,
    'tatsumaki': 12,
    'super-rush': 16,
}


def rgba_bbox(im: Image.Image):
    return im.getchannel('A').getbbox() or (0, 0, W, H)


BASE_BBOX = rgba_bbox(BASE)
CENTER_X = (BASE_BBOX[0] + BASE_BBOX[2]) / 2
FEET_Y = BASE_BBOX[3]


def transformed(*, scale_x=1.0, scale_y=1.0, rotate=0.0, tx=0.0, ty=0.0, shear=0.0):
    # These are staging/reference transforms only. They intentionally do not count as authored poses.
    pad = 120
    canvas = Image.new('RGBA', (W + pad * 2, H + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(BASE, (pad, pad))

    rw = max(1, round(canvas.width * scale_x))
    rh = max(1, round(canvas.height * scale_y))
    scaled = canvas.resize((rw, rh), Image.Resampling.LANCZOS)

    if abs(shear) > 1e-6:
        sx = math.tan(shear)
        extra = abs(int(sx * rh)) + 12
        coeff = (1, sx, -min(0, int(sx * rh)), 0, 1, 0)
        scaled = scaled.transform((rw + extra, rh), Image.Transform.AFFINE, coeff, resample=Image.Resampling.BICUBIC)

    rotated = scaled.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)
    rb = rgba_bbox(rotated)
    rcx = (rb[0] + rb[2]) / 2
    rfy = rb[3]

    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x = round(CENTER_X + tx - rcx)
    y = round(FEET_Y + ty - rfy)
    out.alpha_composite(rotated, (x, y))
    return out


def params(kind: str, i: int, n: int):
    p = i / max(1, n - 1)
    if kind == 'stand-light':
        drive = math.sin(math.pi * min(1, p / .68))
        recover = math.sin(math.pi * max(0, (p - .55) / .45)) if p > .55 else 0
        return dict(scale_x=1 + .052 * drive, scale_y=1 - .020 * drive,
                    rotate=-3.6 * drive + 1.1 * recover, tx=8.5 * drive - 1.4 * recover,
                    ty=-1.8 * drive, shear=-.016 * drive)
    if kind == 'stand-heavy':
        wind = math.sin(math.pi * min(1, p / .30)) if p < .30 else 0
        drive = math.sin(math.pi * min(1, max(0, (p - .16) / .66)))
        return dict(scale_x=1 + .084 * drive - .020 * wind, scale_y=1 - .032 * drive + .010 * wind,
                    rotate=-6.3 * drive + 2.8 * wind, tx=13.0 * drive - 4.0 * wind,
                    ty=-3.0 * drive + 1.2 * wind, shear=-.027 * drive)
    if kind == 'hadoken':
        gather = math.sin(math.pi * min(1, p / .42)) if p < .42 else 0
        release = math.sin(math.pi * min(1, max(0, (p - .28) / .54)))
        return dict(scale_x=1 + .070 * release - .028 * gather, scale_y=1 - .020 * release + .012 * gather,
                    rotate=-5.0 * release + 2.6 * gather, tx=11.0 * release - 4.0 * gather,
                    ty=-1.5 * release + 1.4 * gather, shear=-.022 * release)
    if kind == 'shoryuken':
        compression = math.sin(math.pi * min(1, p / .26)) if p < .26 else 0
        rise = math.sin(math.pi * min(1, max(0, (p - .10) / .68)))
        return dict(scale_x=1 - .050 * rise + .060 * compression, scale_y=1 + .085 * rise - .075 * compression,
                    rotate=-10.0 * rise + 2.8 * compression, tx=7.0 * rise,
                    ty=-17.0 * rise + 5.5 * compression, shear=-.020 * rise)
    if kind == 'tatsumaki':
        start = math.sin(math.pi * min(1, p / .22)) if p < .22 else 0
        spin = math.sin(math.pi * min(1, max(0, (p - .08) / .82)))
        phase = 2 * math.pi * p * 2.0
        return dict(scale_x=1 + .055 * spin, scale_y=1 - .025 * spin,
                    rotate=11.0 * math.sin(phase) * spin - 3.0 * start,
                    tx=10.0 * spin + 3.5 * math.sin(phase), ty=-5.5 * spin,
                    shear=.028 * math.sin(phase) * spin)
    if kind == 'super-rush':
        # Alternating forward drive phases approximate the intended cadence but remain affine-only staging art.
        pulse = abs(math.sin(math.pi * p * 3.0))
        drive = math.sin(math.pi * min(1, p / .86))
        return dict(scale_x=1 + .090 * pulse, scale_y=1 - .032 * pulse,
                    rotate=-6.0 * pulse + 1.6 * math.sin(p * math.pi * 6),
                    tx=15.0 * drive + 5.0 * pulse, ty=-2.8 * pulse,
                    shear=-.028 * pulse)
    return {}


def write_strip(kind: str, count: int):
    frames = [transformed(**params(kind, i, count)) for i in range(count)]
    strip = Image.new('RGBA', (W * count, H), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        strip.alpha_composite(frame, (i * W, 0))
    out = OUT / f'{kind}.webp'
    strip.save(out, 'WEBP', lossless=True, quality=100, method=3)
    data = out.read_bytes()
    return {
        'id': kind,
        'frames': count,
        'frameSize': [W, H],
        'stripSize': [W * count, H],
        'bytes': len(data),
        'sha256': hashlib.sha256(data).hexdigest().upper(),
        'enabled': False,
        'renderMode': 'full',
        'poseAuthored': False,
        'stagingOnly': True,
        'stagingMethod': 'whole-sprite-affine-reference',
    }


new_records = {name: write_strip(name, count) for name, count in ATTACKS.items()}
manifest_path = OUT / 'manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
records_by_id = {record['id']: record for record in manifest.get('records', [])}
records_by_id.update(new_records)
order = ['idle', 'walk', 'walk-back', 'dash', 'jump', 'landing', 'hit',
         'stand-light', 'stand-heavy', 'hadoken', 'shoryuken', 'tatsumaki', 'super-rush']
records = [records_by_id[name] for name in order]

manifest.update({
    'pipeline': 'rc39-ken-authored-gated-v1',
    'frameTotal': sum(record['frames'] for record in records),
    'enabledFrameTotal': sum(record['frames'] for record in records if record.get('enabled')),
    'fullFrameTotal': sum(record['frames'] for record in records if record.get('enabled') and record.get('renderMode') == 'full'),
    'bridgeFrameTotal': sum(record['frames'] for record in records if record.get('enabled') and record.get('renderMode') == 'bridge'),
    'stagingFrameTotal': sum(record['frames'] for record in records if record.get('stagingOnly')),
    'records': records,
})
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

print(json.dumps({
    'character': 'KEN',
    'frameTotal': manifest['frameTotal'],
    'stagingFrameTotal': manifest['stagingFrameTotal'],
    'enabledFrameTotal': manifest['enabledFrameTotal'],
    'attackRecords': list(new_records),
}, indent=2))
