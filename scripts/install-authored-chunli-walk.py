"""Preview/install Chun-Li's 12F walk using the existing authored motion gates."""
from argparse import ArgumentParser
from pathlib import Path
import hashlib
import importlib.util
import json
import re
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--runtime', action='store_true', help='Verify the installed runtime strip without modifying files.')
    args = parser.parse_args()
    if args.install and args.runtime:
        parser.error('--install and --runtime cannot be combined')
    motion = load_module('authored_motion', 'install-authored-ken-sequence.py')
    handoff = load_module('authored_handoff', 'audit-ken-handoff-semantics.py')
    source = ROOT / 'art-source/chunli/inbox/walk'
    runtime = ROOT / 'public/art/animation-hq/chunli/walk.webp'
    manifest_path = runtime.parent / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    record = next(r for r in manifest['records'] if r['id'] == 'walk')
    if args.runtime:
        strip = Image.open(runtime).convert('RGBA')
        if strip.size != (384 * 12, 448):
            raise SystemExit('CHUNLI walk: unexpected runtime dimensions')
        frames = [strip.crop((i*384, 0, (i+1)*384, 448)) for i in range(12)]
        if not record['enabled'] or not record['poseAuthored']:
            raise SystemExit('CHUNLI walk: runtime is not authored and enabled')
        if record['sha256'] != hashlib.sha256(runtime.read_bytes()).hexdigest().upper():
            raise SystemExit('CHUNLI walk: runtime checksum mismatch')
    else:
        paths = sorted(source.glob('[0-9][0-9].png'))
        if [p.name for p in paths] != [f'{i:02d}.png' for i in range(1, 13)]:
            raise SystemExit('CHUNLI walk: provide exactly 01.png through 12.png')
        frames, metrics = motion.normalize_frames('walk', [Image.open(p).convert('RGBA') for p in paths])
    pose = motion.pose_qa(frames, 'walk')
    semantic = motion.walk_semantic_qa(frames, pose)
    master = handoff.alpha_mask(Image.open(ROOT / 'public/art/combat-sprites-hq/chunli.webp'))
    start = handoff.compare_motion_bridge(master, handoff.alpha_mask(frames[0]), handoff.WALK_BACK_BASE_LIMITS)
    end = handoff.compare_motion_bridge(handoff.alpha_mask(frames[-1]), master, handoff.WALK_BACK_BASE_LIMITS)
    passed = pose['poseAuthoredPass'] and semantic['semanticQaPass'] and start['pass'] and end['pass']
    report = {'character':'CHUNLI', 'sequence':'walk', 'source':'art-source/chunli/inbox/walk',
              'poseQa':pose, 'semanticQa':semantic, 'baseToWalk':start, 'walkToBase':end, 'pass':passed}
    if not args.runtime:
        candidate = ROOT / 'art-source/chunli/authored-candidates/walk.webp'
        candidate.parent.mkdir(parents=True, exist_ok=True)
        motion.make_strip(frames).save(candidate, 'WEBP', lossless=True, quality=100, method=4)
        motion.make_preview('chunli walk', frames, ROOT / 'CHUNLI_WALK_AUTHORED_PREVIEW.png')
        report['metrics'] = metrics
        (ROOT / 'CHUNLI_WALK_AUTHORED_QA.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)
    if args.install:
        registry = ROOT / 'src/render/AnimationSequenceLibrary.ts'
        text = registry.read_text(encoding='utf-8')
        lines = text.splitlines()
        matches = [i for i, line in enumerate(lines) if "characterId:'CHUNLI'" in line and "kind:'walk'" in line]
        if len(matches) != 1:
            raise SystemExit('CHUNLI walk: registry entry is not unique')
        index = matches[0]
        line = re.sub(r'enabled:(?:true|false)', 'enabled:true', lines[index], count=1)
        line = re.sub(r'poseAuthored:(?:true|false)', 'poseAuthored:true', line, count=1)
        lines[index] = re.sub(r"source:'[^']+'", "source:'authored-hq'", line, count=1)
        data = candidate.read_bytes()
        record.update({'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest().upper(),
                       'enabled':True, 'poseAuthored':True, 'stagingOnly':False,
                       'authoredSource':report['source'], 'poseQa':pose, 'semanticQa':semantic,
                       'handoffQa':{'baseToWalk':start, 'walkToBase':end}})
        manifest['pipeline'] = 'rc40-chunli-authored-gated-v1'
        manifest['enabledFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'])
        manifest['fullFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'] and r['renderMode']=='full')
        shutil.copyfile(candidate, runtime)
        registry.write_text('\n'.join(lines)+'\n', encoding='utf-8')
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print('CHUNLI_AUTHORED_WALK_INSTALLED')
    elif args.runtime:
        print('CHUNLI_AUTHORED_WALK_VERIFY_PASS')


if __name__ == '__main__':
    main()
