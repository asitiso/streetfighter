"""Preview/install Chun-Li authored movement using the existing motion gates."""
from argparse import ArgumentParser
from pathlib import Path
import hashlib
import importlib.util
import json
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('kind', nargs='?', default='walk', choices=['idle', 'walk', 'walk-back', 'dash', 'jump', 'landing', 'hit', 'stand-light', 'stand-heavy', 'hadoken', 'tatsumaki', 'shoryuken', 'super-rush', 'kikosho'])
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--runtime', action='store_true', help='Verify the installed runtime strip without modifying files.')
    args = parser.parse_args()
    if args.install and args.runtime:
        parser.error('--install and --runtime cannot be combined')
    motion = load_module('authored_motion', 'install-authored-ken-sequence.py')
    handoff = load_module('authored_handoff', 'audit-ken-handoff-semantics.py')
    kind = args.kind
    # Kikosho is a separate asset/registry identity with the same planted
    # two-palm charge/release/recovery motion requirements as projectile casting.
    qa_kind = 'hadoken' if kind == 'kikosho' else kind
    motion.EXPECTED['kikosho'] = motion.EXPECTED['hadoken']
    frame_width = 640 if kind in ('tatsumaki', 'super-rush', 'kikosho') else 384
    motion.FRAME_W = frame_width
    if kind == 'tatsumaki':
        # Horizontal gates use canvas pixels; retain their normalized limits
        # on the wider canvas needed for full-size inverted legs.
        motion.TATSUMAKI_SEMANTIC_LIMITS = dict(motion.TATSUMAKI_SEMANTIC_LIMITS)
        for key in ('centroidXRangeMin', 'centroidXRangeMax', 'extentWidthRangeMin', 'extentWidthRangeMax'):
            motion.TATSUMAKI_SEMANTIC_LIMITS[key] *= frame_width / 384
    if kind == 'kikosho':
        motion.HADOKEN_SEMANTIC_LIMITS = dict(motion.HADOKEN_SEMANTIC_LIMITS)
        for key in ('centroidXRangeMin', 'centroidXRangeMax', 'reachRangeMin', 'reachRangeMax', 'releaseReachDeltaMin', 'footCenterRangeMax'):
            motion.HADOKEN_SEMANTIC_LIMITS[key] *= frame_width / 384
    if kind == 'super-rush':
        # Preserve canvas-relative horizontal limits on the wide kicking canvas.
        motion.SUPER_RUSH_SEMANTIC_LIMITS = dict(motion.SUPER_RUSH_SEMANTIC_LIMITS)
        for key in ('centroidXRangeMin', 'centroidXRangeMax', 'reachRangeMin', 'reachRangeMax', 'footCenterRangeMax'):
            motion.SUPER_RUSH_SEMANTIC_LIMITS[key] *= frame_width / 384
    label = kind.upper().replace('-', '_')
    source = ROOT / f'art-source/chunli/inbox/{kind}'
    runtime = ROOT / f'public/art/animation-hq/chunli/{kind}.webp'
    manifest_path = runtime.parent / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    def load_frames(sequence_kind):
        sequence_count = motion.EXPECTED[sequence_kind]
        sequence_runtime = runtime.parent / f'{sequence_kind}.webp'
        if args.runtime:
            sequence_record = next(r for r in manifest['records'] if r['id'] == sequence_kind)
            strip = Image.open(sequence_runtime).convert('RGBA')
            if strip.size != (frame_width * sequence_count, 448):
                raise SystemExit(f'CHUNLI {sequence_kind}: unexpected runtime dimensions')
            if not sequence_record['enabled'] or not sequence_record['poseAuthored']:
                raise SystemExit(f'CHUNLI {sequence_kind}: runtime is not authored and enabled')
            if sequence_record['sha256'] != hashlib.sha256(sequence_runtime.read_bytes()).hexdigest().upper():
                raise SystemExit(f'CHUNLI {sequence_kind}: runtime checksum mismatch')
            return [strip.crop((i*frame_width, 0, (i+1)*frame_width, 448)) for i in range(sequence_count)], None
        sequence_source = ROOT / f'art-source/chunli/inbox/{sequence_kind}'
        paths = sorted(sequence_source.glob('[0-9][0-9].png'))
        if [p.name for p in paths] != [f'{i:02d}.png' for i in range(1, sequence_count + 1)]:
            raise SystemExit(f'CHUNLI {sequence_kind}: provide exactly 01.png through {sequence_count:02d}.png')
        normalized, source_metrics = motion.normalize_frames('hadoken' if sequence_kind == 'kikosho' else sequence_kind, [Image.open(p).convert('RGBA') for p in paths])
        if sequence_kind == 'jump':
            # Launch/contact share the grounded baseline; compression lifts
            # the feet 12px as the fighter leaves the ground.
            for index in (0, 1, sequence_count - 1):
                baseline = 411 if index == 1 else 423
                offset = baseline - normalized[index].getchannel('A').getbbox()[3]
                anchored = Image.new('RGBA', (384, 448))
                anchored.alpha_composite(normalized[index], (0, offset))
                normalized[index] = anchored
                source_metrics[index]['paste'][1] += offset
        return normalized, source_metrics

    frames, metrics = load_frames(kind)
    pose = motion.pose_qa(frames, qa_kind)
    semantic = motion.semantic_qa(qa_kind, frames, pose)
    master_image = Image.open(ROOT / 'public/art/combat-sprites-hq/chunli.webp').convert('RGBA')
    if frame_width != 384:
        padded = Image.new('RGBA', (frame_width, 448))
        padded.alpha_composite(master_image, ((frame_width - 384) // 2, 0))
        master_image = padded
    master = handoff.alpha_mask(master_image)
    if kind in ('jump', 'landing'):
        peer_kind = 'landing' if kind == 'jump' else 'jump'
        peer_frames, peer_metrics = load_frames(peer_kind)
        peer_pose = motion.pose_qa(peer_frames, peer_kind)
        peer_semantic = motion.semantic_qa(peer_kind, peer_frames, peer_pose)
        jump_frames = frames if kind == 'jump' else peer_frames
        landing_frames = frames if kind == 'landing' else peer_frames
        handoffs = {
            'baseToJump': handoff.compare_motion_bridge(master, handoff.alpha_mask(jump_frames[0]), handoff.JUMP_BASE_LIMITS),
            'jumpToLanding': handoff.compare_motion_bridge(handoff.alpha_mask(jump_frames[-1]), handoff.alpha_mask(landing_frames[0]), handoff.JUMP_LANDING_LIMITS),
            'landingToBase': handoff.compare_motion_bridge(handoff.alpha_mask(landing_frames[-1]), master, handoff.LANDING_END_LIMITS),
        }
        peer_pass = peer_pose['poseAuthoredPass'] and peer_semantic['semanticQaPass']
    else:
        start_limits = handoff.DASH_START_LIMITS if kind == 'dash' else handoff.WALK_BACK_BASE_LIMITS
        end_limits = handoff.DASH_END_LIMITS if kind == 'dash' else handoff.WALK_BACK_BASE_LIMITS
        start_key = 'baseToDash' if kind == 'dash' else 'baseToWalk'
        end_key = 'dashToBase' if kind == 'dash' else 'walkToBase'
        if kind == 'idle':
            start_limits = end_limits = handoff.MASTER_LIMITS
            start_key, end_key = 'baseToIdle', 'idleToBase'
        elif kind == 'hit':
            start_limits = end_limits = handoff.HIT_BASE_LIMITS
            start_key, end_key = 'baseToHit', 'hitToBase'
        elif kind == 'stand-light':
            start_limits = end_limits = handoff.STAND_LIGHT_BASE_LIMITS
            start_key, end_key = 'baseToAttack', 'attackToBase'
        elif kind == 'stand-heavy':
            start_limits = end_limits = handoff.STAND_HEAVY_BASE_LIMITS
            start_key, end_key = 'baseToAttack', 'attackToBase'
        elif kind in ('hadoken', 'kikosho'):
            start_limits = end_limits = handoff.HADOKEN_BASE_LIMITS
            start_key, end_key = 'baseToCast', 'castToBase'
        elif kind == 'shoryuken':
            start_limits = end_limits = handoff.SHORYUKEN_BASE_LIMITS
            start_key, end_key = 'baseToRise', 'riseToBase'
        elif kind == 'super-rush':
            start_limits = end_limits = handoff.SUPER_RUSH_BASE_LIMITS
            start_key, end_key = 'baseToRush', 'rushToBase'
        elif kind == 'tatsumaki':
            start_limits = end_limits = handoff.TATSUMAKI_BASE_LIMITS
            start_key, end_key = 'baseToSpin', 'spinToBase'
        handoffs = {
            start_key: handoff.compare_motion_bridge(master, handoff.alpha_mask(frames[0]), start_limits),
            end_key: handoff.compare_motion_bridge(handoff.alpha_mask(frames[-1]), master, end_limits),
        }
        peer_pass = True
    passed = pose['poseAuthoredPass'] and semantic['semanticQaPass'] and peer_pass and all(h['pass'] for h in handoffs.values())
    report = {'character':'CHUNLI', 'sequence':kind, 'source':source.relative_to(ROOT).as_posix(),
              'poseQa':pose, 'semanticQa':semantic, 'gateProfile':qa_kind, **handoffs, 'pass':passed}
    if kind in ('jump', 'landing'):
        report['pairedSequence'] = {'sequence':peer_kind, 'poseQa':peer_pose, 'semanticQa':peer_semantic, 'pass':peer_pass}
    promotions = [(kind, frames, metrics, pose, semantic, report)]
    if kind in ('jump', 'landing'):
        peer_report = {'character':'CHUNLI', 'sequence':peer_kind,
                       'source':f'art-source/chunli/inbox/{peer_kind}', 'poseQa':peer_pose,
                       'semanticQa':peer_semantic, **handoffs, 'pass':passed,
                       'pairedSequence':{'sequence':kind, 'poseQa':pose, 'semanticQa':semantic,
                                         'pass':pose['poseAuthoredPass'] and semantic['semanticQaPass']}}
        promotions.append((peer_kind, peer_frames, peer_metrics, peer_pose, peer_semantic, peer_report))
    if not args.runtime:
        for promoted_kind, promoted_frames, promoted_metrics, _, _, promoted_report in promotions:
            promoted_label = promoted_kind.upper().replace('-', '_')
            candidate = ROOT / f'art-source/chunli/authored-candidates/{promoted_kind}.webp'
            candidate.parent.mkdir(parents=True, exist_ok=True)
            motion.make_strip(promoted_frames).save(candidate, 'WEBP', lossless=True, quality=100, method=4)
            motion.make_preview(f'chunli {promoted_kind}', promoted_frames, ROOT / f'CHUNLI_{promoted_label}_AUTHORED_PREVIEW.png')
            promoted_report['metrics'] = promoted_metrics
            (ROOT / f'CHUNLI_{promoted_label}_AUTHORED_QA.json').write_text(json.dumps(promoted_report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)
    if args.install:
        registry = ROOT / 'src/render/AnimationSequenceLibrary.ts'
        text = registry.read_text(encoding='utf-8')
        lines = text.splitlines()
        pending = {}
        for promoted_kind, _, _, promoted_pose, promoted_semantic, promoted_report in promotions:
            matches = [i for i, line in enumerate(lines) if "characterId:'CHUNLI'" in line and f"kind:'{promoted_kind}'" in line]
            if len(matches) != 1:
                raise SystemExit(f'CHUNLI {promoted_kind}: registry entry is not unique')
            index = matches[0]
            line = re.sub(r'enabled:(?:true|false)', 'enabled:true', lines[index], count=1)
            line = re.sub(r'poseAuthored:(?:true|false)', 'poseAuthored:true', line, count=1)
            lines[index] = re.sub(r"source:'[^']+'", "source:'authored-hq'", line, count=1)
            data = (ROOT / f'art-source/chunli/authored-candidates/{promoted_kind}.webp').read_bytes()
            record = next((r for r in manifest['records'] if r['id'] == promoted_kind), None)
            if record is None:
                count = motion.EXPECTED[promoted_kind]
                record = {'id':promoted_kind, 'frames':count, 'frameSize':[384,448],
                          'stripSize':[384*count,448], 'renderMode':'full'}
                manifest['records'].append(record)
            record.update({'frameSize':[frame_width,448], 'stripSize':[frame_width*record['frames'],448], 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest().upper(),
                           'enabled':True, 'poseAuthored':True, 'stagingOnly':False,
                           'authoredSource':promoted_report['source'], 'poseQa':promoted_pose,
                           'semanticQa':promoted_semantic, 'handoffQa':handoffs})
            pending[runtime.parent / f'{promoted_kind}.webp'] = data
        manifest['pipeline'] = 'rc40-chunli-authored-gated-v1'
        manifest['frameTotal'] = sum(r['frames'] for r in manifest['records'])
        manifest['enabledFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'])
        manifest['fullFrameTotal'] = sum(r['frames'] for r in manifest['records'] if r['enabled'] and r['renderMode']=='full')
        pending[registry] = ('\n'.join(lines)+'\n').encode('utf-8')
        pending[manifest_path] = json.dumps(manifest, indent=2).encode('utf-8')
        backups = {path:path.read_bytes() if path.exists() else None for path in pending}
        try:
            for path, data in pending.items():
                path.write_bytes(data)
        except Exception:
            for path, data in backups.items():
                if data is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(data)
            raise
        print(f'CHUNLI_AUTHORED_{label}_INSTALLED')
    elif args.runtime:
        print(f'CHUNLI_AUTHORED_{label}_VERIFY_PASS')


if __name__ == '__main__':
    main()
