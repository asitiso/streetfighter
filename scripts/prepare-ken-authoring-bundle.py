from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, shutil

ROOT=Path(__file__).resolve().parents[1]
REQ=ROOT/'art-source/ken/authored-source-requirements.json'
MASTER=ROOT/'art-source/hq-character-masters/new-originals/ken/ken_master_new_original_v01.png'
GUIDE=ROOT/'art-source/hq-character-masters/guides/ken_exactpose_reference.png'
OUTROOT=ROOT/'art-source/ken/authoring-packets'
INBOX=ROOT/'art-source/ken/inbox'

POSE_NOTES={
    'idle':[
        ('01 neutral','Base fighting stance. Both feet planted. Guard relaxed but ready.'),
        ('02 inhale','Tiny ribcage expansion; rear shoulder opens a little. Feet unchanged.'),
        ('03 chest-rise','Chest/guard rises slightly; head stays locked on opponent.'),
        ('04 weight-shift','Small hip/shoulder counter-shift. No step; stance width stays constant.'),
        ('05 exhale','Chest settles; elbows soften; hair/gi may settle by a few pixels.'),
        ('06 return','Return close to frame 01 so the loop closes cleanly.'),
    ],
    'walk':[
        ('01 contact-L','Lead heel/foot contacts. Rear leg extended; opposite shoulder leads.'),
        ('02 compression-L','Weight compresses onto lead leg. Pelvis drops slightly; rear heel releases.'),
        ('03 toe-off-R','Rear foot pushes off. Torso advances; guard stays combat-ready.'),
        ('04 lift-R','Rear knee lifts and passes. Lead foot remains planted without sliding.'),
        ('05 passing-R','Rear leg passes under hips. Shoulder/hip counter-rotation becomes clear.'),
        ('06 reach-R','Rear foot reaches forward toward the next contact. Keep center moving forward.'),
        ('07 contact-R','Opposite foot contacts. This must NOT duplicate frame 01.'),
        ('08 compression-R','Weight compresses on the opposite side; pelvis and shoulders change phase.'),
        ('09 toe-off-L','Former lead foot pushes off. Show a real leg/foot silhouette change.'),
        ('10 lift-L','Lead knee lifts; planted foot stays visually locked.'),
        ('11 passing-L','Lead leg passes under hips. Opposite shoulder advances.'),
        ('12 reach-L','Lead foot reaches toward frame 01 contact; close the cycle smoothly.'),
    ],
    'walk-back':[
        ('01 rear-contact','Rear foot establishes the retreat contact while the lead foot stays ready to release.'),
        ('02 compression','Weight compresses onto the rear leg; guard stays compact and defensive.'),
        ('03 front-toe-off','Lead foot pushes away from the opponent; torso keeps a slight backward bias.'),
        ('04 front-lift','Lead knee/foot lifts into the retreat step. Rear foot stays visually planted.'),
        ('05 passing','Lead leg passes under the hips; shoulders counter-rotate without opening the guard.'),
        ('06 front-contact','Opposite contact pose. This must not duplicate frame 01.'),
        ('07 compression-opposite','Weight settles on the new rearward contact; pelvis/shoulders change phase.'),
        ('08 rear-toe-off','Former rear foot releases and begins the second half of the retreat cycle.'),
        ('09 rear-lift','Rear leg passes while the upper body remains defensive and balanced.'),
        ('10 return-reach','Reach toward the next frame-01 contact so the loop closes smoothly.'),
    ],
    'hit':[
        ('01 neutral','Readable pre-impact combat stance. Keep this compatible with the base renderer.'),
        ('02 impact-compression','Torso and guard compress into the strike. Head/shoulders react first.'),
        ('03 torso-recoil','Upper body recoils away from impact; hips begin to follow.'),
        ('04 maximum-recoil','Strongest recoil silhouette. Do not create this by rotating one standing sprite.'),
        ('05 foot-slide','Grounded foot slide/stance change carries the force while balance is recovered.'),
        ('06 recovery-start','Torso begins returning; guard is still displaced from neutral.'),
        ('07 weight-recovery','Hips and feet re-center; shoulders/guard settle.'),
        ('08 neutral-return','Return close to the approved combat stance for a clean runtime handoff.'),
    ],
    'stand-light':[
        ('01 neutral','Approved combat stance; planted feet and compact guard.'),
        ('02 anticipation','Small shoulder/hip load. Do not slide the whole body forward.'),
        ('03 startup','Punching shoulder and elbow begin extending; rear hand protects the face.'),
        ('04 contact','Fast full light-punch reach. Hand clearly extends beyond frame 01 while feet remain planted.'),
        ('05 follow-through','Small natural carry past contact; torso remains balanced.'),
        ('06 recovery','Elbow retracts quickly; shoulder/hip unwind.'),
        ('07 neutral-bridge','Return close to the approved combat stance for clean handoff.'),
    ],
    'stand-heavy':[
        ('01 neutral','Approved combat stance; readable base silhouette.'),
        ('02 load','Visible shoulder/hip load and weight preparation without root sliding.'),
        ('03 hip-turn','Hips and rear shoulder rotate into the strike; guard shape clearly changes.'),
        ('04 drive','Torso drives forward and arm accelerates; planted foot may pivot.'),
        ('05 pre-contact','Near-full extension with clear body torque.'),
        ('06 contact','Maximum heavy-punch reach and strongest silhouette change.'),
        ('07 follow-through','Carry the strike past contact; cloth/hair follow the momentum.'),
        ('08 recoil','Arm and torso begin recovering; do not snap directly to neutral.'),
        ('09 recovery','Weight returns over the stance and guard reforms.'),
        ('10 neutral-bridge','End close enough to base for a clean runtime handoff.'),
    ],
    'hadoken':[
        ('01 neutral','Approved combat stance; both feet planted and guard compact.'),
        ('02 load','Shift weight slightly back and open the elbows without sliding the stance.'),
        ('03 gather','Hands retract toward the torso; shoulders and hips visibly coil.'),
        ('04 charge','Hands cup the charge position. Keep the character-only silhouette readable; no projectile baked into the body strip.'),
        ('05 drive','Rear hip and shoulder drive forward as the hands begin extending.'),
        ('06 release','Projectile-release pose: both hands clearly extend beyond frame 01 while feet remain grounded.'),
        ('07 full-extension','Maximum forward hand reach immediately after release; torso follows naturally.'),
        ('08 follow-through','Arms remain extended but start losing forward momentum.'),
        ('09 hand-return','Elbows bend and shoulders unwind; weight begins returning over the stance.'),
        ('10 recovery','Hands travel back toward guard without snapping to neutral.'),
        ('11 settle','Most body torque is gone; feet and hips re-center.'),
        ('12 neutral-bridge','End close to the approved base stance for clean runtime handoff.'),
    ],
    'shoryuken':[
        ('01 neutral','Approved combat stance immediately before the anti-air.'),
        ('02 compression','Drop the hips and compress both knees; striking shoulder loads.'),
        ('03 hip-rotation','Rear hip and shoulder rotate under the punch; guard shape opens.'),
        ('04 launch','Legs extend and the striking arm begins the rising path.'),
        ('05 contact','First rising contact pose. Fist, shoulder and torso form a clear upward line.'),
        ('06 rise','Body leaves the compressed stance; arm continues rising with visible vertical displacement.'),
        ('07 full-extension','Maximum rising-punch extension and strongest airborne silhouette.'),
        ('08 apex','Highest controlled pose; do not duplicate frame 07 or translate a standing sprite.'),
        ('09 turn-fall','Body begins turning/falling; arm and legs change phase.'),
        ('10 recovery-fall','Guard reforms while descending; legs prepare to catch the ground.'),
        ('11 landing','Feet/knees absorb the return without teleporting the root.'),
        ('12 neutral-bridge','Return close to approved base for the next action.'),
    ],
    'tatsumaki':[
        ('01 neutral-chamber','Approved base stance transitioning into a compact spin chamber.'),
        ('02 load','Load hips and support leg; shoulders begin counter-rotation.'),
        ('03 first-kick','First real kick extension. Redraw the leg chain; do not rotate the entire sprite.'),
        ('04 quarter-turn','Quarter-turn silhouette with torso/arms counter-rotating and a clear support-leg phase.'),
        ('05 cross-body','Kick travels across the body line; hip and cloth direction visibly change.'),
        ('06 second-contact','Second strong contact pose with a different limb silhouette from frame 03.'),
        ('07 opposite-turn','Opposite rotational phase. This must not be a mirrored/translated duplicate.'),
        ('08 third-contact','Third readable kick contact with a new leg extension and body orientation.'),
        ('09 spin-carry','Carry angular momentum through the torso, arms and gi cloth.'),
        ('10 brake','Support foot/hips begin braking rotation and lowering toward recovery.'),
        ('11 recovery','Leg retracts and guard reforms without snapping to neutral.'),
        ('12 neutral-bridge','End near approved base for clean runtime handoff.'),
    ],
    'super-rush':[
        ('01 neutral','Approved combat stance before the rush.'),
        ('02 load','Compress and load forward drive; feet remain readable.'),
        ('03 drive','First forward body drive before contact.'),
        ('04 contact-1','First distinct strike contact. Do not reuse later contact silhouettes.'),
        ('05 link-1','Recover just enough to visibly link into the next strike.'),
        ('06 contact-2','Second contact with a different arm/shoulder/hip configuration.'),
        ('07 link-2','Weight transfers for the third hit; preserve forward momentum.'),
        ('08 contact-3','Third contact, preferably a clearly different height or limb line.'),
        ('09 link-3','Short recovery/link pose; no frozen body translation.'),
        ('10 contact-4','Fourth contact with distinct reach and torso rotation.'),
        ('11 link-4','Prepare the final hit while maintaining controlled root travel.'),
        ('12 contact-5','Final strongest contact silhouette, distinct from contacts 1-4.'),
        ('13 follow-through','Carry final-hit momentum through limbs, torso, hair and gi.'),
        ('14 recovery-1','Begin deceleration and re-form guard.'),
        ('15 recovery-2','Return weight over the stance.'),
        ('16 neutral-bridge','End close to approved base for clean handoff.'),
    ],
    'guard':[
        ('01 neutral-guard','Compact defensive stance. Both feet planted and ready to absorb impact.'),
        ('02 brace','Elbows/shoulders close and torso compresses slightly. Do not slide the feet.'),
        ('03 impact-deflect','Peak block silhouette: forearms absorb/redirect the strike; torso gives a little.'),
        ('04 recoil-hold','Small controlled recoil while guard stays closed. No hit-reaction collapse.'),
        ('05 neutral-return','Recover close to the approved base stance for a clean runtime handoff.'),
    ],
    'parry':[
        ('01 neutral','Approved combat stance immediately before the read.'),
        ('02 read','Tiny anticipation: guard opens just enough to prepare the deflect.'),
        ('03 deflect-contact','Fast decisive parry contact. One arm/hand clearly intercepts; body remains balanced.'),
        ('04 extension','Follow the deflect a short distance. Do not turn it into an attack lunge.'),
        ('05 withdraw','Hand/shoulder return toward guard; feet remain planted.'),
        ('06 neutral-return','Return close to frame 01/base for a clean handoff.'),
    ],
    'dash':[
        ('01 ready','Neutral bridge with a slight forward intent; both feet readable.'),
        ('02 drive-load','Drop the center and load the rear leg; shoulders begin driving forward.'),
        ('03 launch','Rear foot pushes hard; torso lean increases and front arm/guard trails naturally.'),
        ('04 max-drive','Strongest forward drive silhouette. Long body line; do not just translate frame 03.'),
        ('05 passing-drive','Legs pass under the hips while the upper body keeps forward inertia.'),
        ('06 brake','Front foot prepares to catch; torso begins recovering from the lean.'),
        ('07 recovery-bridge','Return toward combat stance without duplicating frame 01 pixel-for-pixel.'),
    ],
    'jump':[
        ('01 anticipation','Grounded ready pose with visible jump intent.'),
        ('02 compression','Deepen knee/hip compression before launch; feet still grounded.'),
        ('03 launch','Legs extend and arms react to takeoff; clear silhouette break from compression.'),
        ('04 rise','Body lengthens upward; knees/arms transition toward aerial control.'),
        ('05 apex','Distinct apex pose with strongest aerial tuck/opening; not a translated standing sprite.'),
        ('06 fall','Reverse the rise shapes for descent; cloth/hair follows the direction change.'),
        ('07 landing-prepare','Legs extend/prepare for contact; center lowers toward landing.'),
        ('08 contact-bridge','Contact-ready bridge that can hand off to Landing or base fallback cleanly.'),
    ],
    'landing':[
        ('01 pre-contact','Feet are about to meet ground; body still carries downward momentum.'),
        ('02 ground-contact','First real ground contact. Ankles/knees absorb impact.'),
        ('03 maximum-squash','Lowest compressed pose; hips and knees clearly lower than frame 01.'),
        ('04 rebound','Body rises out of compression; guard begins to recover.'),
        ('05 settle','Most of the rebound is gone; stance width stabilizes.'),
        ('06 neutral-bridge','End near the approved combat stance for a clean Idle/base handoff.'),
    ],
}

