#!/usr/bin/env python3
"""Score an HQ candidate against the current in-game pose/silhouette.

Usage: check-hq-pose-fidelity.py CHARACTER candidate.png|webp [--json]
Exit code 0 means the candidate satisfies the exact-pose gate.
"""
from __future__ import annotations
import argparse, json, math
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
LIMITS={'groundTolerancePx':2,'centerTolerancePx':4,'heightToleranceRatio':0.05,'widthToleranceRatio':0.12,'minimumMaskIoU':0.62,'maximumMeanEdgeDistancePxAt192x224':5.0}

def mask_for(path:Path,size=(192,224)):
    im=Image.open(path).convert('RGBA').resize(size,Image.Resampling.LANCZOS)
    a=np.array(im.getchannel('A'))
    return a>=40

def metrics(mask):
    ys,xs=np.where(mask)
    if len(xs)==0: return {'bbox':[0,0,0,0],'centerX':0,'centerY':0,'groundY':0,'width':0,'height':0}
    x0,x1=int(xs.min()),int(xs.max()+1); y0,y1=int(ys.min()),int(ys.max()+1)
    return {'bbox':[x0,y0,x1,y1],'centerX':(x0+x1)/2,'centerY':(y0+y1)/2,'groundY':y1,'width':x1-x0,'height':y1-y0}

def mean_edge_distance(a,b):
    au=(a.astype(np.uint8)*255); bu=(b.astype(np.uint8)*255)
    ea=cv2.Canny(au,50,150)>0; eb=cv2.Canny(bu,50,150)>0
    if not ea.any() or not eb.any(): return 999.0
    dt_b=cv2.distanceTransform((~eb).astype(np.uint8),cv2.DIST_L2,3)
    dt_a=cv2.distanceTransform((~ea).astype(np.uint8),cv2.DIST_L2,3)
    return float((dt_b[ea].mean()+dt_a[eb].mean())/2)

ap=argparse.ArgumentParser(); ap.add_argument('character'); ap.add_argument('candidate'); ap.add_argument('--json',action='store_true'); args=ap.parse_args()
slug=args.character.lower(); src=ROOT/'public/art/combat-sprites'/f'{slug}.webp'; cand=Path(args.candidate)
ref=mask_for(src); got=mask_for(cand)
rm=metrics(ref); gm=metrics(got)
inter=np.logical_and(ref,got).sum(); union=np.logical_or(ref,got).sum(); iou=float(inter/union) if union else 0
edge=mean_edge_distance(ref,got)
height_delta=abs(gm['height']/max(1,rm['height'])-1); width_delta=abs(gm['width']/max(1,rm['width'])-1)
checks={
 'ground':abs(gm['groundY']-rm['groundY'])<=LIMITS['groundTolerancePx'],
 'center':abs(gm['centerX']-rm['centerX'])<=LIMITS['centerTolerancePx'],
 'height':height_delta<=LIMITS['heightToleranceRatio'],
 'width':width_delta<=LIMITS['widthToleranceRatio'],
 'maskIoU':iou>=LIMITS['minimumMaskIoU'],
 'edgeDistance':edge<=LIMITS['maximumMeanEdgeDistancePxAt192x224'],
}
result={'character':args.character.upper(),'reference':rm,'candidate':gm,'maskIoU':round(iou,4),'meanEdgeDistancePx':round(edge,3),'heightDeltaRatio':round(height_delta,4),'widthDeltaRatio':round(width_delta,4),'checks':checks,'pass':all(checks.values()),'limits':LIMITS}
print(json.dumps(result,indent=2))
raise SystemExit(0 if result['pass'] else 2)
