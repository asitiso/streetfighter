from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np, json, hashlib
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
FRAME_W, FRAME_H = 384, 448

SEQS = {
    'jump': {
        'src': Path('/mnt/data/류_스타일_무술가의_8프레임_점프_공격_모션_시트.png'),
        'cols': 4, 'rows': 2, 'count': 8,
        'target_h': 326, 'center_x': 190,
        'preview': ROOT/'RC38_RYU_JUMP_8F_PREVIEW.png',
        'metric': ROOT/'RC38_RYU_JUMP_8F_METRICS.json',
        'transparent': True,
    },
    'landing': {
        'src': Path('/mnt/data/류_스타일_착지와_회복_6프레임_스프라이트_시트.png'),
        'cols': 3, 'rows': 2, 'count': 6,
        'target_h': 342, 'center_x': 188,
        'preview': ROOT/'RC38_RYU_LANDING_6F_PREVIEW.png',
        'metric': ROOT/'RC38_RYU_LANDING_6F_METRICS.json',
        'transparent': False,
    },
}

def extract_component(cell: np.ndarray, transparent: bool) -> tuple[Image.Image, dict]:
    if transparent:
        mask = cell[...,3] > 8
    else:
        rgb = cell[...,:3].astype(np.int16)
        lum = 0.2126*rgb[...,0] + 0.7152*rgb[...,1] + 0.0722*rgb[...,2]
        sat = rgb.max(axis=2) - rgb.min(axis=2)
        # Black presentation background -> transparent; keep colored/bright character pixels.
        mask = (lum > 26) | (sat > 12)
    mask[:2,:]=False; mask[-2:,:]=False; mask[:,:2]=False; mask[:,-2:]=False
    labels, n = ndimage.label(mask)
    comps=[]
    for i,s in enumerate(ndimage.find_objects(labels),1):
        if s is None: continue
        ys,xs=s
        area=int((labels[ys,xs]==i).sum())
        if area < 500: continue
        x0,x1=xs.start,xs.stop; y0,y1=ys.start,ys.stop
        comps.append((area,x0,y0,x1,y1,i))
    if not comps:
        raise RuntimeError('No body component found')
    comps.sort(key=lambda t:t[0], reverse=True)
    area,mx0,my0,mx1,my1,main_i=comps[0]
    union=labels==main_i
    for area2,x0,y0,x1,y1,i2 in comps[1:]:
        near = not (x1 < mx0-28 or x0 > mx1+28 or y1 < my0-28 or y0 > my1+28)
        if near:
            union |= labels==i2
    ys,xs=np.where(union)
    bx0,bx1=int(xs.min()),int(xs.max()+1); by0,by1=int(ys.min()),int(ys.max()+1)
    crop=cell[by0:by1,bx0:bx1].copy()
    alpha = crop[...,3] if transparent else np.full(crop.shape[:2],255,dtype=np.uint8)
    crop[...,3]=np.where(union[by0:by1,bx0:bx1], alpha, 0).astype(np.uint8)
    return Image.fromarray(crop,'RGBA'), {
        'bbox':[bx0,by0,bx1,by1],
        'centerX':(bx0+bx1)/2,
        'centerY':(by0+by1)/2,
        'bottomGap':cell.shape[0]-by1,
    }

