from PIL import Image
from pathlib import Path
import math, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public/art/combat-sprites-hq/ryu.webp'
OUT = ROOT / 'public/art/animation-hq/ryu'
OUT.mkdir(parents=True, exist_ok=True)
BASE = Image.open(SRC).convert('RGBA')
W,H = BASE.size

SEQS = {
    'idle': 6,
    'walk': 12,
    'walk-back': 10,
    'dash': 7,
    'jump': 8,
    'landing': 6,
    'stand-light': 7,
    'stand-heavy': 10,
    'hit': 8,
    'hadoken': 12,
    'shoryuken': 12,
}

def rgba_bbox(im):
    a = im.getchannel('A')
    return a.getbbox() or (0,0,W,H)

bbox = rgba_bbox(BASE)
center_x = (bbox[0] + bbox[2]) / 2
feet_y = bbox[3]

def transformed(scale_x=1.0, scale_y=1.0, rotate=0.0, tx=0.0, ty=0.0, shear=0.0):
    # Work on a padded transparent canvas so rotations never clip the source.
    pad = 96
    canvas = Image.new('RGBA', (W + pad*2, H + pad*2), (0,0,0,0))
    canvas.alpha_composite(BASE, (pad,pad))
    # Resize around character center while preserving transparent canvas.
    rw = max(1, round(canvas.width * scale_x))
    rh = max(1, round(canvas.height * scale_y))
    scaled = canvas.resize((rw,rh), Image.Resampling.LANCZOS)
    # Mild horizontal shear using affine transform; keeps the image high-resolution.
    if abs(shear) > 1e-6:
        sx = math.tan(shear)
        extra = abs(int(sx * rh)) + 8
        sh = Image.new('RGBA', (rw + extra, rh), (0,0,0,0))
        coeff = (1, sx, -min(0, int(sx*rh)), 0, 1, 0)
        scaled = scaled.transform(sh.size, Image.Transform.AFFINE, coeff, resample=Image.Resampling.BICUBIC)
    rotated = scaled.rotate(rotate, resample=Image.Resampling.BICUBIC, expand=True)
    out = Image.new('RGBA', (W,H), (0,0,0,0))
    # Anchor around the original feet/center rather than top-left to avoid foot skating.
    rb = rgba_bbox(rotated)
    rcx = (rb[0]+rb[2])/2
    rfy = rb[3]
    x = round(center_x + tx - rcx)
    y = round(feet_y + ty - rfy)
    out.alpha_composite(rotated, (x,y))
    return out

