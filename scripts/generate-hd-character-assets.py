#!/usr/bin/env python3
"""RC32 HD character remaster pipeline.

Goals:
- exact 2x dimensions / registration
- preserve pixel-art edge intent without the blockiness of nearest-only scaling
- avoid alpha fringe via premultiplied-alpha Lanczos
- process attack atlas frames independently to prevent frame-boundary bleed
- keep output small enough for lazy-loaded mobile HD use
"""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'public' / 'art'
PLAYABLE = ('ryu','ken','chunli','alex','dudley','makoto','ibuki','yun')
COMBAT_SIZE = (192, 224)
ATTACK_FRAME = (192, 224)
ATTACK_GRID = (5, 4)
REMASTER_VERSION = 'hybrid-scale2x-premul-v1'


def _approx_close(a: np.ndarray, b: np.ndarray, threshold: float = 26.0) -> np.ndarray:
    d = a.astype(np.int32) - b.astype(np.int32)
    dist2 = np.sum(d[..., :3] * d[..., :3], axis=2) + (d[..., 3] * d[..., 3]) * 0.5
    return dist2 < threshold * threshold


def scale2x_rgba(im: Image.Image) -> np.ndarray:
    src = np.array(im.convert('RGBA'), dtype=np.uint8)
    h, w, _ = src.shape
    p = np.pad(src.astype(np.int32), ((1, 1), (1, 1), (0, 0)), mode='edge')
    b = p[0:h, 1:w + 1]
    d = p[1:h + 1, 0:w]
    e = p[1:h + 1, 1:w + 1]
    f = p[1:h + 1, 2:w + 2]
    hpx = p[2:h + 2, 1:w + 1]

    db = _approx_close(d, b)
    dh = _approx_close(d, hpx)
    bf = _approx_close(b, f)
    hf = _approx_close(hpx, f)

    e0 = np.where((db & ~dh & ~bf)[..., None], d, e)
    e1 = np.where((bf & ~db & ~hf)[..., None], f, e)
    e2 = np.where((dh & ~db & ~hf)[..., None], d, e)
    e3 = np.where((hf & ~dh & ~bf)[..., None], f, e)

    out = np.empty((h * 2, w * 2, 4), dtype=np.uint8)
    out[0::2, 0::2] = np.clip(e0, 0, 255)
    out[0::2, 1::2] = np.clip(e1, 0, 255)
    out[1::2, 0::2] = np.clip(e2, 0, 255)
    out[1::2, 1::2] = np.clip(e3, 0, 255)
    return out


def premultiplied_lanczos_rgba(im: Image.Image) -> np.ndarray:
    src = np.array(im.convert('RGBA'), dtype=np.float32)
    alpha = src[..., 3] / 255.0
    premul = src[..., :3] * alpha[..., None]
    size = (im.width * 2, im.height * 2)
    premul2 = cv2.resize(premul, size, interpolation=cv2.INTER_LANCZOS4)
    alpha2 = np.clip(cv2.resize(alpha, size, interpolation=cv2.INTER_LANCZOS4), 0.0, 1.0)
    rgb2 = np.where(alpha2[..., None] > 1e-4, premul2 / np.maximum(alpha2[..., None], 1e-4), 0.0)
    return np.dstack([np.clip(rgb2, 0, 255).astype(np.uint8), (alpha2 * 255.0).astype(np.uint8)])


def remaster_frame(im: Image.Image) -> Image.Image:
    smooth = premultiplied_lanczos_rgba(im)
    crisp = scale2x_rgba(im)
    rgb = smooth[..., :3].astype(np.float32) * 0.55 + crisp[..., :3].astype(np.float32) * 0.45
    rgb8 = np.clip(rgb, 0, 255).astype(np.uint8)

    # restrained micro-contrast: sharpen edge transitions without ringing.
    blur = cv2.GaussianBlur(rgb8, (0, 0), 0.55)
    rgb8 = cv2.addWeighted(rgb8, 1.18, blur, -0.18, 0)

    alpha = smooth[..., 3]
    out = np.dstack([rgb8, alpha])
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def save_webp(im: Image.Image, dst: Path, quality: int, method: int = 4) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'WEBP', quality=quality, method=method, exact=True)


