#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
PILOTS=('RYU','CHUNLI','KEN','IBUKI')
RUNTIME=(384,448)

def sha(path:Path): return hashlib.sha256(path.read_bytes()).hexdigest().upper()

def alpha_bbox(im): return list(im.convert('RGBA').getchannel('A').getbbox() or (0,0,0,0))

ap=argparse.ArgumentParser(description='Register an authored exact-pose HQ master only after fidelity checks pass.')
ap.add_argument('character',choices=PILOTS)
ap.add_argument('master',help='Transparent PNG/WebP master, minimum 768x960')
args=ap.parse_args(); char=args.character; slug=char.lower(); master_in=Path(args.master)
if not master_in.is_absolute(): master_in=(Path.cwd()/master_in).resolve()
im=Image.open(master_in).convert('RGBA')
if im.width<768 or im.height<960: raise SystemExit('HQ master must be at least 768x960')
if not im.getchannel('A').getbbox(): raise SystemExit('HQ master has empty alpha')
# Normalize authored subject into runtime canvas by preserving its alpha bbox aspect,
# matching authoritative source bbox height/width envelope and exact ground line.
ref=Image.open(ROOT/'public/art/combat-sprites'/f'{slug}.webp').convert('RGBA')
rb=ref.getchannel('A').getbbox(); mb=im.getchannel('A').getbbox()
if not rb or not mb: raise SystemExit('Missing alpha bbox')
subject=im.crop(mb)
# Target bbox is 2x current runtime source to preserve exact physical placement.
target_bbox=tuple(v*2 for v in rb); tx0,ty0,tx1,ty1=target_bbox
scale=min((tx1-tx0)/subject.width,(ty1-ty0)/subject.height)
subject=subject.resize((round(subject.width*scale),round(subject.height*scale)),Image.Resampling.LANCZOS)
runtime=Image.new('RGBA',RUNTIME,(0,0,0,0))
px=round((tx0+tx1-subject.width)/2); py=ty1-subject.height
runtime.alpha_composite(subject,(px,py))
tmp=ROOT/'art-source/hq-character-masters'/slug/f'.{slug}_candidate_runtime.webp'
tmp.parent.mkdir(parents=True,exist_ok=True); runtime.save(tmp,'WEBP',lossless=True,method=6)
check=subprocess.run([sys.executable,str(ROOT/'scripts/check-hq-pose-fidelity.py'),char,str(tmp)],capture_output=True,text=True)
report=json.loads(check.stdout)
report_path=ROOT/'art-source/hq-character-masters'/slug/f'{slug}_pose_fidelity_report.json'
report_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
if check.returncode!=0:
    tmp.unlink(missing_ok=True)
    print(json.dumps(report,indent=2)); raise SystemExit('Candidate rejected by exact-pose fidelity gate')
# Copy source master into canonical project path and publish lossless runtime.
version='v02' if char=='RYU' else 'v01'
master_out=ROOT/'art-source/hq-character-masters'/slug/f'{slug}_master_base_{version}.png'
im.save(master_out,optimize=True)
runtime_out=ROOT/'public/art/combat-sprites-hq'/f'{slug}.webp'; runtime_out.parent.mkdir(parents=True,exist_ok=True)
tmp.replace(runtime_out)
# Update source manifest record.
source_path=ROOT/'art-source/hq-character-masters/MASTER_SOURCE_MANIFEST.json'; source=json.loads(source_path.read_text())
for rec in source['records']:
    if rec['character']==char:
        rec.update({'sourceFile':str(master_out.relative_to(ROOT)).replace('\\','/'),'sourceOrigin':f'public/art/combat-sprites/{slug}.webp','masterVersion':version,'width':im.width,'height':im.height,'runtimeFile':str(runtime_out.relative_to(ROOT)).replace('\\','/'),'runtimeWidth':384,'runtimeHeight':448,'runtimeAlphaBbox':alpha_bbox(runtime),'runtimeSha256':sha(runtime_out),'approved':True,'notes':'Exact-pose authored master passed automated silhouette/alignment gate.'})
source_path.write_text(json.dumps(source,indent=2),encoding='utf-8')
# Update public manifest.
pub_path=ROOT/'public/art/hq-character-master-manifest.json'; pub=json.loads(pub_path.read_text())
approved=[]; records=[]
for rec in source['records']:
    if rec.get('approved'):
        approved.append(rec['character']); records.append({'character':rec['character'],'runtimeFile':'/'+rec['runtimeFile'].split('public/',1)[1],'width':384,'height':448,'sha256':rec['runtimeSha256'],'approved':True,'poseReport':str(report_path.relative_to(ROOT)).replace('\\','/')})
pub['approvedCharacters']=approved; pub['records']=records; pub_path.write_text(json.dumps(pub,indent=2),encoding='utf-8')
# Rewrite static TS registry to match manifest approvals.
reg=ROOT/'src/render/HqCharacterMasterRegistry.ts'
ids=', '.join(repr(x) for x in approved)
reg.write_text("""/** Auto-updated by register-hq-exactpose-master.py after pose-fidelity approval. */\nexport const HQ_PILOT_CHARACTER_IDS = Object.freeze(['RYU','CHUNLI','KEN','IBUKI'] as const);\nexport type HqPilotCharacterId = typeof HQ_PILOT_CHARACTER_IDS[number];\nexport const APPROVED_HQ_CHARACTER_IDS = Object.freeze([%s] as const);\nconst APPROVED = new Set<string>(APPROVED_HQ_CHARACTER_IDS as readonly string[]);\nexport function hqMasterApproved(characterId: string): boolean { return APPROVED.has(characterId); }\n"""%ids,encoding='utf-8')
print(json.dumps({'registered':char,'runtime':str(runtime_out),'pose':report},indent=2))
