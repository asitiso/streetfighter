from __future__ import annotations
from pathlib import Path
from PIL import Image
import importlib.util
import json

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/install-authored-ken-sequence.py'
spec=importlib.util.spec_from_file_location('installer',SCRIPT)
mod=importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(mod)

manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
records={r['id']:r for r in manifest['records']}
base=Image.open(ROOT/'public/art/combat-sprites-hq/ken.webp').convert('RGBA')

CASES=[]
for kind,count in [('dash',7),('jump',8),('landing',6)]:
    kim=Image.open(ROOT/f'public/art/animation-hq/ken/{kind}.webp').convert('RGBA')
    kframes=[kim.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(count)]
    kpose=mod.pose_qa(kframes,kind); ksem=mod.semantic_qa(kind,kframes,kpose)
    rec=records[kind]
    if rec.get('enabled') and rec.get('poseAuthored'):
        assert kpose['poseAuthoredPass'] is True, (kind,kpose)
        assert ksem['semanticQaPass'] is True, (kind,ksem)
        runtime_mode='authored-active'
    else:
        assert rec.get('enabled') is False, (kind,rec)
        assert kpose['poseAuthoredPass'] is False, (kind,kpose)
        assert ksem['semanticQaPass'] is False, (kind,ksem)
        runtime_mode='pilot-gated'

    # Invariant negative fixture: a repeated neutral frame must remain rejected
    # even after individual locomotion sequences are promoted.
    static=[base.copy() for _ in range(count)]
    npose=mod.pose_qa(static,kind); nsem=mod.semantic_qa(kind,static,npose)
    assert npose['poseAuthoredPass'] is False, (kind,npose)
    assert nsem['semanticQaPass'] is False, (kind,nsem)

    rim=Image.open(ROOT/f'public/art/animation-hq/ryu/{kind}.webp').convert('RGBA')
    rframes=[rim.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(count)]
    rpose=mod.pose_qa(rframes,kind); rsem=mod.semantic_qa(kind,rframes,rpose)
    assert rpose['poseAuthoredPass'] is True, (kind,rpose)
    assert rsem['semanticQaPass'] is True, (kind,rsem)
    CASES.append({
        'sequence':kind,
        'runtimeMode':runtime_mode,
        'kenPose':kpose,'kenSemantic':ksem,
        'negativeStaticPose':npose,'negativeStaticSemantic':nsem,
        'ryuPose':rpose,'ryuSemantic':rsem,
    })

report={'character':'KEN','verdict':'KEN_LOCOMOTION_SEMANTIC_QA_PASS','sequences':['dash','jump','landing'],'cases':CASES}
(ROOT/'RC39_KEN_LOCOMOTION_SEMANTIC_QA.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('KEN_LOCOMOTION_SEMANTIC_QA_PASS',json.dumps({
    c['sequence']:{'runtimeMode':c['runtimeMode'],'ken':c['kenSemantic']['semanticQaPass'],'ryu':c['ryuSemantic']['semanticQaPass']} for c in CASES
},ensure_ascii=False))
