#!/usr/bin/env python3
"""Generate exact-pose HQ authoring guides from the current in-game sprites.

These guides are not runtime art. They preserve the authoritative silhouette,
facing, ground line, body center and pose so a newly authored HQ master can be
compared against the exact in-game source before approval.
"""
from __future__ import annotations
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / 'public/art/combat-sprites'
GUIDES = ROOT / 'art-source/hq-character-masters/guides'
GUIDES.mkdir(parents=True, exist_ok=True)
PILOTS = ('ryu','chunli','ken','ibuki')
MASTER_SIZE = (1024, 1280)
RUNTIME_SIZE = (384, 448)


def bbox_metrics(img: Image.Image):
    a = img.convert('RGBA').getchannel('A')
    bbox = a.getbbox()
    if not bbox:
        return {'bbox':[0,0,0,0],'centerX':0,'centerY':0,'groundY':0,'width':0,'height':0,'coverage':0}
    x0,y0,x1,y1=bbox
    return {
        'bbox':[x0,y0,x1,y1],
        'centerX':(x0+x1)/2,
        'centerY':(y0+y1)/2,
        'groundY':y1,
        'width':x1-x0,
        'height':y1-y0,
        'coverage':sum(1 for px in a.getdata() if px>20)/(img.width*img.height),
    }

records=[]
for slug in PILOTS:
    src=Image.open(SPRITES/f'{slug}.webp').convert('RGBA')
    metrics=bbox_metrics(src)
    # exact nearest-neighbour silhouette reference, large enough to trace/paint over
    scale=min((MASTER_SIZE[0]*0.68)/src.width,(MASTER_SIZE[1]*0.78)/src.height)
    enlarged=src.resize((round(src.width*scale),round(src.height*scale)),Image.Resampling.NEAREST)
    guide=Image.new('RGBA',MASTER_SIZE,(0,0,0,0))
    gx=(MASTER_SIZE[0]-enlarged.width)//2
    # preserve the source ground ratio exactly
    ground_ratio=metrics['groundY']/src.height
    target_ground=round(MASTER_SIZE[1]*0.91)
    gy=target_ground-round(metrics['groundY']*scale)
    guide.alpha_composite(enlarged,(gx,gy))

    # overlay alignment guides on a separate review image
    review=Image.new('RGBA',MASTER_SIZE,(20,22,28,255))
    ghost=guide.copy(); ghost.putalpha(ghost.getchannel('A').point(lambda a: round(a*.82)))
    review.alpha_composite(ghost)
    d=ImageDraw.Draw(review)
    center_x=MASTER_SIZE[0]//2
    d.line((center_x,0,center_x,MASTER_SIZE[1]),fill=(100,190,255,150),width=2)
    d.line((0,target_ground,MASTER_SIZE[0],target_ground),fill=(255,190,80,180),width=3)
    d.rectangle((gx,gy,gx+enlarged.width-1,gy+enlarged.height-1),outline=(140,255,160,170),width=2)
    d.text((24,24),f'{slug.upper()} EXACT-POSE AUTHORING GUIDE',fill='white')
    d.text((24,52),'Do not change facing, stance, limb angles, silhouette, ground line or center.',fill=(210,215,225))

    guide_path=GUIDES/f'{slug}_exactpose_reference.png'
    review_path=GUIDES/f'{slug}_exactpose_review.png'
    guide.save(guide_path,optimize=True)
    review.convert('RGB').save(review_path,quality=94)
    records.append({
        'character':slug.upper(),
        'authoritativeSource':f'public/art/combat-sprites/{slug}.webp',
        'sourceSize':list(src.size),
        'sourceMetrics':metrics,
        'masterGuide':str(guide_path.relative_to(ROOT)).replace('\\','/'),
        'reviewGuide':str(review_path.relative_to(ROOT)).replace('\\','/'),
        'runtimeContract':{
            'size':list(RUNTIME_SIZE),
            'groundTolerancePx':2,
            'centerTolerancePx':4,
            'heightToleranceRatio':0.05,
            'widthToleranceRatio':0.12,
            'minimumMaskIoU':0.62,
            'maximumMeanEdgeDistancePxAt192x224':5.0,
        }
    })

out={'pipeline':'exact-pose-hq-reference-v2','masterSize':list(MASTER_SIZE),'records':records}
(GUIDES/'EXACT_POSE_REFERENCE_METRICS.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps(out,indent=2))
