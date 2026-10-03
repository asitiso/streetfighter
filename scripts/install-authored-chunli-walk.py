"""Preview/install Chun-Li authored movement using the existing motion gates."""
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
    parser.add_argument('kind', nargs='?', default='walk', choices=['walk', 'walk-back', 'dash'])
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--runtime', action='store_true', help='Verify the installed runtime strip without modifying files.')
    args = parser.parse_args()
    if args.install and args.runtime:
        parser.error('--install and --runtime cannot be combined')
    motion = load_module('authored_motion', 'install-authored-ken-sequence.py')
    handoff = load_module('authored_handoff', 'audit-ken-handoff-semantics.py')
    kind = args.kind
    count = motion.EXPECTED[kind]
    label = kind.upper().replace('-', '_')
    source = ROOT / f'art-source/chunli/inbox/{kind}'
    runtime = ROOT / f'public/art/animation-hq/chunli/{kind}.webp'
    manifest_path = runtime.parent / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    record = next(r for r in manifest['records'] if r['id'] == kind)
    if args.runtime:
        strip = Image.open(runtime).convert('RGBA')
        if strip.size != (384 * count, 448):
            raise SystemExit(f'CHUNLI {kind}: unexpected runtime dimensions')
        frames = [strip.crop((i*384, 0, (i+1)*384, 448)) for i in range(count)]
        if not record['enabled'] or not record['poseAuthored']:
            raise SystemExit(f'CHUNLI {kind}: runtime is not authored and enabled')
        if record['sha256'] != hashlib.sha256(runtime.read_bytes()).hexdigest().upper():
            raise SystemExit(f'CHUNLI {kind}: runtime checksum mismatch')
    else:
        paths = sorted(source.glob('[0-9][0-9].png'))
        if [p.name for p in paths] != [f'{i:02d}.png' for i in range(1, count + 1)]:
            raise SystemExit(f'CHUNLI {kind}: provide exactly 01.png through {count:02d}.png')
        frames, metrics = motion.normalize_frames(kind, [Image.open(p).convert('RGBA') for p in paths])
    pose = motion.pose_qa(frames, kind)
    semantic = motion.semantic_qa(kind, frames, pose)
    master = handoff.alpha_mask(Image.open(ROOT / 'public/art/combat-sprites-hq/chunli.webp'))
    start_limits = handoff.DASH_START_LIMITS if kind == 'dash' else handoff.WALK_BACK_BASE_LIMITS
    end_limits = handoff.DASH_END_LIMITS if kind == 'dash' else handoff.WALK_BACK_BASE_LIMITS
    start = handoff.compare_motion_bridge(master, handoff.alpha_mask(frames[0]), start_limits)
    end = handoff.compare_motion_bridge(handoff.alpha_mask(frames[-1]), master, end_limits)
    # Preserve the walking report names for existing consumers.
    start_key = 'baseToDash' if kind == 'dash' else 'baseToWalk'
    end_key = 'dashToBase' if kind == 'dash' else 'walkToBase'
    passed = pose['poseAuthoredPass'] and semantic['semanticQaPass'] and start['pass'] and end['pass']
    report = {'character':'CHUNLI', 'sequence':kind, 'source':source.relative_to(ROOT).as_posix(),
              'poseQa':pose, 'semanticQa':semantic, start_key:start, end_key:end, 'pass':passed}
    if not args.runtime:
        candidate = ROOT / f'art-source/chunli/authored-candidates/{kind}.webp'
        candidate.parent.mkdir(parents=True, exist_ok=True)
        motion.make_strip(frames).save(candidate, 'WEBP', lossless=True, quality=100, method=4)
        motion.make_preview(f'chunli {kind}', frames, ROOT / f'CHUNLI_{label}_AUTHORED_PREVIEW.png')
        report['metrics'] = metrics
        (ROOT / f'CHUNLI_{label}_AUTHORED_QA.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)
    if args.install:
        registry = ROOT / 'src/render/AnimationSequenceLibrary.ts'
        text = registry.read_text(encoding='utf-8')
        lines = text.splitlines()
        matches = [i for i, line in enumerate(lines) if "characterId:'CHUNLI'" in line and f"kind:'{kind}'" in line]
        if len(matches) != 1:
            raise SystemExit(f'CHUNLI {kind}: registry entry is not unique')
        index = matches[0]
        line = re.sub(r'enabled:(?:true|false)', 'enabled:true', lines[index], count=1)
        line = re.sub(r'poseAuthored:(?:true|false)', 'poseAuthored:true', line, count=1)
        lines[index] = re.sub(r"source:'[^']+'", "source:'authored-hq'", line, count=1)
        data = candidate.read_bytes()
        record.update({'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest().upper(),
                       'enabled':True, 'poseAuthored':True, 'stagingOnly':False,
                       'authoredSource':report['source'], 'poseQa':pose, 'semanticQa':semantic,
                       'handoffQa':{start_key:start, end_key:end}})
        manifest['pipeline'] = 'rc40-chunli-authored-gated-v1'
        manifest['enabledFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'])
        manifest['fullFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'] and r['renderMode']=='full')
        shutil.copyfile(candidate, runtime)
        registry.write_text('\n'.join(lines)+'\n', encoding='utf-8')
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        print(f'CHUNLI_AUTHORED_{label}_INSTALLED')
    elif args.runtime:
        print(f'CHUNLI_AUTHORED_{label}_VERIFY_PASS')


if __name__ == '__main__':
    main()
