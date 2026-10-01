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
DEST_BASELINE = 418
DEST_CENTER_X = 182
TARGET_STAND_H = 322

SEQUENCES = {
    'idle':      {'region': (0, 52, 518, 195),   'frames': 6, 'content_top': 34, 'content_bottom': 18, 'inner_x': 6, 'inner_y': 6},
    'walk-back': {'region': (0, 195, 706, 349),  'frames':10, 'content_top': 34, 'content_bottom': 16, 'inner_x': 4, 'inner_y': 12},
    'dash':      {'region': (706,195,1536,349),  'frames': 7, 'content_top': 34, 'content_bottom': 16, 'inner_x': 4, 'inner_y': 12},
    'jump':      {'region': (0, 349, 706, 503),  'frames': 8, 'content_top': 34, 'content_bottom': 16, 'inner_x': 4, 'inner_y': 12},
    'landing':   {'region': (706,349,1232,503),  'frames': 6, 'content_top': 34, 'content_bottom': 16, 'inner_x': 4, 'inner_y': 12},
    'hit':       {'region': (991,655,1536,806),  'frames': 8, 'content_top': 34, 'content_bottom': 16, 'inner_x': 4, 'inner_y': 12},
}
GROUNDED = {
    'idle':[0,1,2,3,4,5],
    'walk-back':[0,1,2,3,4,5,6,7,8,9],
    'dash':[0,1,2,3,4,5,6],
    'jump':[0,1,7],
    'landing':[0,1,4,5],
    'hit':[0,1,2,3,4],
}

img = Image.open(SRC).convert('RGBA')
a = np.array(img)


def threshold_mask(arr: np.ndarray) -> np.ndarray:
    rgb = arr[..., :3].astype(np.int16)
    lum = (0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2])
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    mask = ((lum > 48) & (sat > 14)) | (lum > 90)
    # trim 2px boundary to avoid separator lines
    mask[:2,:]=False; mask[-2:,:]=False; mask[:,:2]=False; mask[:,-2:]=False
    labels, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, labels, range(1, n+1))
    keep = np.zeros_like(mask)
    for idx, size in enumerate(sizes, 1):
        if size < 18:
            continue
        ys, xs = np.where(labels == idx)
        if len(xs)==0:
            continue
        # exclude narrow top text remnants
        if ys.max() < 12:
            continue
        keep |= (labels == idx)
    return keep

raw_frames = {k: [] for k in SEQUENCES}
stand_heights=[]
for seq, spec in SEQUENCES.items():
    x0,y0,x1,y1 = spec['region']
    region = a[y0:y1, x0:x1].copy()
    content = region[spec['content_top']: region.shape[0]-spec['content_bottom'], :, :]
    cell_w = content.shape[1] / spec['frames']
    cell_h = content.shape[0]
    for i in range(spec['frames']):
        sx0 = int(round(i * cell_w)) + spec['inner_x']
        sx1 = int(round((i+1)*cell_w)) - spec['inner_x']
        sy0 = spec['inner_y']
        sy1 = cell_h - spec['inner_y']
        cell = content[sy0:sy1, sx0:sx1, :]
        mask = threshold_mask(cell)
        ys, xs = np.where(mask)
        if len(xs)==0:
            raise RuntimeError(f'empty mask: {seq}#{i+1}')
        bbox = (int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1)
        raw_frames[seq].append({'cell': cell, 'mask': mask, 'bbox': bbox, 'cell_w': cell.shape[1], 'cell_h': cell.shape[0]})
        if seq in ('idle','walk-back','landing','hit'):
            stand_heights.append(bbox[3]-bbox[1])

scale = TARGET_STAND_H / float(np.median(stand_heights))
report = {'source': str(SRC), 'scale': scale, 'sequences': {}}
preview_items=[]

for seq, frames in raw_frames.items():
    count = len(frames)
    ref_idxs = GROUNDED[seq]
    ref_center = np.mean([((frames[i]['bbox'][0]+frames[i]['bbox'][2])/2) for i in ref_idxs if i < count])
    ref_gap = np.mean([(frames[i]['cell_h'] - frames[i]['bbox'][3]) for i in ref_idxs if i < count])
    strip = Image.new('RGBA', (FRAME_W*count, FRAME_H), (0,0,0,0))
    meta=[]
    for idx, fr in enumerate(frames):
        x0,y0,x1,y1 = fr['bbox']
        crop = fr['cell'][y0:y1, x0:x1, :].copy()
        mask = fr['mask'][y0:y1, x0:x1]
        crop[...,3] = np.where(mask, 255, 0).astype(np.uint8)
        im = Image.fromarray(crop, 'RGBA')
        w,h = im.size
        sw, sh = max(1,int(round(w*scale))), max(1,int(round(h*scale)))
        im = im.resize((sw, sh), Image.Resampling.LANCZOS)
        dx = (((x0+x1)/2)-ref_center) * scale * 0.42
        dy = ((fr['cell_h'] - y1)-ref_gap) * scale
        px = int(round(DEST_CENTER_X + dx - sw/2))
        py = int(round(DEST_BASELINE - sh - dy))
        px = max(-8, min(FRAME_W - sw + 8, px))
        py = max(-8, min(FRAME_H - sh + 8, py))
        dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
        dest.alpha_composite(im, (px, py))
        strip.alpha_composite(dest, (idx*FRAME_W,0))
        preview_items.append((seq, idx+1, dest))
        meta.append({'frame':idx+1,'bbox':[x0,y0,x1,y1],'paste':[px,py],'size':[sw,sh]})
    outfile = OUTDIR / f'{seq}.webp'
    strip.save(outfile, format='WEBP', lossless=True, quality=100, method=6)
    raw = outfile.read_bytes()
    report['sequences'][seq] = {'frames':count, 'bytes':len(raw), 'sha256':hashlib.sha256(raw).hexdigest().upper(), 'metrics':meta}

# manifest update
manifest_path = ROOT / 'public/art/animation-hq/ryu/manifest.json'
manifest = json.loads(manifest_path.read_text())
for rec in manifest['records']:
    sid = rec['id']
    if sid in report['sequences']:
        info = report['sequences'][sid]
        rec['frames']=info['frames']
        rec['frameSize']=[FRAME_W,FRAME_H]
        rec['stripSize']=[FRAME_W*info['frames'],FRAME_H]
        rec['bytes']=info['bytes']
        rec['sha256']=info['sha256']
        rec['enabled']=True
        rec['renderMode']='full'
        rec['poseAuthored']=True
manifest_path.write_text(json.dumps(manifest, indent=2))

# preview
cols=4
thumb_w=FRAME_W//2
thumb_h=FRAME_H//2
rows=(len(preview_items)+cols-1)//cols
pv=Image.new('RGBA',(cols*thumb_w,rows*thumb_h),(12,14,20,255))
d=ImageDraw.Draw(pv)
for i,(seq,num,frame) in enumerate(preview_items):
    x=(i%cols)*thumb_w; y=(i//cols)*thumb_h
    thumb=frame.resize((thumb_w,thumb_h), Image.Resampling.LANCZOS)
    pv.alpha_composite(thumb,(x,y))
    d.rectangle((x,y,x+thumb_w-1,y+thumb_h-1), outline=(70,80,110,255), width=1)
    d.text((x+6,y+6), f'{seq} {num:02d}', fill=(240,240,255,255))
pv.save(PREVIEW)
(ROOT/'RC36_AUTHORED_RYU_MOVEMENT_METRICS.json').write_text(json.dumps(report, indent=2))
print(json.dumps({'preview':str(PREVIEW), 'scale':scale}, indent=2))
