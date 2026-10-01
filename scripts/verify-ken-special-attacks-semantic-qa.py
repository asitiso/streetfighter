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


def base_body():
    im=Image.new('RGBA',(mod.FRAME_W,mod.FRAME_H),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.polygon([(158,305),(184,305),(181,405),(158,423),(148,416),(162,392)],fill='white')
    d.polygon([(199,305),(224,305),(232,405),(250,419),(241,426),(210,395)],fill='white')
    d.rounded_rectangle((154,166,226,320),20,fill='white')
    d.ellipse((168,112,217,164),fill='white')
    d.line((169,203,139,239,158,260),fill='white',width=24)
    d.line((214,203,244,222,256,220),fill='white',width=22)
    return im


def hadoken_frame(reach=0, coil=0, lean=0):
    im=base_body(); d=ImageDraw.Draw(im)
    # erase/repaint a changing forward arm pair to create non-affine authored silhouette
    x=lean
    d.line((200+x,210,235+x+reach//3,220,255+x+reach,222),fill='white',width=24)
    d.line((188+x,225,225+x+reach//4,238,246+x+reach,241),fill='white',width=22)
    if coil:
        d.ellipse((145-coil,185,170,212),fill='white')
    return im


def shoryu_frame(rise=0, crouch=0, arm=0, tuck=0):
    im=Image.new('RGBA',(mod.FRAME_W,mod.FRAME_H),(0,0,0,0)); d=ImageDraw.Draw(im)
    y=-rise
    hip=305+y+crouch
    d.rounded_rectangle((157,166+y+crouch//2,226,319+y+crouch),18,fill='white')
    d.ellipse((170,112+y+crouch//2,217,163+y+crouch//2),fill='white')
    # rising strike arm
    d.line((210,205+y,232+arm//4,174+y-arm//2,244+arm//3,140+y-arm),fill='white',width=23)
    # support arm
    d.line((170,208+y,148,230+y,161,251+y),fill='white',width=21)
    # legs change phase/tuck instead of rigid translation
    d.polygon([(166,306+y+crouch),(188,306+y+crouch),(185-tuck,397+y),(160-tuck,420+y),(151,412+y),(165,385+y)],fill='white')
    d.polygon([(198,306+y+crouch),(222,306+y+crouch),(224+tuck,390+y),(246+tuck,410+y),(238,422+y),(209,390+y)],fill='white')
    return im

cases=[]
for kind in ('hadoken','shoryuken'):
    frames=runtime_frames(kind,12)
    pose=mod.pose_qa(frames,kind)
    sem=mod.semantic_qa(kind,frames,pose)
    assert pose['poseAuthoredPass'] is False, (kind,pose)
    assert sem['semanticQaPass'] is False, (kind,sem)
    cases.append({'name':f'{kind}-current-staging-rejected','expected':False,'actual':False,'poseQa':pose,'semanticQa':sem})

# Authored Hadoken: coil, extension, release, controlled return.
reaches=[0,0,4,8,18,55,70,60,40,20,8,0]
coils=[0,6,12,16,10,2,0,0,0,0,0,0]
leans=[0,-2,-3,-2,0,3,5,4,3,2,1,0]
h=[hadoken_frame(r,c,l) for r,c,l in zip(reaches,coils,leans)]
hpose={'affineResidualAverage':0.045,'affineResidualMax':0.09}
hsem=mod.hadoken_semantic_qa(h,hpose)
assert hsem['semanticQaPass'], hsem
cases.append({'name':'hadoken-authored-fixture','expected':True,'actual':True,'semanticQa':hsem})

# Authored Shoryuken: compression -> launch -> rise -> apex -> descent -> neutral.
rise=[0,0,4,18,45,70,92,105,82,50,18,0]
crouch=[0,16,22,10,2,0,0,0,0,2,8,0]
arm=[0,4,12,28,45,62,78,85,60,36,12,0]
tuck=[0,2,6,10,14,18,25,30,22,14,7,0]
sframes=[shoryu_frame(r,c,a,t) for r,c,a,t in zip(rise,crouch,arm,tuck)]
spose={'affineResidualAverage':0.065,'affineResidualMax':0.12}
ssem=mod.shoryuken_semantic_qa(sframes,spose)
assert ssem['semanticQaPass'], ssem
cases.append({'name':'shoryuken-authored-fixture','expected':True,'actual':True,'semanticQa':ssem})

# Rigid hadoken impostor: whole body translation can extend reach but must fail feet/root/authored logic.
base=base_body(); rigid=[]
for dx in [0,-4,-8,-4,5,16,24,18,12,6,2,0]:
    f=Image.new('RGBA',base.size,(0,0,0,0)); f.alpha_composite(base,(dx,0)); rigid.append(f)
rsem=mod.hadoken_semantic_qa(rigid,{'affineResidualAverage':0.045,'affineResidualMax':0.09})
assert rsem['semanticQaPass'] is False, rsem
cases.append({'name':'hadoken-rigid-translation-rejected','expected':False,'actual':False,'semanticQa':rsem})

result={'character':'KEN','sequences':['hadoken','shoryuken'],'cases':cases,'verdict':'KEN_SPECIAL_ATTACKS_SEMANTIC_QA_PASS'}
(ROOT/'RC39_KEN_SPECIAL_ATTACKS_SEMANTIC_QA.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('KEN_SPECIAL_ATTACKS_SEMANTIC_QA_PASS', {'cases':len(cases)})
