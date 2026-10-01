from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np, json, hashlib
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/mnt/data/a_wide_high_resolution_sprite_sheet_style_image_o.png')
OUTDIR = ROOT / 'public/art/animation-hq/ryu'
PREVIEW = ROOT / 'RC36_AUTHORED_RYU_MOVEMENT_PREVIEW.png'
FRAME_W, FRAME_H = 384, 448
DEST_BASELINE = 420
DEST_CENTER_X = 176
HEADER_H = 36
FOOTER_H = 12
MIN_COMPONENT_AREA = 80
NEAR_PAD = 36

# x0,y0,x1,y1 on source poster, frame count
SEQUENCES = {
    'idle': (0, 52, 518, 195, 6),
    'walk-back': (0, 195, 706, 349, 10),
    'dash': (706, 195, 1536, 349, 7),
    'jump': (0, 349, 706, 503, 8),
    'landing': (706, 349, 1232, 503, 6),
    'hit': (991, 655, 1536, 806, 8),
}

STANDING_SEQS = {'idle', 'walk-back', 'landing', 'hit'}
GROUNDED_REFERENCE = {'idle':[0,1,2,3,4,5], 'walk-back':[0,1,2,3,4,5,6,7,8,9], 'landing':[0,1,4,5], 'hit':[0,1,2,3,4]}
TARGET_STANDING_H = 308

img = Image.open(SRC).convert('RGBA')
arr = np.array(img)


def make_mask(cell_rgba: np.ndarray) -> np.ndarray:
    rgb = cell_rgba[..., :3].astype(np.int16)
    val = rgb.max(axis=2)
    lum = (0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2])
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    # dark bg removal, keep bright / saturated fighter pixels and smoke/effects near fighter
    mask = ((lum > 55) & (sat > 18)) | (lum > 95)
    # aggressively remove label/digit areas inside each cell
    mask[:12, :] = False
    mask[-10:, :] = False
    mask[:, :2] = False
    mask[:, -2:] = False
    return mask


def components_union(mask: np.ndarray):
    labels, n = ndimage.label(mask)
    objs = ndimage.find_objects(labels)
    comps = []
    for i, s in enumerate(objs, 1):
        if s is None:
            continue
        ys, xs = s
        x0, x1 = xs.start, xs.stop
        y0, y1 = ys.start, ys.stop
        area = int((labels[ys, xs] == i).sum())
        if area < MIN_COMPONENT_AREA:
            continue
        comps.append({'id': i, 'bbox': (x0, y0, x1, y1), 'area': area})
    if not comps:
        return None, []
    # prefer lower large component (fighter body) not header text
    comps.sort(key=lambda c: (c['area'], c['bbox'][3], -c['bbox'][1]), reverse=True)
    main = comps[0]
    mx0,my0,mx1,my1 = main['bbox']
    kept=[]
    union=np.zeros(mask.shape, dtype=bool)
    for comp in comps:
        x0,y0,x1,y1 = comp['bbox']
        inter = not (x1 < mx0-NEAR_PAD or x0 > mx1+NEAR_PAD or y1 < my0-NEAR_PAD or y0 > my1+NEAR_PAD)
        if inter or comp['area'] > main['area']*0.18:
            kept.append(comp)
            union |= (labels == comp['id'])
    ys, xs = np.where(union)
    if len(xs)==0:
        return main['bbox'], kept
    bbox = (int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1)
    return bbox, kept

# First pass: collect bboxes and choose scale
frames_data = {k: [] for k in SEQUENCES}
standing_heights=[]
for seq, (x0,y0,x1,y1,count) in SEQUENCES.items():
    region = arr[y0:y1, x0:x1].copy()
    content = region[HEADER_H:region.shape[0]-FOOTER_H, :, :]
    cell_w = content.shape[1] / count
    cell_h = content.shape[0]
    for i in range(count):
        cx0 = int(round(i * cell_w))
        cx1 = int(round((i+1) * cell_w))
        cell = content[:, cx0:cx1, :]
        mask = make_mask(cell)
        bbox, kept = components_union(mask)
        if bbox is None:
            raise RuntimeError(f'No component for {seq} frame {i+1}')
        frames_data[seq].append({'cell': cell, 'bbox': bbox, 'cell_w': cell.shape[1], 'cell_h': cell.shape[0]})
        if seq in STANDING_SEQS and i in GROUNDED_REFERENCE.get(seq, []):
            h = bbox[3]-bbox[1]
            if h > 60:
                standing_heights.append(h)

if not standing_heights:
    raise RuntimeError('No standing heights found')
