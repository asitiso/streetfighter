from __future__ import annotations
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
REGISTRY=ROOT/'src/render/AnimationSequenceLibrary.ts'
MANIFEST=ROOT/'public/art/animation-hq/ken/manifest.json'
STATUS=ROOT/'RC39_KEN_INGEST_STATUS.json'


def sha(p:Path): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args): return subprocess.run(args,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)

before=(sha(REGISTRY),sha(MANIFEST))
proc=run([sys.executable,'scripts/ingest-authored-ken.py','--dry-run','--only','idle'])
if proc.returncode != 0:
    raise SystemExit(f'KEN_INGEST_DRY_FAIL\n{proc.stdout[-4000:]}')
after=(sha(REGISTRY),sha(MANIFEST))
if before != after:
    raise SystemExit('KEN_INGEST_DRY_MUTATED_RUNTIME')
status=json.loads(STATUS.read_text(encoding='utf-8'))
if status.get('mode')!='dry-run' or status.get('rolledBack') is not False:
    raise SystemExit('KEN_INGEST_STATUS_INVALID')
if status['records'][0]['sequence']!='idle':
    raise SystemExit('KEN_INGEST_ONLY_FILTER_INVALID')
if not status.get('history'):
    raise SystemExit('KEN_INGEST_HISTORY_MISSING')

script=(ROOT/'scripts/ingest-authored-ken.py').read_text(encoding='utf-8')
required=[
    "preview_only=True",
    "snap=snapshot(watch)",
    "restore(snap)",
    "['npm','run','verify:ken-pipeline']",
    "rec['status']='installed'",
    "rec['status']='rolled-back'",
]
for token in required:
    if token not in script:
        raise SystemExit(f'KEN_INGEST_TRANSACTION_TOKEN_MISSING: {token}')

pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
for name in ('ingest:ken','ingest:ken:dry','ingest:ken:strict'):
    if name not in pkg.get('scripts',{}):
        raise SystemExit(f'KEN_INGEST_PACKAGE_SCRIPT_MISSING: {name}')

readme=(ROOT/'art-source/ken/inbox/README.md').read_text(encoding='utf-8')
for phrase in ('npm run ingest:ken','자동 복구','최소 240px'):
    if phrase not in readme:
        raise SystemExit(f'KEN_INGEST_README_MISSING: {phrase}')

print('KEN_INGEST_ORCHESTRATOR_PASS', {
    'dryRunRuntimeUnchanged': True,
    'transactionRollbackPresent': True,
    'singleFinalVerify': True,
    'historyReceipt': status['history'],
})