def safe_font(size:int):
    for candidate in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf']:
        p=Path(candidate)
        if p.exists(): return ImageFont.truetype(str(p),size=size)
    return ImageFont.load_default()

def make_board(kind:str, packet:Path, notes:list[tuple[str,str]]):
    master=Image.open(MASTER).convert('RGBA')
    W,H=1920,1080
    board=Image.new('RGB',(W,H),(18,22,30))
    draw=ImageDraw.Draw(board)
    title_font=safe_font(44); sub_font=safe_font(24); body_font=safe_font(20)
    draw.text((44,30),f'KEN {kind.upper()} — AUTHORING BOARD',font=title_font,fill=(245,245,250))
    draw.text((44,88),'Reference only — these cards are NOT runtime frames.',font=sub_font,fill=(255,190,80))
    cols=4 if len(notes)>6 else 3; rows=(len(notes)+cols-1)//cols; pad=22 if len(notes)>6 else 30; top=140; cell_w=(W-pad*(cols+1))//cols; cell_h=(H-top-pad*(rows+1))//rows
    bbox=master.getchannel('A').getbbox() or (0,0,master.width,master.height)
    crop=master.crop(bbox)
    target_h=int(cell_h*(0.56 if len(notes)>6 else 0.68))
    scale=target_h/max(1,crop.height)
    sprite=crop.resize((max(1,int(crop.width*scale)),target_h),Image.Resampling.LANCZOS)
    for i,(name,note) in enumerate(notes):
        r,c=divmod(i,cols); x=pad+c*(cell_w+pad); y=top+pad+r*(cell_h+pad)
        draw.rounded_rectangle((x,y,x+cell_w,y+cell_h),radius=18,fill=(30,36,48),outline=(78,92,118),width=2)
        sx=x+(cell_w-sprite.width)//2; sy=y+48
        board.paste(sprite,(sx,sy),sprite)
        draw.text((x+14,y+10),name,font=(body_font if len(notes)>6 else sub_font),fill=(235,240,255))
        # wrap note simply
        words=note.split(); lines=[]; line=''
        for word in words:
            cand=(line+' '+word).strip()
            if draw.textlength(cand,font=body_font)>cell_w-36 and line:
                lines.append(line); line=word
            else: line=cand
        if line: lines.append(line)
        ty=y+cell_h-(62 if len(notes)>6 else 74)
        for li in lines[:3]:
            draw.text((x+14,ty),li,font=(safe_font(15) if len(notes)>6 else body_font),fill=(190,202,220)); ty+=(18 if len(notes)>6 else 24)
    board.save(packet/'_AUTHORING_BOARD.png')

