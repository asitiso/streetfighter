from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import importlib.util, json

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/install-authored-ken-sequence.py'
spec=importlib.util.spec_from_file_location('installer',SCRIPT)
mod=importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(mod)
W,H=mod.FRAME_W,mod.FRAME_H


def fighter(cx=192, lean=0, crouch=0, lead=-35, rear=35, arm=0, headx=0):
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    hipy=270+crouch; shx=cx+lean; shy=160+crouch//3; base=423
    d.polygon([(shx-48,shy),(shx+43,shy+3),(cx+35,hipy),(cx-38,hipy)],fill=(255,255,255,255))
    d.ellipse((shx-20+headx,shy-55,shx+20+headx,shy-15),fill=(255,255,255,255))
    d.line((shx-35,shy+35,shx-70-arm,shy+75+arm//4),fill=(255,255,255,255),width=22)
    d.ellipse((shx-80-arm,shy+65+arm//4,shx-58-arm,shy+87+arm//4),fill=(255,255,255,255))
    d.line((shx+32,shy+35,shx+62+arm,shy+65-arm//5),fill=(255,255,255,255),width=22)
    d.ellipse((shx+52+arm,shy+55-arm//5,shx+76+arm,shy+79-arm//5),fill=(255,255,255,255))
    d.line((cx-20,hipy,cx+lead,base-20),fill=(255,255,255,255),width=30)
    d.ellipse((cx+lead-28,base-26,cx+lead+16,base),fill=(255,255,255,255))
    d.line((cx+20,hipy,cx+rear,base-18),fill=(255,255,255,255),width=30)
    d.ellipse((cx+rear-16,base-24,cx+rear+30,base),fill=(255,255,255,255))
    return im


def synthetic_walk_back():
    params=[
      (0,0,-45,38,0),(4,5,-38,48,5),(8,2,-24,60,8),(12,-2,-8,72,12),(7,3,12,60,5),
      (-4,5,38,-45,-5),(-8,6,48,-36,-7),(-11,2,62,-20,-10),(-7,-1,70,-5,-6),(-2,1,50,22,-2)
    ]
    return [fighter(lean=a,crouch=b,lead=c,rear=d,arm=e) for a,b,c,d,e in params]


def synthetic_hit():
    params=[
      (0,0,-35,35,0,0),(-8,10,-30,38,-10,-4),(-22,7,-28,46,-22,-8),(-38,4,-20,62,-32,-12),
      (-28,5,-8,72,-20,-8),(-18,3,-18,58,-12,-5),(-8,1,-28,44,-5,-2),(0,0,-35,35,0,0)
    ]
    return [fighter(lean=a,crouch=b,lead=c,rear=d,arm=e,headx=f) for a,b,c,d,e,f in params]


def authored_fixture_pose(kind):
    values = {'walk-back': (0.040998, 0.061409), 'hit': (0.014308, 0.028652)}
    avg, maximum = values[kind]
    avg_threshold, max_threshold = mod.POSE_THRESHOLDS.get(kind, (mod.FULL_POSE_AVG_THRESHOLD, mod.FULL_POSE_MAX_THRESHOLD))
    return {
        'affineResidualAverage': avg,
        'affineResidualMax': maximum,
        'fullPoseAverageThreshold': avg_threshold,
        'fullPoseMaxThreshold': max_threshold,
        'poseAuthoredPass': avg >= avg_threshold and maximum >= max_threshold,
    }


def runtime_frames(kind,count):
    im=Image.open(ROOT/f'public/art/animation-hq/ken/{kind}.webp').convert('RGBA')
    return [im.crop((i*W,0,(i+1)*W,H)) for i in range(count)]


manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
records={r['id']:r for r in manifest['records']}
cases=[]
for kind,count,good in [('walk-back',10,synthetic_walk_back()),('hit',8,synthetic_hit())]:
    current=runtime_frames(kind,count)
    runtime_pose=mod.pose_qa(current,kind); runtime_sem=mod.semantic_qa(kind,current,runtime_pose)
    rec=records[kind]
    if rec.get('enabled') and rec.get('poseAuthored'):
        assert runtime_pose['poseAuthoredPass'] is True, (kind,runtime_pose)
        assert runtime_sem['semanticQaPass'] is True, (kind,runtime_sem)
        runtime_mode='authored-active'
    else:
        assert rec.get('enabled') is False, (kind,rec)
        assert runtime_pose['poseAuthoredPass'] is False, (kind,runtime_pose)
        assert runtime_sem['semanticQaPass'] is False, (kind,runtime_sem)
        runtime_mode='pilot-gated'

    # Promotion must never weaken the invariant rejection of a static/transform-like sequence.
    base=Image.open(ROOT/'public/art/combat-sprites-hq/ken.webp').convert('RGBA')
    static=[base.copy() for _ in range(count)]
    negative_pose=mod.pose_qa(static,kind); negative_sem=mod.semantic_qa(kind,static,negative_pose)
    assert negative_pose['poseAuthoredPass'] is False, (kind,negative_pose)
    assert negative_sem['semanticQaPass'] is False, (kind,negative_sem)

    good_pose=authored_fixture_pose(kind); good_sem=mod.semantic_qa(kind,good,good_pose)
    assert good_pose['poseAuthoredPass'] is True, (kind,good_pose)
    assert good_sem['semanticQaPass'] is True, (kind,good_sem)
    cases.append({
        'sequence':kind,
        'runtimeMode':runtime_mode,
        'runtimePoseQa':runtime_pose,
        'runtimeSemanticQa':runtime_sem,
        'negativeStaticPoseQa':negative_pose,
        'negativeStaticSemanticQa':negative_sem,
        'syntheticAuthoredPose':good_pose,
        'syntheticAuthoredSemantic':good_sem,
    })

report={'character':'KEN','verdict':'KEN_WALKBACK_HIT_SEMANTIC_QA_PASS','sequences':['walk-back','hit'],'cases':cases}
(ROOT/'RC39_KEN_WALKBACK_HIT_SEMANTIC_QA.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('KEN_WALKBACK_HIT_SEMANTIC_QA_PASS',json.dumps({c['sequence']:{'runtimeMode':c['runtimeMode'],'runtimePass':c['runtimeSemanticQa']['semanticQaPass'],'authoredFixture':c['syntheticAuthoredSemantic']['semanticQaPass']} for c in cases}))
