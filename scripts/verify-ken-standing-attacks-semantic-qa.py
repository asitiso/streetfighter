from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import importlib.util, json

ROOT=Path(__file__).resolve().parents[1]
INSTALL=ROOT/'scripts/install-authored-ken-sequence.py'
spec=importlib.util.spec_from_file_location('ken_installer',INSTALL)
mod=importlib.util.module_from_spec(spec); assert spec.loader is not None; spec.loader.exec_module(mod)


def runtime_frames(kind:str,count:int):
    im=Image.open(ROOT/f'public/art/animation-hq/ken/{kind}.webp').convert('RGBA')
    assert im.size==(mod.FRAME_W*count,mod.FRAME_H), (kind,im.size)
    return [im.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(count)]


def authored_frame(arm:int=0, lean:int=0, torso_y:int=0, pivot:int=0):
    im=Image.new('RGBA',(mod.FRAME_W,mod.FRAME_H),(0,0,0,0)); d=ImageDraw.Draw(im)
    # Stable planted legs. Heavy may pivot one foot, but the root never translates as one rigid sprite.
    d.polygon([(166,310),(188,310),(184,410),(160,423),(150,416),(165,395)],fill=(255,255,255,255))
    d.polygon([(198,310),(220,310),(232,408),(247+pivot,420),(238+pivot,426),(210,398)],fill=(255,255,255,255))
    x=lean; y=torso_y
    d.rounded_rectangle((155+x,170+y,225+x,322+y),20,fill=(255,255,255,255))
    d.ellipse((168+x,115+y,216+x,165+y),fill=(255,255,255,255))
    d.line((170+x,205+y,140+x,240+y,158+x,260+y),fill=(255,255,255,255),width=24)
    d.line((213+x,205+y,245+x+int(arm*.45),222+y,255+x+arm,220+y),fill=(255,255,255,255),width=22)
    d.ellipse((247+x+arm,210+y,267+x+arm,230+y),fill=(255,255,255,255))
    return im

manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
record_by_id={r['id']:r for r in manifest.get('records',[])}
cases=[]
for kind,count in [('stand-light',7),('stand-heavy',10)]:
    frames=runtime_frames(kind,count)
    pose=mod.pose_qa(frames,kind)
    semantic=mod.semantic_qa(kind,frames,pose)
    enabled=bool(record_by_id.get(kind,{}).get('enabled'))
    if enabled:
        assert pose['poseAuthoredPass'] is True, (kind,pose)
        assert semantic['semanticQaPass'] is True, (kind,semantic)
        cases.append({'name':f'{kind}-runtime-authored-accepted','expected':True,'actual':True,'poseQa':pose,'semanticQa':semantic})
    else:
        # Whole-sprite staging strips must stay rejected until an authored source is promoted.
        assert pose['poseAuthoredPass'] is False, (kind,pose)
        assert semantic['semanticQaPass'] is False, (kind,semantic)
        cases.append({'name':f'{kind}-current-staging-rejected','expected':False,'actual':False,'poseQa':pose,'semanticQa':semantic})

light=[authored_frame(a,l,0,0) for a,l in zip([0,8,18,45,35,12,0],[0,1,2,3,2,1,0])]
light_pose={'affineResidualAverage':0.03,'affineResidualMax':0.06}
light_sem=mod.stand_light_semantic_qa(light,light_pose)
assert light_sem['semanticQaPass'], light_sem
cases.append({'name':'stand-light-authored-fixture','expected':True,'actual':True,'semanticQa':light_sem})

heavy=[authored_frame(a,l,y,p) for a,l,y,p in zip(
    [0,5,15,28,45,70,62,45,18,0],
    [0,1,3,5,7,9,8,6,2,0],
    [0,1,2,3,5,7,6,4,2,0],
    [0,0,1,2,4,6,5,3,1,0])]
heavy_pose={'affineResidualAverage':0.04,'affineResidualMax':0.08}
heavy_sem=mod.stand_heavy_semantic_qa(heavy,heavy_pose)
assert heavy_sem['semanticQaPass'], heavy_sem
cases.append({'name':'stand-heavy-authored-fixture','expected':True,'actual':True,'semanticQa':heavy_sem})

# Rigid-translation impostor: reach comes from moving the entire body, so foot travel must fail.
base=authored_frame()
rigid=[]
for dx in [0,12,24,46,24,12,0]:
    f=Image.new('RGBA',base.size,(0,0,0,0)); f.alpha_composite(base,(dx,0)); rigid.append(f)
rigid_sem=mod.stand_light_semantic_qa(rigid,{'affineResidualAverage':0.03,'affineResidualMax':0.06})
assert rigid_sem['semanticQaPass'] is False and rigid_sem['checks']['feetStayPlanted'] is False, rigid_sem
cases.append({'name':'stand-light-rigid-translation-rejected','expected':False,'actual':False,'semanticQa':rigid_sem})

result={'character':'KEN','sequences':['stand-light','stand-heavy'],'cases':cases,'verdict':'KEN_STANDING_ATTACKS_SEMANTIC_QA_PASS'}
(ROOT/'RC39_KEN_STANDING_ATTACKS_SEMANTIC_QA.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('KEN_STANDING_ATTACKS_SEMANTIC_QA_PASS', {'cases':len(cases)})
