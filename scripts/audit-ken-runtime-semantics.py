from __future__ import annotations
from pathlib import Path
from PIL import Image
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[1]
INSTALLER = ROOT / 'scripts/install-authored-ken-sequence.py'
spec = importlib.util.spec_from_file_location('ken_installer', INSTALLER)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)

manifest = json.loads((ROOT/'public/art/animation-hq/ken/manifest.json').read_text(encoding='utf-8'))
pose_report_path=ROOT/'RC39_KEN_POSE_VARIANCE.json'
pose_report=json.loads(pose_report_path.read_text(encoding='utf-8')) if pose_report_path.exists() else {'records':[]}
pose_by_sequence={r['sequence']:r for r in pose_report.get('records',[]) if not r.get('missing')}
records=[]
for rec in manifest['records']:
    if rec['id'] not in ('idle','walk','walk-back','dash','jump','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','super-rush'):
        continue
    path=ROOT/f"public/art/animation-hq/ken/{rec['id']}.webp"
    strip=Image.open(path).convert('RGBA')
    frames=[strip.crop((i*mod.FRAME_W,0,(i+1)*mod.FRAME_W,mod.FRAME_H)) for i in range(rec['frames'])]
    measured=pose_by_sequence.get(rec['id'])
    pose={k:measured[k] for k in ('affineResidualAverage','affineResidualMax','fullPoseAverageThreshold','fullPoseMaxThreshold','poseAuthoredPass')} if measured else mod.pose_qa(frames,rec['id'])
    semantic=mod.semantic_qa(rec['id'],frames,pose)
    records.append({
        'sequence':rec['id'],
        'enabled':bool(rec.get('enabled')),
        'poseAuthored':bool(rec.get('poseAuthored')),
        'poseQa':pose,
        'semanticQa':semantic,
        'runtimePromotionPass': bool(pose['poseAuthoredPass'] and semantic['semanticQaPass']),
    })
result={
    'character':'KEN',
    'pipeline':'rc39-runtime-semantic-audit-v9-pose-report-reuse',
    'poseReportReused':len(pose_by_sequence)>0,
    'records':records,
    'allRuntimePromotionPass':all(r['runtimePromotionPass'] for r in records),
}
out=ROOT/'public/art/animation-hq/ken/semantic-audit.json'
out.write_text(json.dumps(result,indent=2),encoding='utf-8')
print('KEN_RUNTIME_SEMANTIC_AUDIT',json.dumps(result))
