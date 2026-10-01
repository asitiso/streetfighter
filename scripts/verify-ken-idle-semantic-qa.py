from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[1]
INSTALLER = ROOT / 'scripts/install-authored-ken-sequence.py'
spec = importlib.util.spec_from_file_location('ken_installer', INSTALLER)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)


def frame(arm_dx=0, chest_dy=0, head_dx=0, root_dx=0, foot_dx=0, right_foot_dx=0):
    im = Image.new('RGBA', (mod.FRAME_W, mod.FRAME_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # grounded legs and feet
    d.rectangle((144 + root_dx + foot_dx, 354, 177 + root_dx + foot_dx, 423), fill=(255,255,255,255))
    d.rectangle((205 + root_dx + right_foot_dx, 354, 238 + root_dx + right_foot_dx, 423), fill=(255,255,255,255))
    # stable torso with a little breathing room
    d.polygon([(154+root_dx, 210+chest_dy), (226+root_dx, 210+chest_dy), (239+root_dx, 350), (144+root_dx, 350)], fill=(255,255,255,255))
    d.ellipse((169+root_dx+head_dx, 150+chest_dy, 216+root_dx+head_dx, 206+chest_dy), fill=(255,255,255,255))
    # arms provide authored silhouette changes that cannot be explained by one affine transform
    d.line((156+root_dx, 236+chest_dy, 119+root_dx+arm_dx, 287+chest_dy), fill=(255,255,255,255), width=20)
    d.line((225+root_dx, 236+chest_dy, 271+root_dx-arm_dx, 278+chest_dy), fill=(255,255,255,255), width=20)
    return im


def authored_idle():
    return [
        frame(0,0,0),
        frame(5,-1,1),
        frame(12,-2,1),
        frame(6,-1,-1),
        frame(-4,0,-1),
        frame(0,0,0),
    ]


def fixture_pose(avg, maximum):
    avg_threshold, max_threshold = mod.POSE_THRESHOLDS['idle']
    return {
        'affineResidualAverage': avg,
        'affineResidualMax': maximum,
        'fullPoseAverageThreshold': avg_threshold,
        'fullPoseMaxThreshold': max_threshold,
        'poseAuthoredPass': avg >= avg_threshold and maximum >= max_threshold,
    }


def check(name, frames, pose, expect_pose=None, expect_semantic=None, failed_check=None):
    semantic = mod.idle_semantic_qa(frames, pose)
    if expect_pose is not None:
        assert pose['poseAuthoredPass'] is expect_pose, (name, pose)
    if expect_semantic is not None:
        assert semantic['semanticQaPass'] is expect_semantic, (name, semantic)
    if failed_check:
        assert semantic['checks'][failed_check] is False, (name, semantic)
    return {'name': name, 'pose': pose, 'semantic': semantic}


results = []
results.append(check('gentle-authored-loop', authored_idle(), fixture_pose(0.004409, 0.008592), True, True))
results.append(check('transform-like-static', [frame() for _ in range(6)], fixture_pose(0.0, 0.0), False, True))

wild = authored_idle()
wild[2] = frame(55, -18, 10, root_dx=26)
results.append(check('excessive-root-motion', wild, fixture_pose(0.007207, 0.022580), True, False, 'rootXStable'))

broken_loop = authored_idle()
broken_loop[-1] = frame(24, -4, 4, root_dx=12)
results.append(check('broken-loop-closure', broken_loop, fixture_pose(0.007225, 0.014078), True, False, 'loopClosure'))

foot_slide = authored_idle()
foot_slide[2] = frame(12, -2, 1, foot_dx=-25, right_foot_dx=25)
results.append(check('foot-slide', foot_slide, fixture_pose(0.012292, 0.048008), True, False, 'stanceWidthStable'))

report = {
    'character': 'KEN',
    'sequence': 'idle',
    'verdict': 'KEN_IDLE_SEMANTIC_QA_PASS',
    'idlePoseThresholds': mod.POSE_THRESHOLDS['idle'],
    'semanticLimits': mod.IDLE_SEMANTIC_LIMITS,
    'cases': results,
}
(ROOT / 'RC39_KEN_IDLE_SEMANTIC_QA.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('KEN_IDLE_SEMANTIC_QA_PASS', json.dumps({
    'poseThresholds': mod.POSE_THRESHOLDS['idle'],
    'loopIoUMin': mod.IDLE_SEMANTIC_LIMITS['loopIoUMin'],
    'cases': [r['name'] for r in results],
}))
