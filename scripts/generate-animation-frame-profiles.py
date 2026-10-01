from __future__ import annotations
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/render/AnimationFrameProfiles.ts'
W, H = 384, 448
COUNTS = {'idle':6,'walk':12,'walk-back':10,'dash':7,'jump':8,'landing':6,'stand-light':7,'stand-heavy':10,'hit':8,'hadoken':12,'shoryuken':12}
CHARACTERS = {
    'RYU': {'dir':'ryu', 'kinds':['idle','walk','walk-back','dash','jump','landing','stand-light','stand-heavy','hit','hadoken','shoryuken'], 'lockScale':1.0},
    'KEN': {'dir':'ken', 'kinds':['idle','walk','walk-back','dash','jump','landing','hit'], 'lockScale':.9},
    'CHUNLI': {'dir':'chunli', 'kinds':['idle','walk','walk-back','dash','jump','landing','hit'], 'lockScale':.88},
    'IBUKI': {'dir':'ibuki', 'kinds':['idle','walk','walk-back','dash','jump','landing','hit'], 'lockScale':.72},
}
WEIGHTS = {
    'idle':[1.35,1,.9,1,.95,1.4], 'walk':[1.18,.9,.82,.9,1.08,1.22,1.18,.9,.82,.9,1.08,1.22],
    'walk-back':[1.2,.92,.84,.94,1.12,1.2,.92,.84,.94,1.12], 'dash':[1.22,.82,.72,.72,.82,1,1.34],
    'jump':[1.18,.92,.86,1.05,1.36,1.02,.9,1.18], 'landing':[1.1,.78,1.18,.92,1.08,1.42],
    'stand-light':[1.05,.8,.72,1.18,.82,1,1.32], 'stand-heavy':[1.08,.9,.8,.72,.7,1.32,.82,.92,1.05,1.35],
    'hit':[1,.72,.78,1.2,.92,.95,1.05,1.35], 'hadoken':[1,.9,.82,.78,.76,.72,1.24,.82,.86,.94,1.08,1.34],
    'shoryuken':[1,.86,.78,.72,.7,1.24,.78,.8,.88,.96,1.08,1.35],
}
LOCK = {'idle':.72,'walk':.48,'walk-back':.52,'dash':.24,'jump':0,'landing':.9,'stand-light':.72,'stand-heavy':.68,'hit':.32,'hadoken':.7,'shoryuken':.26}

def contact_anchor(frame: Image.Image) -> tuple[float,float]:
    a=np.asarray(frame.getchannel('A')); ys,xs=np.where(a>20)
    if len(xs)==0: return W/2,H-1
    bottom=int(ys.max()); band=ys>=bottom-5; bx=xs[band]; by=ys[band]; wt=a[by,bx].astype(np.float64)+1
    return (float(np.average(bx,weights=wt)) if len(bx) else float(xs.mean()), float(bottom))

lines=["export interface AnimationFrameProfile {","  weights: readonly number[];","  anchorX: readonly number[];","  anchorY: readonly number[];","  footLockStrength: number;","}","","const PROFILES: Readonly<Record<string, AnimationFrameProfile>> = {"]
for char,cfg in CHARACTERS.items():
    anim=ROOT/'public/art/animation-hq'/cfg['dir']
    for name in cfg['kinds']:
        count=COUNTS[name]; strip=Image.open(anim/f'{name}.webp').convert('RGBA'); assert strip.size==(W*count,H),(char,name,strip.size)
        anchors=[contact_anchor(strip.crop((i*W,0,(i+1)*W,H))) for i in range(count)]
        bx,by=anchors[0]
        dx=[max(-10,min(10,bx-x)) for x,y in anchors]; dy=[max(-8,min(8,by-y)) for x,y in anchors]
        weights=WEIGHTS[name]; assert len(weights)==count
        fmt=lambda arr:', '.join(f'{v:.3f}' for v in arr)
        lines += [f"  '{char}:{name}': {{",f"    weights: [{fmt(weights)}],",f"    anchorX: [{fmt(dx)}],",f"    anchorY: [{fmt(dy)}],",f"    footLockStrength: {LOCK[name]*cfg['lockScale']:.3f},","  },"]
lines += ["};","","const DEFAULT: AnimationFrameProfile = { weights:[1], anchorX:[0], anchorY:[0], footLockStrength:0 };","","export function animationFrameProfile(characterId: string, kind: string): AnimationFrameProfile {","  return PROFILES[`${characterId}:${kind}`] ?? DEFAULT;","}","","export function animationFrameProfileDigest(characterId: string, kind: string): string {","  const p = animationFrameProfile(characterId, kind);","  return `${p.weights.length}:${p.footLockStrength.toFixed(2)}:${p.anchorX.map((v)=>v.toFixed(1)).join(',')}:${p.anchorY.map((v)=>v.toFixed(1)).join(',')}`;","}",""]
OUT.write_text('\n'.join(lines),encoding='utf-8')
print(OUT)
