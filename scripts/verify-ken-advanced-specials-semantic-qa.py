from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import importlib.util, json, math

ROOT=Path(__file__).resolve().parents[1]
INSTALL=ROOT/'scripts/install-authored-ken-sequence.py'
spec=importlib.util.spec_from_file_location('ken_installer',INSTALL)
mod=importlib.util.module_from_spec(spec); assert spec.loader is not None; spec.loader.exec_module(mod)


def runtime_frames(kind:str,count:int):
    im=Image.open(ROOT/f'public/art/animation-hq/ken/{kind}.webp').convert('RGBA')
    assert im.size==(mod.FRAME_W*count,mod.FRAME_H),(kind,im.size)
    return [im.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(count)]


def draw_base(dx=0,dy=0):
    im=Image.new('RGBA',(mod.FRAME_W,mod.FRAME_H),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.ellipse((168+dx,112+dy,217+dx,164+dy),fill='white')
    d.rounded_rectangle((154+dx,166+dy,226+dx,318+dy),18,fill='white')
    d.line((170+dx,205+dy,145+dx,238+dy,161+dx,258+dy),fill='white',width=22)
    d.line((211+dx,204+dy,238+dx,226+dy,250+dx,219+dy),fill='white',width=22)
    d.polygon([(160+dx,306+dy),(184+dx,306+dy),(179+dx,401+dy),(158+dx,423+dy),(149+dx,416+dy),(163+dx,390+dy)],fill='white')
    d.polygon([(198+dx,306+dy),(222+dx,306+dy),(231+dx,401+dy),(250+dx,419+dy),(241+dx,427+dy),(208+dx,392+dy)],fill='white')
    return im


def tatsu_frame(angle_deg:float, reach:float, dx:float, dy:float, recovery=False):
    im=Image.new('RGBA',(mod.FRAME_W,mod.FRAME_H),(0,0,0,0)); d=ImageDraw.Draw(im)
    cx,cy=191+dx,250+dy
    # compact torso/head with changing shoulder axis
    d.ellipse((169+dx,112+dy,217+dx,164+dy),fill='white')
    d.rounded_rectangle((157+dx,168+dy,225+dx,310+dy),18,fill='white')
    # support leg changes chamber/tuck phase
    bend=26+10*math.sin(math.radians(angle_deg))
    d.line((182+dx,302+dy,164+dx-bend/2,350+dy,158+dx-bend,405+dy),fill='white',width=25)
    # spinning kick leg: actual limb endpoint redraw, not rigid-body rotation
    a=math.radians(angle_deg)
    knee=(cx+math.cos(a)*42, cy+math.sin(a)*30)
    foot=(cx+math.cos(a)*reach, cy+math.sin(a)*reach*0.58)
    d.line((cx,cy,knee[0],knee[1],foot[0],foot[1]),fill='white',width=29)
    # arms counter-rotate
    aa=a+math.pi
    d.line((188+dx,205+dy,188+dx+math.cos(aa)*42,205+dy+math.sin(aa)*26),fill='white',width=20)
    d.line((211+dx,210+dy,211+dx+math.cos(a)*34,210+dy+math.sin(a)*20),fill='white',width=19)
    if recovery:
        d.line((210+dx,212+dy,242+dx,226+dy),fill='white',width=18)
    return im


def super_frame(step:int, dx:float, arm_reach:float, level:float, side:int, kick=False):
    im=draw_base(dx,level); d=ImageDraw.Draw(im)
    shoulder=(205+dx,205+level)
    # overwrite/add a distinct contact limb. Alternating high/low and side produces a real chain.
    if kick:
        hip=(205+dx,305+level)
        foot=(205+dx+arm_reach,300+level+side*26)
        d.line((hip[0],hip[1],hip[0]+arm_reach*0.45,hip[1]-22*side,foot[0],foot[1]),fill='white',width=30)
    else:
        elbow=(shoulder[0]+arm_reach*0.52,shoulder[1]+side*18)
        hand=(shoulder[0]+arm_reach,shoulder[1]+side*8)
        d.line((shoulder[0],shoulder[1],elbow[0],elbow[1],hand[0],hand[1]),fill='white',width=25)
    # counter guard changes by phase
    d.line((174+dx,210+level,152+dx,224+level-side*10),fill='white',width=20)
    return im

cases=[]
manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
records={record['id']:record for record in manifest['records']}
for kind,count in [('tatsumaki',12),('super-rush',16)]:
    frames=runtime_frames(kind,count)
    pose=mod.pose_qa(frames,kind); sem=mod.semantic_qa(kind,frames,pose)
    active=bool(records[kind].get('enabled') and records[kind].get('poseAuthored'))
    assert pose['poseAuthoredPass'] is active,(kind,pose)
    assert sem['semanticQaPass'] is active,(kind,sem)
    cases.append({'name':f'{kind}-runtime-{"authored" if active else "staging"}','expected':active,'actual':active,'poseQa':pose,'semanticQa':sem})

# Tatsu authored fixture: chamber -> first extension -> cross-body/opposite extension -> second contact -> recovery.
angles=[-35,-18,0,28,62,105,150,205,250,300,335,350]
reaches=[65,78,98,128,148,156,150,142,136,115,88,72]
dxs=[0,3,7,12,18,25,30,27,20,13,6,2]
dys=[0,4,7,10,13,10,5,0,4,8,4,1]
tframes=[tatsu_frame(a,r,x,y,i>=10) for i,(a,r,x,y) in enumerate(zip(angles,reaches,dxs,dys))]
tpose={'affineResidualAverage':0.072,'affineResidualMax':0.145}
tsem=mod.tatsumaki_semantic_qa(tframes,tpose)
assert tsem['semanticQaPass'],tsem
cases.append({'name':'tatsumaki-authored-fixture','expected':True,'actual':True,'semanticQa':tsem})

# Super authored fixture: five distinct contacts with alternating punch/kick silhouettes and controlled rush root.
# contact indices are 3,5,7,9,11 zero-based.
dx=[0,2,5,10,14,20,24,30,34,39,43,48,42,30,15,3]
reach=[10,20,30,72,36,92,42,112,48,98,38,118,65,42,24,12]
level=[0,2,4,7,3,10,1,7,4,13,2,8,5,3,1,0]
sides=[-1,-1,1,-1,1,1,-1,-1,1,1,-1,-1,1,1,-1,-1]
kicks={7,11}
sframes=[super_frame(i,dx[i],reach[i],level[i],sides[i],i in kicks) for i in range(16)]
spose={'affineResidualAverage':0.083,'affineResidualMax':0.164}
ssem=mod.super_rush_semantic_qa(sframes,spose)
assert ssem['semanticQaPass'],ssem
cases.append({'name':'super-rush-authored-fixture','expected':True,'actual':True,'semanticQa':ssem})

# rigid impostor: translated base at contact beats, but must still fail authored semantics.
base=draw_base(); rigid=[]
for dxv in [0,4,8,14,20,28,34,40,46,50,44,36,26,16,8,0]:
    f=Image.new('RGBA',base.size,(0,0,0,0)); f.alpha_composite(base,(dxv,0)); rigid.append(f)
rsem=mod.super_rush_semantic_qa(rigid,{'affineResidualAverage':0.001,'affineResidualMax':0.002})
assert rsem['semanticQaPass'] is False,rsem
cases.append({'name':'super-rush-rigid-translation-rejected','expected':False,'actual':False,'semanticQa':rsem})

result={'character':'KEN','sequences':['tatsumaki','super-rush'],'cases':cases,'verdict':'KEN_ADVANCED_SPECIALS_SEMANTIC_QA_PASS'}
(ROOT/'RC39_KEN_ADVANCED_SPECIALS_SEMANTIC_QA.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('KEN_ADVANCED_SPECIALS_SEMANTIC_QA_PASS',{'cases':len(cases)})
