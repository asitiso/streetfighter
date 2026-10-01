from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw
import json, subprocess, sys, tempfile

ROOT=Path(__file__).resolve().parents[1]
REQ=ROOT/'art-source/ken/authored-source-requirements.json'
INGEST=ROOT/'scripts/ingest-authored-ken.py'
INSTALL=ROOT/'scripts/install-authored-ken-sequence.py'
req=json.loads(REQ.read_text(encoding='utf-8'))

for kind in ('idle','walk','walk-back','dash','jump','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','super-rush'):
    packet=ROOT/f'art-source/ken/authoring-packets/{kind}'
    expected=int(req['sequences'][kind]['frames'])
    required=[packet/'README.md',packet/'FRAME_MANIFEST.json',packet/'_AUTHORING_BOARD.png']
    for path in required:
        assert path.exists(), f'missing authoring packet file: {path}'
    manifest=json.loads((packet/'FRAME_MANIFEST.json').read_text(encoding='utf-8'))
    assert manifest['character']=='KEN' and manifest['sequence']==kind
    assert manifest['expectedFrames']==expected
    assert manifest['requiredFileNames']==[f'{i:02d}.png' for i in range(1,expected+1)]
    assert manifest['transparentBackgroundRequired'] is True
    assert manifest['minimumSourceBodyHeight']>=240
    assert manifest['inboxDestination'].endswith(f'/{kind}/')
    with Image.open(packet/'_AUTHORING_BOARD.png') as im:
        assert im.width>=1600 and im.height>=900

    inbox=ROOT/f'art-source/ken/inbox/{kind}'
    for name in ['_README.md','_FRAME_MANIFEST.json','_MASTER_REFERENCE.png','_AUTHORING_BOARD.png']:
        assert (inbox/name).exists(), f'missing seeded inbox guide: {kind}/{name}'

# Opaque source must be rejected even when its canvas resolution is large.
with tempfile.TemporaryDirectory() as td:
    d=Path(td)
    for i in range(6):
        im=Image.new('RGB',(512,700),(40,45,55))
        dr=ImageDraw.Draw(im); dr.rectangle((160,120,350,650),fill=(210,40+5*i,30)); im.save(d/f'{i+1:02d}.png')
    p=subprocess.run([sys.executable,str(INSTALL),'idle',str(d),'--preview-only'],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    assert p.returncode in (1,2), p.stdout
    assert 'opaque source background detected' in p.stdout, p.stdout

# Directory source sidecar should be honored and underscore guides ignored as frames.
import importlib.util
spec=importlib.util.spec_from_file_location('ken_ingest',INGEST)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
# Validate inbox discovery in an isolated fixture rather than requiring the real
# authoring inbox to remain empty forever. Once a motion is actively being authored,
# real frame files are expected to coexist with the seeded underscore-prefixed guides.
with tempfile.TemporaryDirectory() as td:
    fake=Path(td)/'idle'; fake.mkdir()
    Image.new('RGBA',(300,400),(255,0,0,0)).save(fake/'_MASTER_REFERENCE.png')
    old=mod.INBOX; mod.INBOX=Path(td)
    try:
        source,sidecar=mod.source_for('idle')
        assert source is None and sidecar is None, 'underscore-only guide inbox must remain pending'
        for i in range(6): Image.new('RGBA',(300,400),(255,0,0,0)).save(fake/f'{i+1:02d}.png')
        (fake/'sequence.json').write_text(json.dumps({'darkBackground':True}),encoding='utf-8')
        source,sidecar=mod.source_for('idle')
        assert source==fake and sidecar==fake/'sequence.json'
        cmd=mod.command_for('idle',6,source,sidecar,preview_only=True)
        assert '--dark-background' in cmd
    finally: mod.INBOX=old

print('KEN_AUTHORING_PACKET_PASS', {'packets':['idle','walk','walk-back','dash','jump','landing','hit','guard','parry','stand-light','stand-heavy','hadoken','shoryuken','tatsumaki','super-rush']})