scale = TARGET_STANDING_H / float(np.median(standing_heights))

metrics = {'source': str(SRC), 'scale': scale, 'sequences': {}}

# Second pass: render strips
preview_items=[]
for seq, frames in frames_data.items():
    count = len(frames)
    # reference center/bottom gap based on grounded frames or all frames
    refs = [frames[i] for i in GROUNDED_REFERENCE.get(seq, range(count)) if i < count]
    ref_center = np.mean([((f['bbox'][0]+f['bbox'][2])/2.0) for f in refs])
    ref_gap = np.mean([(f['cell_h'] - f['bbox'][3]) for f in refs])

    strip = Image.new('RGBA', (FRAME_W*count, FRAME_H), (0,0,0,0))
    seq_metrics=[]
    for idx, frame in enumerate(frames):
        cell = frame['cell']
        bbox = frame['bbox']
        x0,y0,x1,y1 = bbox
        crop = Image.fromarray(cell[y0:y1, x0:x1, :], 'RGBA')
        # knock out remaining bg by alpha mask from selected bbox zone
        submask = make_mask(np.array(crop))
        labels, n = ndimage.label(submask)
        # keep all in bbox; if bg leftovers, mask low-alpha out
        crop_arr = np.array(crop)
        crop_arr[...,3] = np.where(submask, 255, 0).astype(np.uint8)
        crop = Image.fromarray(crop_arr, 'RGBA')
        sw, sh = crop.size
        scaled_w = max(1, int(round(sw * scale)))
        scaled_h = max(1, int(round(sh * scale)))
        crop = crop.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
        source_center = ((x0+x1)/2.0)
        source_gap = frame['cell_h'] - y1
        dx = (source_center - ref_center) * scale * 0.45
        dy = (source_gap - ref_gap) * scale
        px = int(round(DEST_CENTER_X + dx - scaled_w/2))
        py = int(round(DEST_BASELINE - scaled_h - dy))
        dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
        px = max(-12, min(FRAME_W - scaled_w + 12, px))
        py = max(-8, min(FRAME_H - scaled_h + 12, py))
        dest.alpha_composite(crop, (px, py))
        strip.alpha_composite(dest, (idx*FRAME_W, 0))
        seq_metrics.append({'frame': idx+1, 'paste': [px, py], 'size':[scaled_w,scaled_h], 'bbox': list(map(int,bbox))})
        preview_items.append((seq, idx+1, dest))
    (OUTDIR / f'{seq}.webp').parent.mkdir(parents=True, exist_ok=True)
    strip.save(OUTDIR / f'{seq}.webp', format='WEBP', lossless=True, quality=100, method=6)
    raw = (OUTDIR / f'{seq}.webp').read_bytes()
    metrics['sequences'][seq] = {
        'frames': count,
        'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest().upper(),
        'frameMetrics': seq_metrics,
    }

# Update manifest
manifest_path = ROOT / 'public/art/animation-hq/ryu/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for rec in manifest['records']:
    sid = rec['id']
    if sid in metrics['sequences']:
        raw_meta = metrics['sequences'][sid]
        rec['frames'] = raw_meta['frames']
        rec['frameSize'] = [FRAME_W, FRAME_H]
        rec['stripSize'] = [FRAME_W * raw_meta['frames'], FRAME_H]
        rec['bytes'] = raw_meta['bytes']
        rec['sha256'] = raw_meta['sha256']
        rec['enabled'] = True
        rec['renderMode'] = 'full'
        rec['poseAuthored'] = True
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

# build preview sheet
cols=4
thumb_w=FRAME_W//2
thumb_h=FRAME_H//2
rows=(len(preview_items)+cols-1)//cols
pv=Image.new('RGBA',(cols*thumb_w, rows*thumb_h),(14,16,22,255))
draw=ImageDraw.Draw(pv)
for i,(seq,fr,dest) in enumerate(preview_items):
    thumb = dest.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x=(i%cols)*thumb_w
    y=(i//cols)*thumb_h
    pv.alpha_composite(thumb,(x,y))
    draw.rectangle((x,y,x+thumb_w-1,y+thumb_h-1), outline=(70,80,110,255), width=1)
    draw.text((x+8,y+8), f'{seq} {fr:02d}', fill=(240,240,255,255))
pv.save(PREVIEW)

(metrics_path := ROOT/'RC36_AUTHORED_RYU_MOVEMENT_METRICS.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
print(json.dumps({'preview': str(PREVIEW), 'metrics': str(metrics_path), 'scale': scale}, indent=2))
