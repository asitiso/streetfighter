from __future__ import annotations
from argparse import ArgumentParser
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
from typing import Any

ROOT=Path(__file__).resolve().parents[1]
INBOX=ROOT/'art-source/ken/inbox'
REQ_PATH=ROOT/'art-source/ken/authored-source-requirements.json'
STATUS_PATH=ROOT/'RC39_KEN_INGEST_STATUS.json'
HISTORY_DIR=ROOT/'art-source/ken/ingest-history'
EXTS=('.png','.webp','.jpg','.jpeg')
GLOBAL_WATCH=[
    ROOT/'public/art/animation-hq/ken/manifest.json',
    ROOT/'src/render/AnimationSequenceLibrary.ts',
]


def source_for(kind:str):
    directory=INBOX/kind
    if directory.is_dir():
        files=sorted(
            p for p in directory.iterdir()
            if p.suffix.lower() in EXTS and not p.name.startswith('_')
        )
        if files:
            # Directory sources may carry their own sequence settings so authors can
            # drop one folder into the inbox without maintaining a sibling sidecar.
            local_sidecar=directory/'sequence.json'
            fallback_sidecar=INBOX/f'{kind}.json'
            sidecar=local_sidecar if local_sidecar.exists() else (fallback_sidecar if fallback_sidecar.exists() else None)
            return directory, sidecar
    for ext in EXTS:
        path=INBOX/f'{kind}{ext}'
        if path.exists():
            sidecar=INBOX/f'{kind}.json'
            return path, sidecar if sidecar.exists() else None
    return None,None


def command_for(kind:str, expected:int, source:Path, sidecar:Path|None, preview_only:bool, skip_verify:bool=False):
    cmd=[sys.executable,'scripts/install-authored-ken-sequence.py',kind,str(source)]
    cfg:dict[str,Any]={}
    if sidecar:
        cfg=json.loads(sidecar.read_text(encoding='utf-8'))
    if source.is_file():
        cols=int(cfg.get('cols',expected)); rows=int(cfg.get('rows',1))
        cmd += ['--cols',str(cols),'--rows',str(rows)]
        if 'crop' in cfg:
            cmd += ['--crop',','.join(str(v) for v in cfg['crop'])]
        if 'indices' in cfg:
            cmd += ['--indices',','.join(str(v) for v in cfg['indices'])]
    # Background extraction applies to both sheet and per-frame-directory inputs.
    if cfg.get('darkBackground'):
        cmd.append('--dark-background')
    if preview_only:
        cmd.append('--preview-only')
    if skip_verify:
        cmd.append('--skip-verify')
    return cmd


def run(cmd:list[str]):
    return subprocess.run(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)


