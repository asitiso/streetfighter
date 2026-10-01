from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np, json, hashlib
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/mnt/data/ghostwriter_images/generated/a_clean_sprite_sheet_style_illustration_on_a_trans_1.png')
OUT = ROOT / 'public/art/animation-hq/ryu/dash.webp'
PREVIEW = ROOT / 'RC38_RYU_DASH_7F_PREVIEW.png'
METRICS = ROOT / 'RC38_RYU_DASH_7F_METRICS.json'
FRAME_W, FRAME_H = 384, 448
COLS, ROWS = 4, 2
CANVAS_BASELINE = 423
CANVAS_CENTER_X = 190
TARGET_HEIGHT = 320

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
        alpha = cell[...,3] > 8
        alpha[:2,:]=False; alpha[-2:,:]=False; alpha[:,:2]=False; alpha[:,-2:]=False
        labels, n = ndimage.label(alpha)
        objs = ndimage.find_objects(labels)
        comps=[]
        for i,s in enumerate(objs,1):
            if s is None: continue
            ys,xs = s
            area = int((labels[ys,xs]==i).sum())
            if area < 600: continue
            xx0,xx1=xs.start,xs.stop; yy0,yy1=ys.start,ys.stop
            comps.append((area,xx0,yy0,xx1,yy1,i))
        if not comps:
            continue
        comps.sort(key=lambda t:t[0], reverse=True)
        area,xx0,yy0,xx1,yy1,main_i = comps[0]
        union = labels == main_i
        mx0,my0,mx1,my1 = xx0,yy0,xx1,yy1
        for area2,x0b,y0b,x1b,y1b,i2 in comps[1:]:
            near = not (x1b < mx0-24 or x0b > mx1+24 or y1b < my0-24 or y0b > my1+24)
            if near:
                union |= labels == i2
        ys,xs = np.where(union)
        bx0,bx1 = xs.min(), xs.max()+1
        by0,by1 = ys.min(), ys.max()+1
        crop = cell[by0:by1, bx0:bx1].copy()
        crop[...,3] = np.where(union[by0:by1, bx0:bx1], crop[...,3], 0)
        frames.append({
            'raw': Image.fromarray(crop, 'RGBA'),
            'bbox': [int(bx0), int(by0), int(bx1), int(by1)],
            'bottomGap': int(cell.shape[0]-by1),
            'centerX': (bx0+bx1)/2.0,
            'grid': [r,c],
        })
        heights.append(by1 - by0)

# keep first 7 frames in grid order
frames = frames[:7]
scale = TARGET_HEIGHT / float(np.median(heights))
ref_center = sum(f['centerX'] for f in frames) / len(frames)
ref_gap = sum(f['bottomGap'] for f in frames) / len(frames)

