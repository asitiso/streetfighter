from __future__ import annotations
from pathlib import Path
import importlib.util
import json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/audit-ken-handoff-semantics.py'
spec=importlib.util.spec_from_file_location('handoff_audit', SCRIPT)
mod=importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(mod)


def rect(x0,y0,x1,y1):
    m=np.zeros((mod.FRAME_H,mod.FRAME_W),dtype=bool); m[y0:y1,x0:x1]=True; return m

base=rect(130,80,255,423)
good=rect(133,82,258,423)
root_jump=rect(180,80,305,423)
scale_pop=rect(100,50,290,423)
foot_jump=base.copy(); foot_jump[410:424,:]=False; foot_jump[410:424,185:310]=True

ok=mod.compare(base,good,mod.MASTER_LIMITS)
assert ok['pass'], ok
bad_root=mod.compare(base,root_jump,mod.MASTER_LIMITS)
assert not bad_root['pass'] and not bad_root['checks']['rootContinuity'], bad_root
bad_scale=mod.compare(base,scale_pop,mod.MASTER_LIMITS)
assert not bad_scale['pass'] and not bad_scale['checks']['scaleContinuity'], bad_scale
bad_foot=mod.compare(base,foot_jump,mod.MASTER_LIMITS)
assert not bad_foot['pass'] and not bad_foot['checks']['footContinuity'], bad_foot

runtime=mod.audit()
assert runtime['character']=='KEN'
assert runtime['fallbackBridgePass'] is True, 'current staging idle must remain compatible with the approved base sprite'
assert runtime['runtimeHandoffPass'] is True
assert runtime['defense']['defenseHandoffPass'] is True
assert runtime['standingAttacks']['standingAttackHandoffPass'] is True
assert runtime['specialAttacks']['specialAttackHandoffPass'] is True
assert runtime['specialAttacks']['tatsumakiHandoffPass'] is True
assert runtime['specialAttacks']['superRushHandoffPass'] is True
print('KEN_HANDOFF_QA_PASS', json.dumps({
  'gateMode':runtime['gateMode'],
  'fallbackBridgePass':runtime['fallbackBridgePass'],
  'pairAuthoredActive':runtime['pairAuthoredActive'],
  'pairPass':runtime['pairPass'],
  'defenseHandoffPass':runtime['defense']['defenseHandoffPass'],
  'standingAttackHandoffPass':runtime['standingAttacks']['standingAttackHandoffPass'],
  'specialAttackHandoffPass':runtime['specialAttacks']['specialAttackHandoffPass'],
  'tatsumakiHandoffPass':runtime['specialAttacks']['tatsumakiHandoffPass'],
  'superRushHandoffPass':runtime['specialAttacks']['superRushHandoffPass'],
}, ensure_ascii=False))
