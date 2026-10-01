from __future__ import annotations
from pathlib import Path
import importlib.util, json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
AUDIT=ROOT/'scripts/audit-ken-handoff-semantics.py'
spec=importlib.util.spec_from_file_location('a',AUDIT); mod=importlib.util.module_from_spec(spec); assert spec.loader; spec.loader.exec_module(mod)

# Calibrate the bridge limits against the approved Ryu authored movement set.
def frames(char,kind,count):
    im=Image.open(ROOT/f'public/art/animation-hq/{char}/{kind}.webp').convert('RGBA')
    return [mod.alpha_mask(im.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H))) for i in range(count)]

rmaster=mod.alpha_mask(Image.open(ROOT/'public/art/combat-sprites-hq/ryu.webp').convert('RGBA'))
rdash=frames('ryu','dash',7); rjump=frames('ryu','jump',8); rland=frames('ryu','landing',6)
assert mod.compare_motion_bridge(rmaster,rdash[0],mod.DASH_START_LIMITS)['pass']
assert mod.compare_motion_bridge(rdash[-1],rmaster,mod.DASH_END_LIMITS)['pass']
assert mod.compare_motion_bridge(rmaster,rjump[0],mod.JUMP_BASE_LIMITS)['pass']
assert mod.compare_motion_bridge(rjump[-1],rmaster,mod.JUMP_BASE_LIMITS)['pass']
assert mod.compare_motion_bridge(rjump[-1],rland[0],mod.JUMP_LANDING_LIMITS)['pass']
assert mod.compare_motion_bridge(rland[-1],rmaster,mod.LANDING_END_LIMITS)['pass']

runtime=mod.audit()
assert runtime['runtimeHandoffPass'] is True, runtime
assert runtime['locomotion']['locomotionHandoffPass'] is True, runtime['locomotion']
assert runtime['reactionAndRetreat']['reactionHandoffPass'] is True, runtime['reactionAndRetreat']
print('KEN_LOCOMOTION_HANDOFF_QA_PASS',json.dumps({
    'dashActive':runtime['locomotion']['dashActive'],
    'jumpActive':runtime['locomotion']['jumpActive'],
    'landingActive':runtime['locomotion']['landingActive'],
    'reactionHandoffPass':runtime['reactionAndRetreat']['reactionHandoffPass'],
    'runtimeHandoffPass':runtime['runtimeHandoffPass'],
},ensure_ascii=False))
