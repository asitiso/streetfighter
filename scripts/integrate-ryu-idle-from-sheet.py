from pathlib import Path
from PIL import Image, ImageDraw, ImageStat
import numpy as np, json, hashlib
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/mnt/data/8프레임_격투가_유휴_애니메이션_스프라이트_시트.png')
OUT = ROOT / 'public/art/animation-hq/ryu/idle.webp'
PREVIEW = ROOT / 'RC37_RYU_IDLE_8F_PREVIEW.png'
METRICS = ROOT / 'RC37_RYU_IDLE_8F_METRICS.json'
FRAME_W, FRAME_H = 384, 448
COLS, ROWS = 4, 2
CANVAS_BASELINE = 423
CANVAS_CENTER_X = 184
TARGET_HEIGHT = 352

img = Image.open(SRC).convert('RGBA')
a = np.array(img)
cell_w = img.width / COLS
cell_h = img.height / ROWS

frames = []
heights = []
for r in range(ROWS):
    for c in range(COLS):
        x0 = int(round(c * cell_w))
        x1 = int(round((c+1) * cell_w))
        y0 = int(round(r * cell_h))
        y1 = int(round((r+1) * cell_h))
        cell = a[y0:y1, x0:x1].copy()
        rgb = cell[..., :3].astype(np.int16)
        lum = (0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2])
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        # black bg, keep visible colored/bright pixels
        mask = (lum > 24) | (sat > 10)
        mask[:2,:]=False; mask[-2:,:]=False; mask[:,:2]=False; mask[:,-2:]=False
        labels, n = ndimage.label(mask)
        objs = ndimage.find_objects(labels)
        comps=[]
        for i,s in enumerate(objs,1):
            if s is None: continue
            ys,xs = s
            xx0,xx1 = xs.start,xs.stop
            yy0,yy1 = ys.start,ys.stop
            area = int((labels[ys,xs]==i).sum())
            if area < 50: continue
            comps.append((area,xx0,yy0,xx1,yy1,i))
        if not comps:
            raise RuntimeError(f'no component at cell {r},{c}')
        # choose component with best body-like bbox (large area, lower position)
        comps.sort(key=lambda t:(t[0], t[4], -(t[3]-t[1])*(t[4]-t[2])), reverse=True)
        area,xx0,yy0,xx1,yy1,main_i = comps[0]
        # union nearby components to keep headband tails / gloves if separated
        union = labels == main_i
        mx0,my0,mx1,my1 = xx0,yy0,xx1,yy1
        for area2,x0b,y0b,x1b,y1b,i2 in comps[1:]:
            near = not (x1b < mx0-20 or x0b > mx1+20 or y1b < my0-20 or y0b > my1+20)
            if near:
                union |= labels == i2
        ys,xs = np.where(union)
        bx0, bx1 = xs.min(), xs.max()+1
        by0, by1 = ys.min(), ys.max()+1
        crop = cell[by0:by1, bx0:bx1].copy()
        crop[...,3] = np.where(union[by0:by1, bx0:bx1], 255, 0).astype(np.uint8)
        frames.append({
            'raw': Image.fromarray(crop, 'RGBA'),
            'bbox': [int(bx0), int(by0), int(bx1), int(by1)],
            'cellSize': [cell.shape[1], cell.shape[0]],
            'bottomGap': int(cell.shape[0] - by1),
            'centerX': (bx0 + bx1)/2.0,
        })
        heights.append(by1 - by0)

scale = TARGET_HEIGHT / float(np.median(heights))
ref_center = sum(f['centerX'] for f in frames) / len(frames)
ref_gap = sum(f['bottomGap'] for f in frames) / len(frames)

strip = Image.new('RGBA', (FRAME_W * len(frames), FRAME_H), (0,0,0,0))
preview = Image.new('RGBA', (FRAME_W*4, FRAME_H*2), (16,18,24,255))
draw = ImageDraw.Draw(preview)
metrics = []
for i,fr in enumerate(frames):
    im = fr['raw']
    w,h = im.size
    sw,sh = int(round(w*scale)), int(round(h*scale))
    im = im.resize((sw,sh), Image.Resampling.LANCZOS)
    dx = (fr['centerX'] - ref_center) * scale * 0.45
    dy = (fr['bottomGap'] - ref_gap) * scale
    px = int(round(CANVAS_CENTER_X + dx - sw/2))
    py = int(round(CANVAS_BASELINE - sh - dy))
    dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
    dest.alpha_composite(im, (px,py))
    strip.alpha_composite(dest, (i*FRAME_W, 0))

    gx = (i % 4) * FRAME_W
    gy = (i // 4) * FRAME_H
    preview.alpha_composite(dest, (gx, gy))
    draw.rectangle((gx, gy, gx+FRAME_W-1, gy+FRAME_H-1), outline=(85,90,120,255), width=1)
    draw.text((gx+10, gy+10), f'{i+1:02d}', fill=(245,245,255,255))
    alpha = np.array(dest.getchannel('A'))
    nz = np.argwhere(alpha>0)
    if len(nz):
        y0,x0 = nz.min(axis=0); y1,x1 = nz.max(axis=0)
        bbox_out = [int(x0), int(y0), int(x1+1), int(y1+1)]
    else:
        bbox_out = None
    metrics.append({
        'frame': i+1,
        'sourceBBox': fr['bbox'],
        'outputBBox': bbox_out,
        'paste': [px,py],
        'scaledSize': [sw,sh],
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
strip.save(OUT, format='WEBP', lossless=True, quality=100, method=6)
preview.save(PREVIEW)
raw = OUT.read_bytes()
report = {
    'source': str(SRC),
    'output': str(OUT),
    'frames': len(frames),
    'frameSize': [FRAME_W, FRAME_H],
    'scale': scale,
    'bytes': len(raw),
    'sha256': hashlib.sha256(raw).hexdigest().upper(),
    'metrics': metrics,
}
METRICS.write_text(json.dumps(report, indent=2), encoding='utf-8')

manifest_path = ROOT / 'public/art/animation-hq/ryu/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
for rec in manifest['records']:
    if rec['id'] == 'idle':
        rec['frames'] = len(frames)
        rec['frameSize'] = [FRAME_W, FRAME_H]
        rec['stripSize'] = [FRAME_W * len(frames), FRAME_H]
        rec['bytes'] = len(raw)
        rec['sha256'] = hashlib.sha256(raw).hexdigest().upper()
        rec['enabled'] = True
        rec['renderMode'] = 'full'
        rec['poseAuthored'] = True
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

# sequence library patch
lib = ROOT / 'src/render/AnimationSequenceLibrary.ts'
text = lib.read_text(encoding='utf-8')
text = text.replace("{ id:'RYU_IDLE_HQ', characterId:'RYU', kind:'idle', asset:'/art/animation-hq/ryu/idle.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:7.5, loop:true, timing:'ease-in', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },",
                    "{ id:'RYU_IDLE_HQ', characterId:'RYU', kind:'idle', asset:'/art/animation-hq/ryu/idle.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:8.0, loop:true, timing:'ease-in', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },")
lib.write_text(text, encoding='utf-8')

# verify script patch
verify = ROOT / 'scripts/verify-animation-sequences.mjs'
vtext = verify.read_text(encoding='utf-8')
vtext = vtext.replace("assert.equal(animationSequenceFor('RYU','idle')?.frameCount, 6);", "assert.equal(animationSequenceFor('RYU','idle')?.frameCount, 8);")
verify.write_text(vtext, encoding='utf-8')

print(json.dumps(report, indent=2))