def main():
    ap=ArgumentParser()
    ap.add_argument('kind',nargs='?',default='idle')
    args=ap.parse_args()
    req=json.loads(REQ.read_text(encoding='utf-8'))
    if args.kind not in req['sequences']:
        raise SystemExit(f'unknown Ken sequence: {args.kind}')
    spec=req['sequences'][args.kind]
    packet=OUTROOT/args.kind
    if packet.exists(): shutil.rmtree(packet)
    packet.mkdir(parents=True)
    refs=packet/'_references'; refs.mkdir()
    shutil.copy2(MASTER,refs/MASTER.name)
    if GUIDE.exists(): shutil.copy2(GUIDE,refs/GUIDE.name)
    count=int(spec['frames'])
    notes=POSE_NOTES.get(args.kind,[(f'{i:02d}',f'Author frame {i:02d} as a genuinely different pose.') for i in range(1,count+1)])
    manifest={
        'character':'KEN','sequence':args.kind,'expectedFrames':count,
        'requiredFileNames':[f'{i:02d}.png' for i in range(1,count+1)],
        'minimumSourceBodyHeight':req['minimumSourceBodyHeight'],
        'preferredSourceBodyHeight':req['preferredSourceBodyHeight'],
        'runtimeFrameSize':req['runtimeFrameSize'],
        'transparentBackgroundRequired':True,
        'posePlan':spec.get('posePlan',[]),
        'semanticQa':spec.get('semanticQa'),
        'inboxDestination':f'art-source/ken/inbox/{args.kind}/',
        'ingestCommand':f'npm run ingest:ken -- --only {args.kind}',
        'rule':'Do not create frames by translating/rotating/scaling one still. Limbs, torso silhouette and cloth/hair follow-through must be genuinely redrawn/authored.'
    }
    (packet/'FRAME_MANIFEST.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    readme=f'''# KEN {args.kind.upper()} AUTHORED SOURCE PACKET\n\nThis folder is an authoring brief, not runtime art.\n\n## Fastest workflow\n1. Use `_references/{MASTER.name}` as the exact character-design reference.\n2. Produce exactly {count} transparent PNG frames named `01.png` ... `{count:02d}.png`.\n3. Keep the character body at least {req['minimumSourceBodyHeight']} px tall in every source frame; {req['preferredSourceBodyHeight']} px+ is preferred.\n4. Keep feet/root stable unless the motion explicitly requires translation.\n5. Copy the finished frame files to `art-source/ken/inbox/{args.kind}/`.\n6. Run: `npm run ingest:ken -- --only {args.kind}`.\n\nThe ingest pipeline will reject low-resolution, opaque-background, transform-only, or semantically invalid motion automatically.\n\n## Pose plan\n'''
    for name,note in notes:
        readme += f'- **{name}** — {note}\n'
    (packet/'README.md').write_text(readme,encoding='utf-8')
    make_board(args.kind,packet,notes)

    # Seed the actual drop folder with underscore-prefixed guides. The ingest loader
    # deliberately ignores these, so authors only need to add 01.png..NN.png here.
    inbox=INBOX/args.kind
    inbox.mkdir(parents=True,exist_ok=True)
    for old in inbox.iterdir():
        if old.is_file() and old.name.startswith('_'):
            old.unlink()
    shutil.copy2(packet/'README.md',inbox/'_README.md')
    shutil.copy2(packet/'FRAME_MANIFEST.json',inbox/'_FRAME_MANIFEST.json')
    shutil.copy2(MASTER,inbox/'_MASTER_REFERENCE.png')
    if (packet/'_AUTHORING_BOARD.png').exists():
        shutil.copy2(packet/'_AUTHORING_BOARD.png',inbox/'_AUTHORING_BOARD.png')
    # No sequence.json is created by default: transparent authored PNGs need no background extraction.
    print(json.dumps({'prepared':True,'character':'KEN','sequence':args.kind,'packet':str(packet.relative_to(ROOT)),'inbox':str(inbox.relative_to(ROOT)),'expectedFrames':count,'dropFiles':[f'{i:02d}.png' for i in range(1,count+1)]},indent=2))
if __name__=='__main__': main()
