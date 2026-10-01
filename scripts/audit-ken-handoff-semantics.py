from __future__ import annotations
from pathlib import Path
import json
import math
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FRAME_W = 384
FRAME_H = 448
MANIFEST_PATH = ROOT/'public/art/animation-hq/ken/manifest.json'
MASTER_PATH = ROOT/'public/art/combat-sprites-hq/ken.webp'
OUT_PATH = ROOT/'public/art/animation-hq/ken/handoff-audit.json'

# These gates are deliberately tolerant enough for a real pose change, but strict
# enough to catch root jumps / scale pops / feet teleporting between render paths.
MASTER_LIMITS = {
    'iouMin': 0.62,
    'centroidDistanceMax': 18.0,
    'footCenterDeltaMax': 24.0,
    'areaRatioMin': 0.78,
    'areaRatioMax': 1.24,
}
PAIR_LIMITS = {
    'iouMin': 0.52,
    'centroidDistanceMax': 22.0,
    'footCenterDeltaMax': 28.0,
    'areaRatioMin': 0.76,
    'areaRatioMax': 1.28,
}


DASH_START_LIMITS = {'iouMin':0.30,'iouMax':0.80,'centroidDistanceMax':45.0,'areaRatioMin':0.70,'areaRatioMax':1.40}
DASH_END_LIMITS = {'iouMin':0.30,'iouMax':0.82,'centroidDistanceMax':48.0,'footCenterDeltaMax':70.0,'areaRatioMin':0.65,'areaRatioMax':1.40}
JUMP_BASE_LIMITS = {'iouMin':0.40,'iouMax':0.90,'centroidDistanceMax':38.0,'footCenterDeltaMax':65.0,'areaRatioMin':0.68,'areaRatioMax':1.45}
JUMP_LANDING_LIMITS = {'iouMin':0.25,'iouMax':0.78,'footCenterDeltaMax':65.0,'areaRatioMin':0.65,'areaRatioMax':1.40}
LANDING_END_LIMITS = {'iouMin':0.35,'iouMax':0.90,'centroidDistanceMax':48.0,'footCenterDeltaMax':65.0,'areaRatioMin':0.65,'areaRatioMax':1.40}


WALK_BACK_BASE_LIMITS = {'iouMin':0.38,'iouMax':0.93,'centroidDistanceMax':38.0,'footCenterDeltaMax':58.0,'areaRatioMin':0.68,'areaRatioMax':1.40}
HIT_BASE_LIMITS = {'iouMin':0.52,'iouMax':1.00,'centroidDistanceMax':30.0,'footCenterDeltaMax':48.0,'areaRatioMin':0.70,'areaRatioMax':1.35}
GUARD_BASE_LIMITS = {'iouMin':0.55,'iouMax':1.00,'centroidDistanceMax':28.0,'footCenterDeltaMax':36.0,'areaRatioMin':0.76,'areaRatioMax':1.30}
PARRY_BASE_LIMITS = {'iouMin':0.45,'iouMax':1.00,'centroidDistanceMax':38.0,'footCenterDeltaMax':42.0,'areaRatioMin':0.72,'areaRatioMax':1.34}
STAND_LIGHT_BASE_LIMITS = {'iouMin':0.48,'iouMax':1.00,'centroidDistanceMax':36.0,'footCenterDeltaMax':42.0,'areaRatioMin':0.72,'areaRatioMax':1.34}
STAND_HEAVY_BASE_LIMITS = {'iouMin':0.42,'iouMax':1.00,'centroidDistanceMax':46.0,'footCenterDeltaMax':55.0,'areaRatioMin':0.68,'areaRatioMax':1.40}
HADOKEN_BASE_LIMITS = {'iouMin':0.42,'iouMax':1.00,'centroidDistanceMax':48.0,'footCenterDeltaMax':60.0,'areaRatioMin':0.66,'areaRatioMax':1.42}
SHORYUKEN_BASE_LIMITS = {'iouMin':0.36,'iouMax':1.00,'centroidDistanceMax':58.0,'footCenterDeltaMax':75.0,'areaRatioMin':0.62,'areaRatioMax':1.48}
TATSUMAKI_BASE_LIMITS = {'iouMin':0.28,'iouMax':1.00,'centroidDistanceMax':72.0,'footCenterDeltaMax':92.0,'areaRatioMin':0.60,'areaRatioMax':1.52}
SUPER_RUSH_BASE_LIMITS = {'iouMin':0.34,'iouMax':1.00,'centroidDistanceMax':62.0,'footCenterDeltaMax':82.0,'areaRatioMin':0.62,'areaRatioMax':1.48}