def params(kind, i, n):
    p = i / max(1,n-1)
    cyc = 2*math.pi*i/n
    if kind == 'idle':
        return dict(scale_x=1 + 0.004*math.sin(cyc), scale_y=1 + 0.008*math.sin(cyc), rotate=0.45*math.sin(cyc), tx=1.2*math.sin(cyc), ty=-1.5*math.sin(cyc))
    if kind == 'walk':
        return dict(scale_x=1 + 0.012*abs(math.sin(cyc)), scale_y=1 - 0.008*abs(math.sin(cyc)), rotate=1.7*math.sin(cyc), tx=3.2*math.sin(cyc), ty=-3.1*abs(math.sin(cyc)), shear=0.008*math.sin(cyc))
    if kind == 'walk-back':
        return dict(scale_x=1 + 0.009*abs(math.sin(cyc)), scale_y=1 - 0.006*abs(math.sin(cyc)), rotate=-1.4*math.sin(cyc), tx=-2.6*math.sin(cyc), ty=-2.4*abs(math.sin(cyc)), shear=-0.006*math.sin(cyc))
    if kind == 'dash':
        drive = math.sin(math.pi*p)
        return dict(scale_x=1 + 0.055*drive, scale_y=1 - 0.032*drive, rotate=-4.5*drive, tx=8.0*drive, ty=3.0*drive, shear=-0.02*drive)
    if kind == 'jump':
        if p < .28: squash = math.sin((p/.28)*math.pi)
        else: squash = 0
        stretch = math.sin(math.pi*min(1,max(0,(p-.18)/.45)))
        return dict(scale_x=1 - 0.035*stretch + 0.045*squash, scale_y=1 + 0.055*stretch - 0.07*squash, rotate=-2.2*math.sin(math.pi*p), tx=2.5*math.sin(math.pi*p), ty=-8.0*stretch + 4.0*squash)
    if kind == 'landing':
        squash = math.sin(math.pi*min(1,p/.55)) if p <= .55 else 0
        rebound = math.sin(math.pi*min(1,max(0,(p-.45)/.55)))
        return dict(scale_x=1 + .065*squash - .014*rebound, scale_y=1 - .09*squash + .02*rebound, rotate=1.3*squash - .45*rebound, tx=-1.5*squash, ty=7.5*squash - 2.5*rebound)
    if kind == 'stand-light':
        hit = math.sin(math.pi*min(1,p/.7))
        return dict(scale_x=1+.045*hit, scale_y=1-.018*hit, rotate=-2.7*hit, tx=6.0*hit, ty=-1.5*hit, shear=-.012*hit)
    if kind == 'stand-heavy':
        hit = math.sin(math.pi*min(1,p/.72))
        wind = math.sin(math.pi*min(1,p/.35)) if p<.35 else 0
        return dict(scale_x=1+.075*hit, scale_y=1-.026*hit, rotate=-5.2*hit+1.8*wind, tx=10.0*hit-2.0*wind, ty=-2.5*hit, shear=-.022*hit)
    if kind == 'hit':
        recoil = math.sin(math.pi*min(1,p/.62)) if p<.62 else math.sin(math.pi*(1-p)/.38)*.35
        return dict(scale_x=1-.03*recoil, scale_y=1+.018*recoil, rotate=7.0*recoil, tx=-8.0*recoil, ty=1.5*recoil, shear=.018*recoil)
    if kind == 'hadoken':
        wind = math.sin(math.pi*min(1,p/.45)) if p<.45 else 0
        release = math.sin(math.pi*min(1,max(0,(p-.28)/.55)))
        return dict(scale_x=1+.06*release-.025*wind, scale_y=1-.018*release+.012*wind, rotate=-4.3*release+2.1*wind, tx=8.5*release-3.5*wind, ty=-1.0*release+2.0*wind, shear=-.018*release)
    if kind == 'shoryuken':
        compression = math.sin(math.pi*min(1,p/.3)) if p<.3 else 0
        rise = math.sin(math.pi*min(1,max(0,(p-.12)/.63)))
        return dict(scale_x=1-.045*rise+.055*compression, scale_y=1+.075*rise-.065*compression, rotate=-7.5*rise+2.0*compression, tx=5.5*rise, ty=-14.0*rise+4.5*compression, shear=-.018*rise)
    return {}

records=[]
for name,n in SEQS.items():
    frames=[transformed(**params(name,i,n)) for i in range(n)]
    strip=Image.new('RGBA',(W*n,H),(0,0,0,0))
    for i,frame in enumerate(frames): strip.alpha_composite(frame,(i*W,0))
    out=OUT/f'{name}.webp'
    strip.save(out,'WEBP',lossless=True,method=6)
    data=out.read_bytes()
    mode = 'bridge' if name in {'stand-light','stand-heavy','hadoken','shoryuken'} else 'full'
    records.append({'id':name,'frames':n,'frameSize':[W,H],'stripSize':[W*n,H],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'enabled':True,'renderMode':mode,'poseAuthored':False})
source_bytes=SRC.read_bytes()
manifest={'candidate':'0.0.61-rc.36','character':'RYU','pipeline':'rc36-high-frame-pilot-v1','source':'approved RC34 HQ original','sourcePath':'/art/combat-sprites-hq/ryu.webp','sourceSize':[W,H],'sourceSha256':hashlib.sha256(source_bytes).hexdigest().upper(),'frameTotal':sum(SEQS.values()),'enabledFrameTotal':sum(r['frames'] for r in records if r['enabled']),'fullFrameTotal':sum(r['frames'] for r in records if r['renderMode']=='full'),'bridgeFrameTotal':sum(r['frames'] for r in records if r['renderMode']=='bridge'),'records':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'frameTotal':manifest['frameTotal'],'enabledFrameTotal':manifest['enabledFrameTotal'],'bytes':sum(r['bytes'] for r in records)},indent=2))
