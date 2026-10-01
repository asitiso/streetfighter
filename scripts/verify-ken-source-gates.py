from __future__ import annotations
from pathlib import Path
import hashlib
import subprocess
import sys
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
WATCH=[
    ROOT/'public/art/animation-hq/ken/idle.webp',
    ROOT/'public/art/animation-hq/ken/manifest.json',
    ROOT/'src/render/AnimationSequenceLibrary.ts',
]

PREVIEW=ROOT/'RC39_KEN_IDLE_AUTHORED_PREVIEW.png'
CANDIDATE=ROOT/'art-source/ken/authored-candidates/idle.webp'

def snapshot(path:Path):
    return path.read_bytes() if path.exists() else None

def restore(path:Path,data):
    if data is None:
        path.unlink(missing_ok=True)
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(data)

def sha(path:Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(args:list[str]):
    return subprocess.run(args,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)

before={str(p):sha(p) for p in WATCH}
low=run([
    sys.executable,'scripts/install-authored-ken-sequence.py','idle',
    'art-source/ken/reference/ken-motion-overview-rc39.png',
    '--cols','8','--rows','1','--crop','8,116,300,94','--indices','1,2,3,5,6,8',
    '--dark-background','--preview-only'
])
if low.returncode == 0 or 'source body resolution too low' not in low.stdout:
    raise SystemExit(f'LOW_RES_GATE_FAIL return={low.returncode}\n{low.stdout[-2000:]}')

# Use an intentionally static but production-resolution transparent sheet. This
# exercises the real installer pose gate without spending minutes aligning a
# near-identical transformed runtime strip just to prove that static art fails.
fixture_path=ROOT/'art-source/ken/authored-candidates/.pose-gate-static-fixture.png'
fixture=Image.new('RGBA',(384*6,448),(0,0,0,0))
draw=ImageDraw.Draw(fixture)
for i in range(6):
    ox=i*384
    draw.rounded_rectangle((ox+145,72,ox+239,408),24,fill=(255,255,255,255))
    draw.ellipse((ox+164,38,ox+220,96),fill=(255,255,255,255))
    draw.rectangle((ox+154,392,ox+230,423),fill=(255,255,255,255))
fixture_path.parent.mkdir(parents=True,exist_ok=True)
fixture.save(fixture_path)
preview_before=snapshot(PREVIEW)
candidate_before=snapshot(CANDIDATE)
try:
    pose=run([
        sys.executable,'scripts/install-authored-ken-sequence.py','idle',
        str(fixture_path.relative_to(ROOT)),'--cols','6','--rows','1','--preview-only'
    ])
finally:
    fixture_path.unlink(missing_ok=True)
    restore(PREVIEW,preview_before)
    restore(CANDIDATE,candidate_before)
if pose.returncode != 2 or 'pose-variance-gate' not in pose.stdout or '"poseAuthoredPass": false' not in pose.stdout:
    raise SystemExit(f'POSE_GATE_FAIL return={pose.returncode}\n{pose.stdout[-3000:]}')

after={str(p):sha(p) for p in WATCH}
if before != after:
    raise SystemExit('GATE_MUTATION_FAIL: rejected candidates modified runtime/manifest/registry')

print('KEN_SOURCE_GATES_PASS', {
    'lowResRejected': True,
    'affinePilotRejected': True,
    'runtimeUnchanged': True,
})
