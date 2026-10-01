from __future__ import annotations
from pathlib import Path
import importlib.util
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/install-authored-ken-sequence.py'
spec=importlib.util.spec_from_file_location('installer',SCRIPT)
mod=importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(mod)


def strip_frames(path: Path, count: int):
    im=Image.open(path).convert('RGBA')
    return [im.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(count)]

# Runtime validation must support both legitimate states of the staged rollout:
# 1) old transform pilot remains gated; 2) a real authored walk has been promoted.
manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
record=next(r for r in manifest['records'] if r['id']=='walk')
frames=strip_frames(ROOT/'public/art/animation-hq/ken/walk.webp',12)
pose=mod.pose_qa(frames,'walk')
sem=mod.walk_semantic_qa(frames,pose)
if record.get('enabled') and record.get('poseAuthored'):
    assert pose['poseAuthoredPass'] is True, pose
    assert sem['semanticQaPass'] is True, sem
    assert sem['checks']['oppositeContactDifferent'] is True, sem
    runtime_mode='authored-active'
else:
    assert record.get('enabled') is False, record
    assert pose['poseAuthoredPass'] is False, pose
    assert sem['semanticQaPass'] is False, sem
    assert sem['checks']['oppositeContactDifferent'] is False, sem
    runtime_mode='pilot-gated'

# Keep an invariant negative fixture so promotion cannot weaken transform/static rejection.
base=Image.open(ROOT/'public/art/combat-sprites-hq/ken.webp').convert('RGBA')
static=[base.copy() for _ in range(12)]
static_pose=mod.pose_qa(static,'walk')
static_sem=mod.walk_semantic_qa(static,static_pose)
assert static_pose['poseAuthoredPass'] is False, static_pose
assert static_sem['semanticQaPass'] is False, static_sem
assert static_sem['checks']['oppositeContactDifferent'] is False, static_sem

# The authored Ryu pilot remains an independent known-good cadence reference.
rf=strip_frames(ROOT/'public/art/animation-hq/ryu/walk.webp',12)
rpose=mod.pose_qa(rf,'walk')
rsem=mod.walk_semantic_qa(rf,rpose)
assert rpose['poseAuthoredPass'] is True, rpose
assert rsem['semanticQaPass'] is True, rsem

report={
  'character':'KEN','sequence':'walk','runtimeMode':runtime_mode,
  'runtimePoseQa':pose,'runtimeSemanticQa':sem,
  'negativeStaticPoseQa':static_pose,'negativeStaticSemanticQa':static_sem,
  'ryuReferencePoseQa':rpose,'ryuReferenceSemanticQa':rsem,
}
(ROOT/'RC39_KEN_WALK_SEMANTIC_QA.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('KEN_WALK_SEMANTIC_QA_PASS', json.dumps({
  'runtimeMode':runtime_mode,
  'kenOppositeContactIoU':sem['oppositeContactIoU'],
  'kenFootCenterRange':sem['footCenterRange'],
  'kenResidualAverage':sem['residualAverage'],
  'ryuOppositeContactIoU':rsem['oppositeContactIoU'],
}, ensure_ascii=False))