def sha256(path:Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_json_tail(output:str):
    # Installer ends with one JSON object. Parsing is best-effort because Python/Pillow may emit warnings first.
    starts=[i for i,c in enumerate(output) if c=='{']
    for i in reversed(starts):
        try:
            return json.loads(output[i:])
        except json.JSONDecodeError:
            continue
    return None


def snapshot(paths:list[Path]):
    snap={}
    for path in paths:
        snap[str(path.relative_to(ROOT))] = {
            'exists':path.exists(),
            'bytes':path.read_bytes() if path.exists() else None,
        }
    return snap


def restore(snap:dict[str,dict[str,Any]]):
    for rel, item in snap.items():
        path=ROOT/rel
        if item['exists']:
            path.parent.mkdir(parents=True,exist_ok=True)
            path.write_bytes(item['bytes'])
        else:
            path.unlink(missing_ok=True)


def record_history(result:dict[str,Any]):
    HISTORY_DIR.mkdir(parents=True,exist_ok=True)
    digest=hashlib.sha256(json.dumps(result,sort_keys=True,default=str).encode()).hexdigest()[:12]
    index=len(list(HISTORY_DIR.glob('*.json')))+1
    path=HISTORY_DIR/f'{index:04d}-{digest}.json'
    path.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    return path


def main():
    p=ArgumentParser(description='Transactionally bulk-ingest genuinely authored Ken HQ motion sources. Rejected motions stay gated; passing motions install together and are verified once.')
    p.add_argument('--dry-run',action='store_true',help='Preflight every available source without touching runtime assets.')
    p.add_argument('--only',action='append',help='Only ingest this motion; repeatable.')
    p.add_argument('--strict',action='store_true',help='Return exit 2 when any supplied source is rejected. Useful for CI; default interactive ingest keeps accepted motions.')
    p.add_argument('--no-final-verify',action='store_true',help='Diagnostics only: skip the final verify:ken-pipeline command after batch install.')
    args=p.parse_args()

    req=json.loads(REQ_PATH.read_text(encoding='utf-8'))
    selected=set(args.only or req['sequences'].keys())
    unknown=selected-set(req['sequences'])
    if unknown:
        raise SystemExit(f'unknown Ken sequence(s): {sorted(unknown)}')

    records=[]
    ready=[]
    # Phase 1: preflight everything. Nothing in runtime is allowed to mutate here.
    before_preflight={str(p.relative_to(ROOT)):sha256(p) for p in GLOBAL_WATCH if p.exists()}
    for kind, spec in req['sequences'].items():
        if kind not in selected:
            continue
        source,sidecar=source_for(kind)
        if source is None:
            records.append({'sequence':kind,'status':'pending','reason':'no-source-in-inbox','expectedFrames':spec['frames']})
            continue
        cmd=command_for(kind,int(spec['frames']),source,sidecar,preview_only=True)
        proc=run(cmd)
        parsed=parse_json_tail(proc.stdout)
        base={
            'sequence':kind,'source':str(source.relative_to(ROOT)),
            'sidecar':str(sidecar.relative_to(ROOT)) if sidecar else None,
            'expectedFrames':spec['frames'],'preflightReturnCode':proc.returncode,
            'preflight':parsed,'outputTail':proc.stdout[-3500:],
        }
        if proc.returncode==0:
            base['status']='preview-pass' if args.dry_run else 'ready'
            ready.append((kind,int(spec['frames']),source,sidecar))
        else:
            base['status']='rejected'
            if parsed and parsed.get('reason'):
                base['reason']=parsed['reason']
            elif 'source body resolution too low' in proc.stdout:
                base['reason']='source-resolution-gate'
            elif 'opaque source background detected' in proc.stdout:
                base['reason']='opaque-background-gate'
            else:
                base['reason']='preflight-failed'
        records.append(base)

    after_preflight={str(p.relative_to(ROOT)):sha256(p) for p in GLOBAL_WATCH if p.exists()}
    if before_preflight != after_preflight:
        raise SystemExit('KEN_INGEST_PREFLIGHT_MUTATION: preview-only preflight changed runtime registry/manifest')

    result={
        'character':'KEN','mode':'dry-run' if args.dry_run else 'transactional-batch',
        'records':records,'installed':[],'rejected':[r['sequence'] for r in records if r['status']=='rejected'],
        'pending':[r['sequence'] for r in records if r['status']=='pending'],
        'verification':None,'rolledBack':False,
    }

    if args.dry_run or not ready:
        STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
        hist=record_history(result)
        result['history']=str(hist.relative_to(ROOT))
        STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps(result,indent=2,ensure_ascii=False))
        if args.strict and result['rejected']:
            raise SystemExit(2)
        return

    # Phase 2: snapshot all files the batch can mutate. A failed final verification rolls all passing installs back.
    watch=list(GLOBAL_WATCH)
    for kind,_,_,_ in ready:
        watch += [
            ROOT/f'public/art/animation-hq/ken/{kind}.webp',
            ROOT/f'RC39_KEN_{kind.upper().replace("-","_")}_AUTHORED_QA.json',
            ROOT/f'RC39_KEN_{kind.upper().replace("-","_")}_AUTHORED_PREVIEW.png',
        ]
    watch += [ROOT/'RC39_KEN_LAST_INSTALL.json',ROOT/'RC39_KEN_POSE_VARIANCE.json']
    snap=snapshot(watch)

    try:
        for kind, expected, source, sidecar in ready:
            cmd=command_for(kind,expected,source,sidecar,preview_only=False,skip_verify=True)
            proc=run(cmd)
            rec=next(r for r in records if r['sequence']==kind)
            rec['installReturnCode']=proc.returncode
            rec['installOutputTail']=proc.stdout[-3500:]
            rec['install']=parse_json_tail(proc.stdout)
            if proc.returncode != 0:
                raise RuntimeError(f'{kind}: installer failed after successful preflight')
            rec['status']='installed'
            result['installed'].append(kind)

        if not args.no_final_verify:
            verify=run(['npm','run','verify:ken-pipeline'])
            result['verification']={'command':'npm run verify:ken-pipeline','returnCode':verify.returncode,'tail':verify.stdout[-7000:]}
            if verify.returncode != 0:
                raise RuntimeError('batch final verification failed')
        else:
            result['verification']={'command':None,'returnCode':None,'skipped':True}
    except Exception as exc:
        restore(snap)
        # Recreate pose report from restored runtime so subsequent QA is coherent.
        run([sys.executable,'scripts/measure-animation-pose-variance.py','--character','KEN','--strict-missing'])
        result['rolledBack']=True
        result['rollbackReason']=str(exc)
        result['installed']=[]
        for rec in records:
            if rec.get('status')=='installed':
                rec['status']='rolled-back'
        STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
        hist=record_history(result)
        result['history']=str(hist.relative_to(ROOT))
        STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
        print(json.dumps(result,indent=2,ensure_ascii=False))
        raise SystemExit(3)

    # Final consistency snapshot for human-readable receipts.
    manifest=json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
    result['activeSequences']=[r['id'] for r in manifest['records'] if r.get('enabled')]
    result['enabledFrameTotal']=manifest.get('enabledFrameTotal',0)
    STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    hist=record_history(result)
    result['history']=str(hist.relative_to(ROOT))
    STATUS_PATH.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(result,indent=2,ensure_ascii=False))
    if args.strict and result['rejected']:
        raise SystemExit(2)

if __name__=='__main__':
    main()
