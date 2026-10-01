from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageOps, ImageStat, ImageDraw
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/mnt/data/류_스타일_격투가_걷기_사이클_스프라이트_시트.png')
OUT = ROOT / 'public/art/animation-hq/ryu/walk.webp'
PREVIEW = ROOT / 'RC36_AUTHORED_RYU_WALK_PREVIEW.png'
FRAME_W, FRAME_H = 384, 448
COLS, ROWS = 4, 3
CANVAS_BASELINE = 430
CANVAS_CENTER_X = 188
BBOX_PAD = 6

img = Image.open(SRC).convert('RGBA')
W, H = img.size
cell_w = W / COLS
cell_h = H / ROWS
frames = []
boxes = []

for row in range(ROWS):
    for col in range(COLS):
        x0 = round(col * cell_w)
        x1 = round((col + 1) * cell_w)
        y0 = round(row * cell_h)
        y1 = round((row + 1) * cell_h)
        cell = img.crop((x0, y0, x1, y1))
        alpha = cell.getchannel('A')
        bbox = alpha.getbbox()
        if not bbox:
            raise SystemExit(f'empty cell at {row},{col}')
        bx0, by0, bx1, by1 = bbox
        bx0 = max(0, bx0 - BBOX_PAD)
        by0 = max(0, by0 - BBOX_PAD)
        bx1 = min(cell.width, bx1 + BBOX_PAD)
        by1 = min(cell.height, by1 + BBOX_PAD)
        crop = cell.crop((bx0, by0, bx1, by1))
        frames.append(crop)
        boxes.append((bx0, by0, bx1, by1))

center_xs = [((bx0 + bx1) / 2.0) for bx0, by0, bx1, by1 in boxes]
avg_center_x = sum(center_xs) / len(center_xs)

strip = Image.new('RGBA', (FRAME_W * len(frames), FRAME_H), (0, 0, 0, 0))
preview = Image.new('RGBA', (FRAME_W * 4, FRAME_H * 3), (20, 20, 26, 255))
preview_draw = ImageDraw.Draw(preview)

for i, frame in enumerate(frames):
    bbox = frame.getchannel('A').getbbox()
    if not bbox:
        continue
    fx0, fy0, fx1, fy1 = bbox
    crop = frame.crop((fx0, fy0, fx1, fy1))
    src_center_x = (fx0 + fx1) / 2.0
    dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    paste_x = round(CANVAS_CENTER_X - (src_center_x - avg_center_x) - crop.width / 2)
    paste_y = CANVAS_BASELINE - crop.height
    paste_x = max(0, min(FRAME_W - crop.width, paste_x))
    paste_y = max(0, min(FRAME_H - crop.height, paste_y))
    dest.alpha_composite(crop, (paste_x, paste_y))
    strip.alpha_composite(dest, (i * FRAME_W, 0))

    px = (i % 4) * FRAME_W
    py = (i // 4) * FRAME_H
    preview.alpha_composite(dest, (px, py))
    preview_draw.rectangle((px, py, px + FRAME_W - 1, py + FRAME_H - 1), outline=(80, 80, 100, 255), width=1)
    preview_draw.text((px + 10, py + 10), f'{i+1:02d}', fill=(240, 240, 255, 255))

OUT.parent.mkdir(parents=True, exist_ok=True)
strip.save(OUT, format='WEBP', lossless=True, quality=100, method=6)
preview.save(PREVIEW)

manifest_path = ROOT / 'public/art/animation-hq/ryu/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
raw = OUT.read_bytes()
for rec in manifest['records']:
    if rec['id'] == 'walk':
        rec['frames'] = 12
        rec['frameSize'] = [FRAME_W, FRAME_H]
        rec['stripSize'] = [FRAME_W * 12, FRAME_H]
        rec['bytes'] = len(raw)
        rec['sha256'] = hashlib.sha256(raw).hexdigest().upper()
        rec['enabled'] = True
        rec['renderMode'] = 'full'
        rec['poseAuthored'] = True
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

# also emit lightweight metrics
metrics = []
for i in range(len(frames)):
    frame = strip.crop((i * FRAME_W, 0, (i + 1) * FRAME_W, FRAME_H))
    alpha = frame.getchannel('A')
    bbox = alpha.getbbox()
    metrics.append({
        'frame': i + 1,
        'bbox': bbox,
        'alphaCoverage': round(ImageStat.Stat(alpha).sum[0] / (255 * FRAME_W * FRAME_H), 6),
    })
(Path(ROOT / 'RC36_AUTHORED_RYU_WALK_METRICS.json')).write_text(json.dumps({
    'source': str(SRC),
    'output': str(OUT),
    'frames': len(frames),
    'frameSize': [FRAME_W, FRAME_H],
    'canvasBaseline': CANVAS_BASELINE,
    'canvasCenterX': CANVAS_CENTER_X,
    'metrics': metrics,
}, indent=2), encoding='utf-8')

print(json.dumps({
    'sourceSize': [W, H],
    'cellSizeApprox': [round(cell_w), round(cell_h)],
    'output': str(OUT),
    'preview': str(PREVIEW),
    'bytes': len(raw),
    'sha256': hashlib.sha256(raw).hexdigest().upper(),
    'frames': len(frames)
}, indent=2))
