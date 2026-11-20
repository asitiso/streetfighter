#!/usr/bin/env python3
"""Build belt-scroll grunt pose atlases and the pickup atlas from the authored v1 sheets.

Source: art-source/grunts-v1/<type>-sheet.jpg — one generated sheet per grunt, 7 poses in a row on flat magenta
(idle, walk, windup, strike, hit, down, grabbed), plus pickups-sheet.jpg (apple, chicken, coins, pipe, knife, sword, bottle).
Output: public/art/grunts-v1/<type>.webp (7 cells of 384x448, HD 2x of the 192x224 combat sprite cell, feet on the
shared baseline y=423 like the playable HD sprites), pickups.webp (7 cells of 320x160) and manifest.json.
Deterministic: same sources -> same bytes.  Run: python3 scripts/build-grunt-sprites-v1.py [--check]
"""
import json, sys, hashlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art-source' / 'grunts-v1'
OUT = ROOT / 'public' / 'art' / 'grunts-v1'
GRUNTS = ['punk', 'knife', 'bruiser', 'kicker', 'soldier', 'thrower']
POSES = ['idle', 'walk', 'windup', 'strike', 'hit', 'down', 'grabbed']
PICKUPS = ['apple', 'chicken', 'coins', 'pipe', 'knife', 'sword', 'bottle']
CELL_W, CELL_H, BASELINE = 384, 448, 423
STAND_HEIGHT = {'punk': 338, 'knife': 330, 'bruiser': 352, 'kicker': 322, 'soldier': 340, 'thrower': 330}
ITEM_CELL = (320, 160)
ITEM_SCALE = 1.18


def key_mask(rgb: np.ndarray) -> np.ndarray:
    """Soft alpha from distance to the sheet's magenta key colour (median of the border)."""
    border = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3), rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    dist = np.sqrt(((rgb.astype(np.float32) - key) ** 2).sum(axis=2))
    alpha = np.clip((dist - 58.0) / (118.0 - 58.0), 0, 1)
    return alpha, key


def despill(rgb: np.ndarray, alpha: np.ndarray, key: np.ndarray) -> np.ndarray:
    """Remove the magenta fringe on partially keyed edge pixels."""
    out = rgb.astype(np.float32)
    edge = (alpha > 0) & (alpha < 1)
    excess = np.minimum(out[..., 0], out[..., 2]) - out[..., 1]
    spill = edge & (excess > 30)
    out[spill, 0] = np.minimum(out[spill, 0], out[spill, 1] + 30)
    out[spill, 2] = np.minimum(out[spill, 2], out[spill, 1] + 30)
    return np.clip(out, 0, 255).astype(np.uint8)


def segments(alpha: np.ndarray, expected: int):
    solid = ndimage.binary_opening(alpha > .5, iterations=1)
    labels, n = ndimage.label(solid)
    objs = ndimage.find_objects(labels)
    areas = ndimage.sum(solid, labels, range(1, n + 1))
    comps = [(i + 1, objs[i], areas[i]) for i in range(n) if areas[i] > 120]
    big = sorted([c for c in comps if c[2] > 2500], key=lambda c: c[1][1].start)
    boxes = [[c[1][0].start, c[1][0].stop, c[1][1].start, c[1][1].stop, [c[0]]] for c in big]
    # Split merged neighbours (e.g. the lying pose touching the next pose) at the emptiest column.
    while len(boxes) < expected:
        widths = [b[3] - b[2] for b in boxes]
        i = int(np.argmax(widths))
        y0, y1, x0, x1, ids = boxes[i]
        region = np.isin(labels[y0:y1, x0:x1], ids)
        cols = region.sum(axis=0).astype(np.float32)
        lo, hi = int(len(cols) * .25), int(len(cols) * .75)
        cut = x0 + lo + int(np.argmin(cols[lo:hi]))
        boxes[i:i + 1] = [[y0, y1, x0, cut, ids, 'split'], [y0, y1, cut, x1, ids, 'split']]
        boxes = [b[:5] + (b[5:] or []) for b in boxes]
    if len(boxes) != expected:
        raise SystemExit(f'expected {expected} poses, found {len(boxes)}')
    # Attach small detached parts (bottle, knife tips) to the nearest pose box.
    for cid, sl, area in comps:
        if area > 2500: continue
        cx = (sl[1].start + sl[1].stop) / 2
        j = int(np.argmin([abs(cx - (b[2] + b[3]) / 2) for b in boxes]))
        b = boxes[j]
        if cid not in b[4] and len(b) == 5:
            b[0], b[1], b[2], b[3] = min(b[0], sl[0].start), max(b[1], sl[0].stop), min(b[2], sl[1].start), max(b[3], sl[1].stop)
            b[4].append(cid)
    return labels, boxes


def cut(rgba: np.ndarray, labels, box, pad=2):
    y0, y1, x0, x1, ids = box[:5]
    y0, x0 = max(0, y0 - pad), max(0, x0 - pad)
    y1, x1 = min(rgba.shape[0], y1 + pad), min(rgba.shape[1], x1 + pad)
    piece = rgba[y0:y1, x0:x1].copy()
    if len(box) == 5:
        near = ndimage.binary_dilation(np.isin(labels[y0:y1, x0:x1], ids), iterations=3)
        piece[..., 3] = np.where(near, piece[..., 3], 0)
    return keep_main_body(piece)


