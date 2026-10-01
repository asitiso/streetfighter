from PIL import Image
from pathlib import Path
import math, json, hashlib

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'public/art/combat-sprites-hq/ken.webp'
OUT = ROOT / 'public/art/animation-hq/ken'
OUT.mkdir(parents=True, exist_ok=True)
BASE = Image.open(SRC).convert('RGBA')
W,H = BASE.size
SEQS = {'idle':6,'walk':12,'walk-back':10,'dash':7,'jump':8,'landing':6,'hit':8}

def bbox(im): return im.getchannel('A').getbbox() or (0,0,W,H)
b=bbox(BASE); center_x=(b[0]+b[2])/2; feet_y=b[3]

def transformed(scale_x=1, scale_y=1, rotate=0, tx=0, ty=0, shear=0):
    pad=96
    canvas=Image.new('RGBA',(W+pad*2,H+pad*2),(0,0,0,0)); canvas.alpha_composite(BASE,(pad,pad))
    rw=max(1,round(canvas.width*scale_x)); rh=max(1,round(canvas.height*scale_y))
    img=canvas.resize((rw,rh),Image.Resampling.LANCZOS)
    if abs(shear)>1e-6:
        sx=math.tan(shear); extra=abs(int(sx*rh))+8
        coeff=(1,sx,-min(0,int(sx*rh)),0,1,0)
        img=img.transform((rw+extra,rh),Image.Transform.AFFINE,coeff,resample=Image.Resampling.BICUBIC)
    img=img.rotate(rotate,resample=Image.Resampling.BICUBIC,expand=True)
    rb=bbox(img); rcx=(rb[0]+rb[2])/2; rfy=rb[3]
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    out.alpha_composite(img,(round(center_x+tx-rcx),round(feet_y+ty-rfy)))
    return out

def params(kind,i,n):
    p=i/max(1,n-1); cyc=2*math.pi*i/n
    if kind=='idle':
        return dict(scale_x=1+.005*math.sin(cyc),scale_y=1+.009*math.sin(cyc),rotate=.6*math.sin(cyc),tx=1.5*math.sin(cyc),ty=-1.8*math.sin(cyc))
    if kind=='walk':
        return dict(scale_x=1+.014*abs(math.sin(cyc)),scale_y=1-.009*abs(math.sin(cyc)),rotate=2.05*math.sin(cyc)-.35,tx=3.8*math.sin(cyc)+.6,ty=-3.0*abs(math.sin(cyc)),shear=.011*math.sin(cyc)-.004)
    if kind=='walk-back':
        return dict(scale_x=1+.011*abs(math.sin(cyc)),scale_y=1-.007*abs(math.sin(cyc)),rotate=-1.55*math.sin(cyc)+.25,tx=-3.0*math.sin(cyc)-.35,ty=-2.5*abs(math.sin(cyc)),shear=-.008*math.sin(cyc)+.003)
    if kind=='dash':
        drive=math.sin(math.pi*p)
        return dict(scale_x=1+.072*drive,scale_y=1-.038*drive,rotate=-5.8*drive,tx=11.5*drive,ty=2.5*drive,shear=-.027*drive)
    if kind=='jump':
        squash=math.sin((p/.28)*math.pi) if p<.28 else 0
        stretch=math.sin(math.pi*min(1,max(0,(p-.16)/.46)))
        return dict(scale_x=1-.038*stretch+.04*squash,scale_y=1+.063*stretch-.06*squash,rotate=-2.9*math.sin(math.pi*p),tx=3.4*math.sin(math.pi*p),ty=-9.2*stretch+3.5*squash)
    if kind=='landing':
        squash=math.sin(math.pi*min(1,p/.52)) if p<=.52 else 0
        rebound=math.sin(math.pi*min(1,max(0,(p-.42)/.58)))
        return dict(scale_x=1+.058*squash-.018*rebound,scale_y=1-.078*squash+.025*rebound,rotate=1.0*squash-.7*rebound,tx=-1.0*squash+1.2*rebound,ty=6.3*squash-3.0*rebound)
    if kind=='hit':
        recoil=math.sin(math.pi*min(1,p/.58)) if p<.58 else math.sin(math.pi*(1-p)/.42)*.32
        return dict(scale_x=1-.025*recoil,scale_y=1+.016*recoil,rotate=6.2*recoil,tx=-7.2*recoil,ty=1.2*recoil,shear=.016*recoil)
    return {}

records=[]
for name,n in SEQS.items():
    strip=Image.new('RGBA',(W*n,H),(0,0,0,0))
    for i in range(n): strip.alpha_composite(transformed(**params(name,i,n)),(i*W,0))
    out=OUT/f'{name}.webp'; strip.save(out,'WEBP',lossless=True,method=6)
    data=out.read_bytes(); records.append({'id':name,'frames':n,'frameSize':[W,H],'stripSize':[W*n,H],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'enabled':True,'renderMode':'full','poseAuthored':False})
source=SRC.read_bytes()
manifest={'candidate':'0.0.61-rc.36','character':'KEN','pipeline':'rc36-high-frame-pilot-v1','source':'approved RC34 HQ original','sourcePath':'/art/combat-sprites-hq/ken.webp','sourceSize':[W,H],'sourceSha256':hashlib.sha256(source).hexdigest().upper(),'frameTotal':sum(SEQS.values()),'enabledFrameTotal':sum(SEQS.values()),'fullFrameTotal':sum(SEQS.values()),'bridgeFrameTotal':0,'records':records}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps({'character':'KEN','frameTotal':manifest['frameTotal'],'bytes':sum(r['bytes'] for r in records)},indent=2))