strip = Image.new('RGBA', (FRAME_W*len(frames), FRAME_H), (0,0,0,0))
preview = Image.new('RGBA', (FRAME_W*4, FRAME_H*2), (16,18,24,255))
draw = ImageDraw.Draw(preview)
metrics=[]
for i,fr in enumerate(frames):
    im = fr['raw']
    w,h = im.size
    sw,sh = int(round(w*scale)), int(round(h*scale))
    im = im.resize((sw,sh), Image.Resampling.LANCZOS)
    dx = (fr['centerX'] - ref_center) * scale * 0.25
    dy = (fr['bottomGap'] - ref_gap) * scale
    px = int(round(CANVAS_CENTER_X + dx - sw/2))
    py = int(round(CANVAS_BASELINE - sh - dy))
    dest = Image.new('RGBA', (FRAME_W, FRAME_H), (0,0,0,0))
    dest.alpha_composite(im, (px,py))
    strip.alpha_composite(dest, (i*FRAME_W, 0))
    gx = (i % 4)*FRAME_W; gy=(i//4)*FRAME_H
    preview.alpha_composite(dest, (gx,gy))
    draw.rectangle((gx,gy,gx+FRAME_W-1,gy+FRAME_H-1), outline=(85,90,120,255), width=1)
    draw.text((gx+10, gy+10), f'{i+1:02d}', fill=(245,245,255,255))
    alpha=np.array(dest.getchannel('A'))
    nz=np.argwhere(alpha>0)
    bbox=None
    if len(nz):
        y0,x0=nz.min(axis=0); y1,x1=nz.max(axis=0)
        bbox=[int(x0),int(y0),int(x1+1),int(y1+1)]
    metrics.append({'frame':i+1,'grid':fr['grid'],'sourceBBox':fr['bbox'],'paste':[px,py],'scaledSize':[sw,sh],'outputBBox':bbox})

OUT.parent.mkdir(parents=True, exist_ok=True)
strip.save(OUT, format='WEBP', lossless=True, quality=100, method=6)
preview.save(PREVIEW)
raw=OUT.read_bytes()
report={'source':str(SRC),'output':str(OUT),'frames':len(frames),'frameSize':[FRAME_W,FRAME_H],'scale':scale,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper(),'metrics':metrics}
METRICS.write_text(json.dumps(report, indent=2), encoding='utf-8')

manifest_path=ROOT/'public/art/animation-hq/ryu/manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for rec in manifest['records']:
    if rec['id']=='dash':
        rec['frames']=len(frames)
        rec['frameSize']=[FRAME_W,FRAME_H]
        rec['stripSize']=[FRAME_W*len(frames),FRAME_H]
        rec['bytes']=len(raw)
        rec['sha256']=report['sha256']
        rec['enabled']=True
        rec['renderMode']='full'
        rec['poseAuthored']=True
manifest['enabledFrameTotal']=sum(r['frames'] for r in manifest['records'] if r.get('enabled'))
manifest['fullFrameTotal']=sum(r['frames'] for r in manifest['records'] if r.get('enabled') and r.get('renderMode')=='full')
manifest['frameTotal']=sum(r['frames'] for r in manifest['records'])
manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')

lib=ROOT/'src/render/AnimationSequenceLibrary.ts'
text=lib.read_text(encoding='utf-8')
text=text.replace("{ id:'RYU_DASH_HQ', characterId:'RYU', kind:'dash', asset:'/art/animation-hq/ryu/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },",
                  "{ id:'RYU_DASH_HQ', characterId:'RYU', kind:'dash', asset:'/art/animation-hq/ryu/dash.webp', frameCount:7, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },")
text=text.replace('export const RYU_RC36_ENABLED_FRAME_TOTAL = 20;','export const RYU_RC36_ENABLED_FRAME_TOTAL = 27;')
text=text.replace('export const RYU_RC36_FULL_FRAME_TOTAL = 20;','export const RYU_RC36_FULL_FRAME_TOTAL = 27;')
lib.write_text(text, encoding='utf-8')

# verify animation sequences patch
vp=ROOT/'scripts/verify-animation-sequences.mjs'
vt=vp.read_text(encoding='utf-8')
vt=vt.replace('assert.equal(manifest.enabledFrameTotal, 20);','assert.equal(manifest.enabledFrameTotal, 27);')
vt=vt.replace('assert.equal(manifest.fullFrameTotal, 20);','assert.equal(manifest.fullFrameTotal, 27);')
vt=vt.replace("assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 20);","assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 27);")
vt=vt.replace("for (const kind of ['walk-back','dash','jump','landing','stand-light','stand-heavy','hit','hadoken','shoryuken']) {","for (const kind of ['walk-back','jump','landing','stand-light','stand-heavy','hit','hadoken','shoryuken']) {")
needle="assert.equal(animationSequenceFor('RYU','walk')?.source, 'authored-hq');"
insert="""assert.equal(animationSequenceFor('RYU','dash')?.enabled, true);\nassert.equal(animationSequenceFor('RYU','dash')?.poseAuthored, true);\nassert.equal(animationSequenceFor('RYU','dash')?.source, 'authored-hq');\nassert.equal(manifest.records.find((record) => record.id === 'dash')?.poseAuthored, true);\nassert.equal(manifest.records.find((record) => record.id === 'dash')?.enabled, true);"""
if insert not in vt:
    vt=vt.replace(needle, needle+'\n'+insert)
vp.write_text(vt, encoding='utf-8')

# verify-v062 summary patch
vp2=ROOT/'scripts/verify-v062-rc37.mjs'
text2=vp2.read_text(encoding='utf-8')
text2=text2.replace('highFrameEnabledFrameTotal: 20,','highFrameEnabledFrameTotal: 27,')
text2=text2.replace('highFrameFullFrameTotal: 20,','highFrameFullFrameTotal: 27,')
text2=text2.replace("highFrameRuntimeSequences: [ 'idle', 'walk' ],","highFrameRuntimeSequences: [ 'idle', 'walk', 'dash' ],")
vp2.write_text(text2, encoding='utf-8')

print(json.dumps(report, indent=2))