def alpha_mask(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert('RGBA').getchannel('A'), dtype=np.uint8) >= 32


def centroid(mask: np.ndarray) -> tuple[float, float]:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return (0.0, 0.0)
    return (float(xs.mean()), float(ys.mean()))


def foot_center(mask: np.ndarray) -> float:
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return 0.0
    bottom = int(ys.max())
    band = mask[max(0, bottom - 13):bottom + 1]
    _, bx = np.nonzero(band)
    return float(bx.mean()) if len(bx) else 0.0


def iou(a: np.ndarray, b: np.ndarray) -> float:
    union = np.logical_or(a, b).sum()
    if union == 0:
        return 0.0
    return float(np.logical_and(a, b).sum() / union)


def compare(a: np.ndarray, b: np.ndarray, limits: dict) -> dict:
    ac = centroid(a)
    bc = centroid(b)
    area_a = float(a.sum())
    area_b = float(b.sum())
    area_ratio = area_b / area_a if area_a else 0.0
    values = {
        'iou': iou(a, b),
        'centroidDistance': math.hypot(bc[0] - ac[0], bc[1] - ac[1]),
        'footCenterDelta': abs(foot_center(b) - foot_center(a)),
        'areaRatio': area_ratio,
    }
    checks = {
        'silhouetteContinuity': values['iou'] >= limits['iouMin'],
        'rootContinuity': values['centroidDistance'] <= limits['centroidDistanceMax'],
        'footContinuity': values['footCenterDelta'] <= limits['footCenterDeltaMax'],
        'scaleContinuity': limits['areaRatioMin'] <= values['areaRatio'] <= limits['areaRatioMax'],
    }
    return {
        **{k: round(v, 6) for k, v in values.items()},
        'limits': limits,
        'checks': checks,
        'pass': all(checks.values()),
    }


def compare_motion_bridge(a: np.ndarray, b: np.ndarray, limits: dict) -> dict:
    ac = centroid(a); bc = centroid(b)
    area_a = float(a.sum()); area_b = float(b.sum())
    values = {
        'iou': iou(a,b),
        'centroidDistance': math.hypot(bc[0]-ac[0],bc[1]-ac[1]),
        'footCenterDelta': abs(foot_center(b)-foot_center(a)),
        'areaRatio': area_b/area_a if area_a else 0.0,
    }
    checks = {
        'silhouetteCue': limits.get('iouMin',0.0) <= values['iou'] <= limits.get('iouMax',1.0),
        'scaleContinuity': limits.get('areaRatioMin',0.0) <= values['areaRatio'] <= limits.get('areaRatioMax',999.0),
    }
    if 'centroidDistanceMax' in limits:
        checks['rootContinuity'] = values['centroidDistance'] <= limits['centroidDistanceMax']
    if 'footCenterDeltaMax' in limits:
        checks['footContinuity'] = values['footCenterDelta'] <= limits['footCenterDeltaMax']
    return {**{k:round(v,6) for k,v in values.items()},'limits':limits,'checks':checks,'pass':all(checks.values())}


def frames_for(kind: str, count: int) -> list[np.ndarray]:
    path = ROOT/f'public/art/animation-hq/ken/{kind}.webp'
    img = Image.open(path).convert('RGBA')
    if img.size != (FRAME_W * count, FRAME_H):
        raise RuntimeError(f'{kind}: unexpected strip size {img.size}, expected {(FRAME_W * count, FRAME_H)}')
    return [alpha_mask(img.crop((i*FRAME_W,0,(i+1)*FRAME_W,FRAME_H))) for i in range(count)]


def record_map(manifest: dict) -> dict:
    return {r['id']: r for r in manifest['records']}