def render_sequence(kind:str,cfg:dict):
    src=Image.open(cfg['src']).convert('RGBA')
    a=np.array(src)
    cw=src.width/cfg['cols']; ch=src.height/cfg['rows']
    frames=[]; heights=[]
    for i in range(cfg['count']):
        r=i//cfg['cols']; c=i%cfg['cols']
        x0=int(round(c*cw)); x1=int(round((c+1)*cw))
        y0=int(round(r*ch)); y1=int(round((r+1)*ch))
        cell=a[y0:y1,x0:x1].copy()
        im,meta=extract_component(cell,cfg['transparent'])
        meta['grid']=[r,c]
        frames.append((im,meta))
        heights.append(im.height)
    scale=cfg['target_h']/float(np.median(heights))
    ref_center_x=np.mean([m['centerX'] for _,m in frames])
    ref_gap=np.mean([m['bottomGap'] for _,m in frames])

    strip=Image.new('RGBA',(FRAME_W*cfg['count'],FRAME_H),(0,0,0,0))
    preview=Image.new('RGBA',(FRAME_W*cfg['cols'],FRAME_H*cfg['rows']),(16,18,24,255))
    draw=ImageDraw.Draw(preview)
    metrics=[]
    # jump midair frames align around common torso/root zone; grounded transition frames bottom-align.
    midair = {2,3,4,5} if kind=='jump' else set()
    target_center_y = 245
    baseline = 422
    for i,(im,m) in enumerate(frames):
        sw=max(1,int(round(im.width*scale))); sh=max(1,int(round(im.height*scale)))
        im=im.resize((sw,sh),Image.Resampling.LANCZOS)
        dx=(m['centerX']-ref_center_x)*scale*0.20
        px=int(round(cfg['center_x']+dx-sw/2))
        if i in midair:
            py=int(round(target_center_y-sh/2))
        else:
            # first/last phases stay grounded/near-ground for clean transitions
            dy=(m['bottomGap']-ref_gap)*scale*0.15
            py=int(round(baseline-sh-dy))
        dest=Image.new('RGBA',(FRAME_W,FRAME_H),(0,0,0,0))
        dest.alpha_composite(im,(px,py))
        strip.alpha_composite(dest,(i*FRAME_W,0))
        gx=(i%cfg['cols'])*FRAME_W; gy=(i//cfg['cols'])*FRAME_H
        preview.alpha_composite(dest,(gx,gy))
        draw.rectangle((gx,gy,gx+FRAME_W-1,gy+FRAME_H-1),outline=(85,90,120,255),width=1)
        draw.text((gx+10,gy+10),f'{i+1:02d}',fill=(245,245,255,255))
        alpha=np.array(dest.getchannel('A')); nz=np.argwhere(alpha>0)
        bbox=None
        if len(nz):
            yy0,xx0=nz.min(axis=0); yy1,xx1=nz.max(axis=0)
            bbox=[int(xx0),int(yy0),int(xx1+1),int(yy1+1)]
        metrics.append({'frame':i+1,'grid':m['grid'],'sourceBBox':m['bbox'],'paste':[px,py],'scaledSize':[sw,sh],'outputBBox':bbox})
    out=ROOT/f'public/art/animation-hq/ryu/{kind}.webp'
    strip.save(out,format='WEBP',lossless=True,quality=100,method=6)
    preview.save(cfg['preview'])
    raw=out.read_bytes()
    report={'source':str(cfg['src']),'output':str(out),'frames':cfg['count'],'frameSize':[FRAME_W,FRAME_H],'scale':scale,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest().upper(),'metrics':metrics}
    cfg['metric'].write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report

reports={k:render_sequence(k,v) for k,v in SEQS.items()}

manifest_path=ROOT/'public/art/animation-hq/ryu/manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for rec in manifest['records']:
    if rec['id'] in reports:
        rep=reports[rec['id']]
        rec['frames']=rep['frames']; rec['frameSize']=[FRAME_W,FRAME_H]; rec['stripSize']=[FRAME_W*rep['frames'],FRAME_H]
        rec['bytes']=rep['bytes']; rec['sha256']=rep['sha256']; rec['enabled']=True; rec['renderMode']='full'; rec['poseAuthored']=True
manifest['frameTotal']=sum(r['frames'] for r in manifest['records'])
manifest['enabledFrameTotal']=sum(r['frames'] for r in manifest['records'] if r.get('enabled'))
manifest['fullFrameTotal']=sum(r['frames'] for r in manifest['records'] if r.get('enabled') and r.get('renderMode')=='full')
manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')

lib=ROOT/'src/render/AnimationSequenceLibrary.ts'
text=lib.read_text(encoding='utf-8')
text=text.replace("{ id:'RYU_JUMP_HQ', characterId:'RYU', kind:'jump', asset:'/art/animation-hq/ryu/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:15, loop:false, timing:'ease-in', footLock:false, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },",
                  "{ id:'RYU_JUMP_HQ', characterId:'RYU', kind:'jump', asset:'/art/animation-hq/ryu/jump.webp', frameCount:8, frameWidth:384, frameHeight:448, fps:15, loop:false, timing:'ease-in', footLock:false, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },")
text=text.replace("{ id:'RYU_LANDING_HQ', characterId:'RYU', kind:'landing', asset:'/art/animation-hq/ryu/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:true, enabled:false, renderMode:'full', poseAuthored:false, quality:'hq', source:'approved-hq-pilot' },",
                  "{ id:'RYU_LANDING_HQ', characterId:'RYU', kind:'landing', asset:'/art/animation-hq/ryu/landing.webp', frameCount:6, frameWidth:384, frameHeight:448, fps:18, loop:false, timing:'ease-out', footLock:true, enabled:true, renderMode:'full', poseAuthored:true, quality:'hq', source:'authored-hq' },")
text=text.replace('export const RYU_RC36_ENABLED_FRAME_TOTAL = 27;','export const RYU_RC36_ENABLED_FRAME_TOTAL = 41;')
text=text.replace('export const RYU_RC36_FULL_FRAME_TOTAL = 27;','export const RYU_RC36_FULL_FRAME_TOTAL = 41;')
lib.write_text(text,encoding='utf-8')

# verify-animation patch
vp=ROOT/'scripts/verify-animation-sequences.mjs'
vt=vp.read_text(encoding='utf-8')
vt=vt.replace('assert.equal(manifest.enabledFrameTotal, 27);','assert.equal(manifest.enabledFrameTotal, 41);')
vt=vt.replace('assert.equal(manifest.fullFrameTotal, 27);','assert.equal(manifest.fullFrameTotal, 41);')
vt=vt.replace("assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 27);","assert.equal(enabledAnimationSequenceFrameTotal('RYU'), 41);")
vt=vt.replace("for (const kind of ['walk-back','jump','landing','stand-light','stand-heavy','hit','hadoken','shoryuken']) {","for (const kind of ['walk-back','stand-light','stand-heavy','hit','hadoken','shoryuken']) {")
anchor="assert.equal(manifest.records.find((record) => record.id === 'dash')?.enabled, true);"
extra="""\nassert.equal(animationSequenceFor('RYU','jump')?.enabled, true);\nassert.equal(animationSequenceFor('RYU','jump')?.poseAuthored, true);\nassert.equal(animationSequenceFor('RYU','jump')?.source, 'authored-hq');\nassert.equal(animationSequenceFor('RYU','landing')?.enabled, true);\nassert.equal(animationSequenceFor('RYU','landing')?.poseAuthored, true);\nassert.equal(animationSequenceFor('RYU','landing')?.source, 'authored-hq');"""
if "animationSequenceFor('RYU','jump')?.poseAuthored, true" not in vt:
    vt=vt.replace(anchor,anchor+extra)
vp.write_text(vt,encoding='utf-8')

vp2=ROOT/'scripts/verify-v062-rc37.mjs'
text2=vp2.read_text(encoding='utf-8')
text2=text2.replace('highFrameEnabledFrameTotal: 27,','highFrameEnabledFrameTotal: 41,')
text2=text2.replace('highFrameFullFrameTotal: 27,','highFrameFullFrameTotal: 41,')
text2=text2.replace("highFrameRuntimeSequences: ['idle','walk','dash'],","highFrameRuntimeSequences: ['idle','walk','dash','jump','landing'],")
text2=text2.replace("highFrameStagingSequences: ['walk-back','jump','landing','hit','stand-light','stand-heavy','hadoken','shoryuken'],","highFrameStagingSequences: ['walk-back','hit','stand-light','stand-heavy','hadoken','shoryuken'],")
vp2.write_text(text2,encoding='utf-8')

print(json.dumps(reports,indent=2))