def remaster_combat(name: str) -> dict:
    src = ART / 'combat-sprites' / f'{name}.webp'
    dst = ART / 'combat-sprites-hd' / f'{name}.webp'
    im = Image.open(src).convert('RGBA')
    if im.size != COMBAT_SIZE:
        raise RuntimeError(f'{name} combat source size {im.size} != {COMBAT_SIZE}')
    out = remaster_frame(im)
    save_webp(out, dst, 99, 5)
    return metric_record(name, 'combat', src, dst, im, out)


def remaster_attack(name: str) -> dict:
    src = ART / 'attack-atlases' / f'{name}.webp'
    dst = ART / 'attack-atlases-hd' / f'{name}.webp'
    im = Image.open(src).convert('RGBA')
    expected = (ATTACK_FRAME[0] * ATTACK_GRID[0], ATTACK_FRAME[1] * ATTACK_GRID[1])
    if im.size != expected:
        raise RuntimeError(f'{name} attack source size {im.size} != {expected}')

    # Attack frames already contain denser painted detail than the neutral combat sprite.
    # A premultiplied-alpha Lanczos pass preserves that detail while avoiding dark fringe.
    up = premultiplied_lanczos_rgba(im)
    rgb = up[..., :3]
    blur = cv2.GaussianBlur(rgb, (0, 0), 0.48)
    rgb = cv2.addWeighted(rgb, 1.13, blur, -0.13, 0)
    canvas = Image.fromarray(np.dstack([rgb, up[..., 3]]).astype(np.uint8), 'RGBA')
    save_webp(canvas, dst, 96, 4)
    return metric_record(name, 'attack', src, dst, im, canvas)


def edge_score(im: Image.Image) -> float:
    sample = im.convert('RGBA')
    if max(sample.size) > 640:
        scale = 640 / max(sample.size)
        sample = sample.resize((max(1, round(sample.width * scale)), max(1, round(sample.height * scale))), Image.Resampling.LANCZOS)
    arr = np.array(sample, dtype=np.uint8)
    alpha = arr[..., 3] > 32
    if not np.any(alpha):
        return 0.0
    gray = cv2.cvtColor(arr[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
    lap = cv2.Laplacian(gray, cv2.CV_32F, ksize=3)
    return float(np.mean(np.abs(lap[alpha])))


def metric_record(name: str, kind: str, src: Path, dst: Path, source: Image.Image, output: Image.Image) -> dict:
    src_bytes = src.read_bytes()
    dst_bytes = dst.read_bytes()
    alpha = np.array(output.getchannel('A'), dtype=np.uint8)
    return {
        'character': name.upper(),
        'kind': kind,
        'source': str(src.relative_to(ROOT)).replace('\\', '/'),
        'output': str(dst.relative_to(ROOT)).replace('\\', '/'),
        'sourceSize': list(source.size),
        'outputSize': list(output.size),
        'bytes': len(dst_bytes),
        'sourceSha256': sha256(src_bytes).hexdigest().upper(),
        'outputSha256': sha256(dst_bytes).hexdigest().upper(),
        'edgeScore': round(edge_score(output), 3),
        'alphaCoverage': round(float(np.mean(alpha > 12)), 6),
        'softAlphaCoverage': round(float(np.mean((alpha > 12) & (alpha < 243))), 6),
    }


def main() -> None:
    records = []
    for name in PLAYABLE:
        records.append(remaster_combat(name))
        records.append(remaster_attack(name))
        print(name, records[-2]['bytes'], records[-1]['bytes'])
    manifest = {
        'version': REMASTER_VERSION,
        'scale': 2,
        'playableCharacters': len(PLAYABLE),
        'records': records,
        'totalBytes': sum(r['bytes'] for r in records),
    }
    out = ART / 'character-quality-manifest.json'
    out.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print('QUALITY_MANIFEST', out, manifest['totalBytes'])


if __name__ == '__main__':
    main()