def audit() -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    records = record_map(manifest)
    idle_rec = records['idle']
    walk_rec = records['walk']
    idle = frames_for('idle', int(idle_rec['frames']))
    walk = frames_for('walk', int(walk_rec['frames']))
    dash_rec = records['dash']; jump_rec = records['jump']; landing_rec = records['landing']
    walk_back_rec = records['walk-back']; hit_rec = records['hit']
    guard_rec = records['guard']; parry_rec = records['parry']
    stand_light_rec = records['stand-light']; stand_heavy_rec = records['stand-heavy']
    hadoken_rec = records['hadoken']; shoryuken_rec = records['shoryuken']
    tatsumaki_rec = records['tatsumaki']; super_rush_rec = records['super-rush']
    dash = frames_for('dash', int(dash_rec['frames']))
    jump = frames_for('jump', int(jump_rec['frames']))
    landing = frames_for('landing', int(landing_rec['frames']))
    walk_back = frames_for('walk-back', int(walk_back_rec['frames']))
    hit = frames_for('hit', int(hit_rec['frames']))
    guard = frames_for('guard', int(guard_rec['frames']))
    parry = frames_for('parry', int(parry_rec['frames']))
    stand_light = frames_for('stand-light', int(stand_light_rec['frames']))
    stand_heavy = frames_for('stand-heavy', int(stand_heavy_rec['frames']))
    hadoken = frames_for('hadoken', int(hadoken_rec['frames']))
    shoryuken = frames_for('shoryuken', int(shoryuken_rec['frames']))
    tatsumaki = frames_for('tatsumaki', int(tatsumaki_rec['frames']))
    super_rush = frames_for('super-rush', int(super_rush_rec['frames']))
    master = alpha_mask(Image.open(MASTER_PATH).convert('RGBA'))

    # Idle must always be compatible with the stable base renderer because any
    # non-authored movement path can hand off to it until the full set is ready.
    idle_to_master_first = compare(idle[0], master, MASTER_LIMITS)
    idle_to_master_last = compare(idle[-1], master, MASTER_LIMITS)
    fallback_bridge_pass = idle_to_master_first['pass'] and idle_to_master_last['pass']

    pair_active = bool(idle_rec.get('enabled') and idle_rec.get('poseAuthored') and walk_rec.get('enabled') and walk_rec.get('poseAuthored'))
    idle_to_walk = compare(idle[-1], walk[0], PAIR_LIMITS)
    walk_to_idle = compare(walk[-1], idle[0], PAIR_LIMITS)
    pair_pass = idle_to_walk['pass'] and walk_to_idle['pass']

    # Locomotion transitions are gated only when the corresponding authored
    # sequence is active. Disabled pilot strips remain visible for QA without
    # blocking the runtime fallback path.
    dash_active = bool(dash_rec.get('enabled') and dash_rec.get('poseAuthored'))
    jump_active = bool(jump_rec.get('enabled') and jump_rec.get('poseAuthored'))
    landing_active = bool(landing_rec.get('enabled') and landing_rec.get('poseAuthored'))
    jump_landing_pair_active = jump_active and landing_active
    dash_from_base = compare_motion_bridge(master, dash[0], DASH_START_LIMITS)
    dash_to_base = compare_motion_bridge(dash[-1], master, DASH_END_LIMITS)
    jump_from_base = compare_motion_bridge(master, jump[0], JUMP_BASE_LIMITS)
    jump_to_base = compare_motion_bridge(jump[-1], master, JUMP_BASE_LIMITS)
    jump_to_landing = compare_motion_bridge(jump[-1], landing[0], JUMP_LANDING_LIMITS)
    landing_to_base = compare_motion_bridge(landing[-1], master, LANDING_END_LIMITS)
    dash_handoff_pass = (dash_from_base['pass'] and dash_to_base['pass']) if dash_active else True
    jump_handoff_pass = (jump_from_base['pass'] and (jump_to_landing['pass'] if landing_active else jump_to_base['pass'])) if jump_active else True
    landing_handoff_pass = landing_to_base['pass'] if landing_active else True
    locomotion_handoff_pass = dash_handoff_pass and jump_handoff_pass and landing_handoff_pass

    walk_back_active = bool(walk_back_rec.get('enabled') and walk_back_rec.get('poseAuthored'))
    hit_active = bool(hit_rec.get('enabled') and hit_rec.get('poseAuthored'))
    walk_back_from_base = compare_motion_bridge(master, walk_back[0], WALK_BACK_BASE_LIMITS)
    walk_back_to_base = compare_motion_bridge(walk_back[-1], master, WALK_BACK_BASE_LIMITS)
    hit_from_base = compare_motion_bridge(master, hit[0], HIT_BASE_LIMITS)
    hit_to_base = compare_motion_bridge(hit[-1], master, HIT_BASE_LIMITS)
    walk_back_handoff_pass = (walk_back_from_base['pass'] and walk_back_to_base['pass']) if walk_back_active else True
    hit_handoff_pass = (hit_from_base['pass'] and hit_to_base['pass']) if hit_active else True
    reaction_handoff_pass = walk_back_handoff_pass and hit_handoff_pass

    guard_active = bool(guard_rec.get('enabled') and guard_rec.get('poseAuthored'))
    parry_active = bool(parry_rec.get('enabled') and parry_rec.get('poseAuthored'))
    guard_from_base = compare_motion_bridge(master, guard[0], GUARD_BASE_LIMITS)
    guard_to_base = compare_motion_bridge(guard[-1], master, GUARD_BASE_LIMITS)
    parry_from_base = compare_motion_bridge(master, parry[0], PARRY_BASE_LIMITS)
    parry_to_base = compare_motion_bridge(parry[-1], master, PARRY_BASE_LIMITS)
    guard_handoff_pass = (guard_from_base['pass'] and guard_to_base['pass']) if guard_active else True
    parry_handoff_pass = (parry_from_base['pass'] and parry_to_base['pass']) if parry_active else True
    defense_handoff_pass = guard_handoff_pass and parry_handoff_pass

    stand_light_active = bool(stand_light_rec.get('enabled') and stand_light_rec.get('poseAuthored'))
    stand_heavy_active = bool(stand_heavy_rec.get('enabled') and stand_heavy_rec.get('poseAuthored'))
    stand_light_from_base = compare_motion_bridge(master, stand_light[0], STAND_LIGHT_BASE_LIMITS)
    stand_light_to_base = compare_motion_bridge(stand_light[-1], master, STAND_LIGHT_BASE_LIMITS)
    stand_heavy_from_base = compare_motion_bridge(master, stand_heavy[0], STAND_HEAVY_BASE_LIMITS)
    stand_heavy_to_base = compare_motion_bridge(stand_heavy[-1], master, STAND_HEAVY_BASE_LIMITS)
    stand_light_handoff_pass = (stand_light_from_base['pass'] and stand_light_to_base['pass']) if stand_light_active else True
    stand_heavy_handoff_pass = (stand_heavy_from_base['pass'] and stand_heavy_to_base['pass']) if stand_heavy_active else True
    standing_attack_handoff_pass = stand_light_handoff_pass and stand_heavy_handoff_pass

    hadoken_active = bool(hadoken_rec.get('enabled') and hadoken_rec.get('poseAuthored'))
    shoryuken_active = bool(shoryuken_rec.get('enabled') and shoryuken_rec.get('poseAuthored'))
    tatsumaki_active = bool(tatsumaki_rec.get('enabled') and tatsumaki_rec.get('poseAuthored'))
    super_rush_active = bool(super_rush_rec.get('enabled') and super_rush_rec.get('poseAuthored'))
    hadoken_from_base = compare_motion_bridge(master, hadoken[0], HADOKEN_BASE_LIMITS)
    hadoken_to_base = compare_motion_bridge(hadoken[-1], master, HADOKEN_BASE_LIMITS)
    shoryuken_from_base = compare_motion_bridge(master, shoryuken[0], SHORYUKEN_BASE_LIMITS)
    shoryuken_to_base = compare_motion_bridge(shoryuken[-1], master, SHORYUKEN_BASE_LIMITS)
    tatsumaki_from_base = compare_motion_bridge(master, tatsumaki[0], TATSUMAKI_BASE_LIMITS)
    tatsumaki_to_base = compare_motion_bridge(tatsumaki[-1], master, TATSUMAKI_BASE_LIMITS)
    super_rush_from_base = compare_motion_bridge(master, super_rush[0], SUPER_RUSH_BASE_LIMITS)
    super_rush_to_base = compare_motion_bridge(super_rush[-1], master, SUPER_RUSH_BASE_LIMITS)
    hadoken_handoff_pass = (hadoken_from_base['pass'] and hadoken_to_base['pass']) if hadoken_active else True
    shoryuken_handoff_pass = (shoryuken_from_base['pass'] and shoryuken_to_base['pass']) if shoryuken_active else True
    tatsumaki_handoff_pass = (tatsumaki_from_base['pass'] and tatsumaki_to_base['pass']) if tatsumaki_active else True
    super_rush_handoff_pass = (super_rush_from_base['pass'] and super_rush_to_base['pass']) if super_rush_active else True
    special_attack_handoff_pass = hadoken_handoff_pass and shoryuken_handoff_pass and tatsumaki_handoff_pass and super_rush_handoff_pass

    # If only Idle is authored, fallback compatibility is the active gate.
    # Once both are authored, require both the base bridge and the authored pair.
    runtime_handoff_pass = fallback_bridge_pass and (pair_pass if pair_active else True) and locomotion_handoff_pass and reaction_handoff_pass and defense_handoff_pass and standing_attack_handoff_pass and special_attack_handoff_pass
    result = {
        'character': 'KEN',
        'version': 2,
        'fallbackBridgeRequired': True,
        'pairAuthoredActive': pair_active,
        'idleToMasterFirst': idle_to_master_first,
        'idleToMasterLast': idle_to_master_last,
        'fallbackBridgePass': fallback_bridge_pass,
        'idleToWalk': idle_to_walk,
        'walkToIdle': walk_to_idle,
        'pairPass': pair_pass,
        'locomotion': {
            'dashActive': dash_active,
            'jumpActive': jump_active,
            'landingActive': landing_active,
            'jumpLandingPairActive': jump_landing_pair_active,
            'dashFromBase': dash_from_base,
            'dashToBase': dash_to_base,
            'jumpFromBase': jump_from_base,
            'jumpToBase': jump_to_base,
            'jumpToLanding': jump_to_landing,
            'landingToBase': landing_to_base,
            'dashHandoffPass': dash_handoff_pass,
            'jumpHandoffPass': jump_handoff_pass,
            'landingHandoffPass': landing_handoff_pass,
            'locomotionHandoffPass': locomotion_handoff_pass,
        },
        'reactionAndRetreat': {
            'walkBackActive': walk_back_active,
            'hitActive': hit_active,
            'walkBackFromBase': walk_back_from_base,
            'walkBackToBase': walk_back_to_base,
            'hitFromBase': hit_from_base,
            'hitToBase': hit_to_base,
            'walkBackHandoffPass': walk_back_handoff_pass,
            'hitHandoffPass': hit_handoff_pass,
            'reactionHandoffPass': reaction_handoff_pass,
        },
        'standingAttacks': {
            'standLightActive': stand_light_active,
            'standHeavyActive': stand_heavy_active,
            'standLightFromBase': stand_light_from_base,
            'standLightToBase': stand_light_to_base,
            'standHeavyFromBase': stand_heavy_from_base,
            'standHeavyToBase': stand_heavy_to_base,
            'standLightHandoffPass': stand_light_handoff_pass,
            'standHeavyHandoffPass': stand_heavy_handoff_pass,
            'standingAttackHandoffPass': standing_attack_handoff_pass,
        },
        'specialAttacks': {
            'hadokenActive': hadoken_active,
            'shoryukenActive': shoryuken_active,
            'tatsumakiActive': tatsumaki_active,
            'superRushActive': super_rush_active,
            'hadokenFromBase': hadoken_from_base,
            'hadokenToBase': hadoken_to_base,
            'shoryukenFromBase': shoryuken_from_base,
            'shoryukenToBase': shoryuken_to_base,
            'tatsumakiFromBase': tatsumaki_from_base,
            'tatsumakiToBase': tatsumaki_to_base,
            'superRushFromBase': super_rush_from_base,
            'superRushToBase': super_rush_to_base,
            'hadokenHandoffPass': hadoken_handoff_pass,
            'shoryukenHandoffPass': shoryuken_handoff_pass,
            'tatsumakiHandoffPass': tatsumaki_handoff_pass,
            'superRushHandoffPass': super_rush_handoff_pass,
            'specialAttackHandoffPass': special_attack_handoff_pass,
        },
        'defense': {
            'guardActive': guard_active,
            'parryActive': parry_active,
            'guardFromBase': guard_from_base,
            'guardToBase': guard_to_base,
            'parryFromBase': parry_from_base,
            'parryToBase': parry_to_base,
            'guardHandoffPass': guard_handoff_pass,
            'parryHandoffPass': parry_handoff_pass,
            'defenseHandoffPass': defense_handoff_pass,
        },
        'runtimeHandoffPass': runtime_handoff_pass,
        'gateMode': 'authored-pair+locomotion+reaction+defense+standing-attacks+special-attacks' if pair_active else 'idle-to-base-fallback+locomotion+reaction+defense+standing-attacks+special-attacks',
    }
    OUT_PATH.write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    result = audit()
    print(json.dumps(result, indent=2))
    if not result['runtimeHandoffPass']:
        raise SystemExit(2)
