from PIL import Image
from pathlib import Path
import math, json, hashlib

ROOT=Path(__file__).resolve().parents[1]
W,H=384,448
SEQS={'idle':6,'walk':12,'walk-back':10,'dash':7,'jump':8,'landing':6,'hit':8}
CONFIG={
 'CHUNLI': {
   'slug':'chunli',
   'idle':dict(rot=.36,tx=1.0,ty=1.2,sx=.003,sy=.006),
   'walk':dict(rot=1.35,tx=3.5,ty=2.3,sx=.010,sy=.006,shear=.006),
   'back':dict(rot=1.15,tx=3.0,ty=2.0,sx=.009,sy=.005,shear=.005),
   'dash':dict(stretch=.058,squash=.025,rot=3.6,tx=8.5,ty=1.7,shear=.016),
   'jump':dict(stretch=.052,squash=.035,rot=1.8,tx=3.2,ty=8.6),
   'landing':dict(sx=.050,sy=.068,rot=.8,ty=5.8,rebound=2.7),
   'hit':dict(rot=5.2,tx=6.5,sy=.014,sx=.021),
 },
 'IBUKI': {
   'slug':'ibuki',
   'idle':dict(rot=.72,tx=1.8,ty=2.0,sx=.005,sy=.010),
   'walk':dict(rot=2.25,tx=4.3,ty=3.6,sx=.014,sy=.010,shear=.013),
   'back':dict(rot=1.9,tx=3.6,ty=3.0,sx=.012,sy=.008,shear=.010),
   'dash':dict(stretch=.082,squash=.040,rot=6.4,tx=12.8,ty=2.0,shear=.030),
   'jump':dict(stretch=.070,squash=.040,rot=4.0,tx=4.8,ty=11.0),
   'landing':dict(sx=.044,sy=.058,rot=.9,ty=4.8,rebound=3.5),
   'hit':dict(rot=5.7,tx=7.8,sy=.013,sx=.020),
 }
}

def bbox(im): return im.getchannel('A').getbbox() or (0,0,W,H)

def build(char,cfg):
    src=ROOT/f"public/art/combat-sprites-hq/{cfg['slug']}.webp"
    outdir=ROOT/f"public/art/animation-hq/{cfg['slug']}"; outdir.mkdir(parents=True,exist_ok=True)
    base=Image.open(src).convert('RGBA'); assert base.size==(W,H)
    b=bbox(base); cx=(b[0]+b[2])/2; fy=b[3]
    def transform(scale_x=1,scale_y=1,rotate=0,tx=0,ty=0,shear=0):
        pad=96; canvas=Image.new('RGBA',(W+pad*2,H+pad*2),(0,0,0,0)); canvas.alpha_composite(base,(pad,pad))
        rw=max(1,round(canvas.width*scale_x)); rh=max(1,round(canvas.height*scale_y)); im=canvas.resize((rw,rh),Image.Resampling.LANCZOS)
        if abs(shear)>1e-6:
            sh=math.tan(shear); extra=abs(int(sh*rh))+8; coeff=(1,sh,-min(0,int(sh*rh)),0,1,0)
            im=im.transform((rw+extra,rh),Image.Transform.AFFINE,coeff,resample=Image.Resampling.BICUBIC)
        im=im.rotate(rotate,resample=Image.Resampling.BICUBIC,expand=True)
        rb=bbox(im); rcx=(rb[0]+rb[2])/2; rfy=rb[3]
        out=Image.new('RGBA',(W,H),(0,0,0,0)); out.alpha_composite(im,(round(cx+tx-rcx),round(fy+ty-rfy))); return out
    def params(kind,i,n):
        p=i/max(1,n-1); cyc=2*math.pi*i/n
        if kind=='idle':
            c=cfg['idle']; return dict(scale_x=1+c['sx']*math.sin(cyc),scale_y=1+c['sy']*math.sin(cyc),rotate=c['rot']*math.sin(cyc),tx=c['tx']*math.sin(cyc),ty=-c['ty']*math.sin(cyc))
        if kind in ('walk','walk-back'):
            c=cfg['walk'] if kind=='walk' else cfg['back']; sign=1 if kind=='walk' else -1
            return dict(scale_x=1+c['sx']*abs(math.sin(cyc)),scale_y=1-c['sy']*abs(math.sin(cyc)),rotate=sign*c['rot']*math.sin(cyc),tx=sign*c['tx']*math.sin(cyc),ty=-c['ty']*abs(math.sin(cyc)),shear=sign*c['shear']*math.sin(cyc))
        if kind=='dash':
            c=cfg['dash']; drive=math.sin(math.pi*p); return dict(scale_x=1+c['stretch']*drive,scale_y=1-c['squash']*drive,rotate=-c['rot']*drive,tx=c['tx']*drive,ty=c['ty']*drive,shear=-c['shear']*drive)
        if kind=='jump':
            c=cfg['jump']; compression=math.sin((p/.28)*math.pi) if p<.28 else 0; rise=math.sin(math.pi*min(1,max(0,(p-.15)/.48)))
            return dict(scale_x=1-c['squash']*rise+.04*compression,scale_y=1+c['stretch']*rise-.055*compression,rotate=-c['rot']*math.sin(math.pi*p),tx=c['tx']*math.sin(math.pi*p),ty=-c['ty']*rise+3.0*compression)
        if kind=='landing':
            c=cfg['landing']; squash=math.sin(math.pi*min(1,p/.5)) if p<=.5 else 0; rebound=math.sin(math.pi*min(1,max(0,(p-.42)/.58)))
            return dict(scale_x=1+c['sx']*squash-.014*rebound,scale_y=1-c['sy']*squash+.022*rebound,rotate=c['rot']*squash-.55*rebound,tx=-.8*squash+.8*rebound,ty=c['ty']*squash-c['rebound']*rebound)
        if kind=='hit':
            c=cfg['hit']; recoil=math.sin(math.pi*min(1,p/.6)) if p<.6 else math.sin(math.pi*(1-p)/.4)*.3
            return dict(scale_x=1-c['sx']*recoil,scale_y=1+c['sy']*recoil,rotate=c['rot']*recoil,tx=-c['tx']*recoil,ty=1.0*recoil,shear=.014*recoil)
        return {}
    records=[]
    for name,n in SEQS.items():
        strip=Image.new('RGBA',(W*n,H),(0,0,0,0))
        for i in range(n): strip.alpha_composite(transform(**params(name,i,n)),(i*W,0))
        out=outdir/f'{name}.webp'; strip.save(out,'WEBP',lossless=True,method=6); data=out.read_bytes()
        records.append({'id':name,'frames':n,'frameSize':[W,H],'stripSize':[W*n,H],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest().upper(),'enabled':True,'renderMode':'full','poseAuthored':False})
    srcdata=src.read_bytes(); manifest={'candidate':'0.0.61-rc.36','character':char,'pipeline':'rc36-high-frame-pilot-v1','source':'approved RC34 HQ original','sourcePath':f"/art/combat-sprites-hq/{cfg['slug']}.webp",'sourceSize':[W,H],'sourceSha256':hashlib.sha256(srcdata).hexdigest().upper(),'frameTotal':57,'enabledFrameTotal':57,'fullFrameTotal':57,'bridgeFrameTotal':0,'records':records}
    (outdir/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    return sum(r['bytes'] for r in records)

for char,cfg in CONFIG.items():
    print(char, build(char,cfg))
