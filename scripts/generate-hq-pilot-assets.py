#!/usr/bin/env python3
"""RC33 exact-pose HQ pilot bootstrap.

This script intentionally DOES NOT generate runtime HQ art from roster/key art.
Those sources can change pose, facing or silhouette. It creates exact-pose
reference guides and pending manifests only. A newly authored transparent master
must be accepted with register-hq-exactpose-master.py before runtime use.
"""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(ROOT/'scripts/generate-hq-exactpose-guides.py')], check=True)
rejected_report=ROOT/'art-source/hq-character-masters/rejected/ryu_block1_pose_report.json'
records=[]
notes={
 'RYU':'Block1 roster-derived HQ rejected: pose/silhouette mismatch. Awaiting exact-pose v02 master.',
 'CHUNLI':'Awaiting exact-pose neutral combat master based on current in-game sprite.',
 'KEN':'Awaiting exact-pose neutral combat master based on current in-game sprite.',
 'IBUKI':'Awaiting exact-pose neutral combat master based on current in-game sprite.',
}
for char in ('RYU','CHUNLI','KEN','IBUKI'):
    slug=char.lower()
    records.append({
      'character':char,
      'sourceFile':f'art-source/hq-character-masters/{slug}/{slug}_master_base_v02.png' if char=='RYU' else f'art-source/hq-character-masters/{slug}/{slug}_master_base_v01.png',
      'sourceOrigin':f'public/art/combat-sprites/{slug}.webp',
      'masterVersion':'pending',
      'width':0,'height':0,
      'runtimeFile':f'public/art/combat-sprites-hq/{slug}.webp',
      'runtimeWidth':0,'runtimeHeight':0,
      'runtimeAlphaBbox':[0,0,0,0],
      'runtimeSha256':None,
      'approved':False,
      'notes':notes[char],
    })
manifest={
 'candidate':'0.0.58-rc.33',
 'pipeline':'hq-character-exact-pose-v2',
 'runtimeSize':[384,448],
 'fallbackOrder':['HQ','HD REMASTER','LITE'],
 'approvalRule':'File presence never enables HQ. Candidate must pass exact-pose fidelity gate.',
 'records':records,
}
source_path=ROOT/'art-source/hq-character-masters/MASTER_SOURCE_MANIFEST.json'
source_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
public={
 'candidate':'0.0.58-rc.33','pipeline':'hq-character-exact-pose-v2',
 'fallbackOrder':['HQ','HD REMASTER','LITE'],
 'approvedCharacters':[],
 'pilotTargetCharacters':['RYU','CHUNLI','KEN','IBUKI'],
 'records':[],
 'rejections':[{'character':'RYU','artifact':'art-source/hq-character-masters/rejected/ryu_block1_runtime.webp','report':'art-source/hq-character-masters/rejected/ryu_block1_pose_report.json','reason':'Block1 roster-derived pose/style differs from authoritative in-game Ryu.'}],
}
(ROOT/'public/art/hq-character-master-manifest.json').write_text(json.dumps(public,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