def keep_main_body(piece: np.ndarray, reach: int = 18) -> np.ndarray:
    """Drop fragments of neighbouring poses: keep the largest blob plus parts within `reach` px of it (held props)."""
    solid = piece[..., 3] > 60
    labels, n = ndimage.label(solid)
    if n <= 1: return piece
    areas = ndimage.sum(solid, labels, range(1, n + 1))
    main = labels == (int(np.argmax(areas)) + 1)
    zone = ndimage.binary_dilation(main, iterations=reach)
    keep_ids = {i + 1 for i in range(n) if areas[i] > 0 and (zone & (labels == i + 1)).any()}
    keep = ndimage.binary_dilation(np.isin(labels, list(keep_ids)), iterations=2)
    out = piece.copy(); out[..., 3] = np.where(keep, out[..., 3], 0)
    return out


def build_grunt(name: str):
    im = Image.open(SRC / f'{name}-sheet.jpg').convert('RGB')
    rgb = np.asarray(im)
    alpha, key = key_mask(rgb)
    rgba = np.dstack([despill(rgb, alpha, key), (alpha * 255).astype(np.uint8)])
    labels, boxes = segments(alpha, len(POSES))
    pieces = [cut(rgba, labels, b) for b in boxes]
    standing = [p.shape[0] for i, p in enumerate(pieces) if POSES[i] in ('idle', 'walk', 'hit')]
    scale = STAND_HEIGHT[name] / float(np.median(standing))
    atlas = Image.new('RGBA', (CELL_W * len(POSES), CELL_H), (0, 0, 0, 0))
    meta = []
    for i, piece in enumerate(pieces):
        img = Image.fromarray(piece, 'RGBA')
        w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
        if w > CELL_W - 8:  # keep wide poses (lying, kicks) inside the cell
            f = (CELL_W - 8) / w; w, h = CELL_W - 8, max(1, round(h * f))
        img = img.resize((w, h), Image.LANCZOS)
        a = np.asarray(img)[..., 3]
        rows = np.where(a.max(axis=1) > 40)[0]
        bottom = int(rows[-1]) if len(rows) else h - 1
        feet = a[max(0, bottom - int(h * .12)):bottom + 1]
        cols = np.where(feet.max(axis=0) > 40)[0]
        anchor = (cols[0] + cols[-1]) / 2 if POSES[i] != 'down' and len(cols) else w / 2
        dx = round(CELL_W * i + CELL_W / 2 - anchor)
        dy = BASELINE - bottom
        atlas.alpha_composite(img, (max(CELL_W * i, min(CELL_W * (i + 1) - w, dx)), max(0, dy)))
        meta.append({'pose': POSES[i], 'width': w, 'height': h})
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f'{name}.webp', 'WEBP', quality=92, method=6, exact=False)
    return {'file': f'{name}.webp', 'scale': round(scale, 4), 'poses': meta}


def build_pickups():
    rgb = np.asarray(Image.open(SRC / 'pickups-sheet.jpg').convert('RGB'))
    alpha, key = key_mask(rgb)
    rgba = np.dstack([despill(rgb, alpha, key), (alpha * 255).astype(np.uint8)])
    labels, boxes = segments(alpha, len(PICKUPS))
    cw, ch = ITEM_CELL
    atlas = Image.new('RGBA', (cw * len(PICKUPS), ch), (0, 0, 0, 0))
    meta = []
    for i, box in enumerate(boxes):
        img = Image.fromarray(cut(rgba, labels, box), 'RGBA')
        w, h = round(img.width * ITEM_SCALE), round(img.height * ITEM_SCALE)
        if w > cw - 8: f = (cw - 8) / w; w, h = cw - 8, round(h * f)
        img = img.resize((w, h), Image.LANCZOS)
        atlas.alpha_composite(img, (cw * i + (cw - w) // 2, ch - 8 - h))
        meta.append({'item': PICKUPS[i], 'width': w, 'height': h})
    atlas.save(OUT / 'pickups.webp', 'WEBP', quality=92, method=6, exact=False)
    return {'file': 'pickups.webp', 'cell': [cw, ch], 'items': meta}


def main():
    manifest = {'version': 1, 'cell': [CELL_W, CELL_H], 'baseline': BASELINE, 'runtimeCell': [192, 224], 'poses': POSES,
                'grunts': {name: build_grunt(name) for name in GRUNTS}, 'pickups': build_pickups(),
                'sources': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()[:16] for p in sorted(SRC.glob('*.jpg'))}}
    path = OUT / 'manifest.json'
    text = json.dumps(manifest, indent=1) + '\n'
    if '--check' in sys.argv:
        assert path.read_text() == text, 'grunt manifest out of date'
    path.write_text(text)
    print('GRUNT_SPRITES_BUILT', {k: v['scale'] for k, v in manifest['grunts'].items()})


if __name__ == '__main__':
    main()
