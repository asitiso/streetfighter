"""Adversarial source/runtime/atomic-preservation checks for authored victory."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import importlib.util,json,shutil
from argparse import ArgumentParser
p=ArgumentParser();p.add_argument("--character",default="KEN");CHARACTER=p.parse_args().character;FOLDER=CHARACTER.lower()
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('victory',ROOT/'scripts/build-roster-victory.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=m.roster();motion=r.module();motion.FRAME_W=640;pending,record=m.build(character=CHARACTER);m.validate_runtime(character=CHARACTER);count=0
strip=Image.open(ROOT/f'public/art/animation-hq/{FOLDER}/victory.webp').convert('RGBA');frames=[strip.crop((i*640,0,(i+1)*640,448)) for i in range(8)]
def reject(action,cue=None):
 global count
 try:action()
 except (ValueError,FileNotFoundError) as e:
  if cue:assert cue in str(e),str(e)
  count+=1;return str(e)
 raise AssertionError('Invalid victory input accepted')
reject(lambda:m.qa(frames[:-1],motion),'frame count')
e=json.loads(reject(lambda:m.qa([frames[0]]*8,motion)));assert not e['semantic']['checks']['fourDistinctDrawings'];assert not e['pose']['poseAuthoredPass']
bad=[]
for i in [0,0,2,2,4,4,6,6]:
 cell=Image.new('RGBA',(640,448));cell.alpha_composite(frames[0],(i,0));bad.append(cell)
e=json.loads(reject(lambda:m.qa(bad,motion)));assert not e['pose']['poseAuthoredPass']
bad=list(frames);cell=Image.new('RGBA',(640,448));cell.alpha_composite(frames[2],(15,0));bad[2]=cell;e=json.loads(reject(lambda:m.qa(bad,motion)));assert not e['semantic']['checks']['plantedFeet']
reject(lambda:m.build(character='NO_SUCH_CHARACTER'),'Unsupported')
with TemporaryDirectory() as td:
 root=Path(td);directory=root/f'public/art/animation-hq/{FOLDER}';directory.mkdir(parents=True);source=root/f'art-source/roster-idle/{FOLDER}/victory-sheet.png';source.parent.mkdir(parents=True)
 for name in ['manifest.json','idle.webp']:shutil.copy2(ROOT/f'public/art/animation-hq/{FOLDER}'/name,directory/name)
 shutil.copy2(ROOT/f'art-source/roster-idle/{FOLDER}/victory-sheet.png',source);new,rec=m.build(root,CHARACTER);r.write_pending(new);m.validate_runtime(root,CHARACTER);original={p:p.read_bytes() for p in new};asset=directory/'victory.webp';manifest=directory/'manifest.json'
 asset.write_bytes(b'corrupt');reject(lambda:m.validate_runtime(root,CHARACTER),'mismatch');asset.write_bytes(original[asset])
 data=json.loads(original[manifest]);next(x for x in data['records'] if x['id']=='victory')['sourceOrder'][0]=4;manifest.write_text(json.dumps(data));reject(lambda:m.validate_runtime(root,CHARACTER),'mismatch');manifest.write_bytes(original[manifest])
 data=json.loads(original[manifest]);data['character']='MISMATCH';manifest.write_text(json.dumps(data));reject(lambda:m.build(root,CHARACTER),'Character manifest');manifest.write_bytes(original[manifest])
 original_source=source.read_bytes();Image.new('RGBA',(1024,1536),(255,0,0,255)).save(source);reject(lambda:m.build(root,CHARACTER),'transparent');source.write_bytes(original_source)
 source.unlink();reject(lambda:m.build(root,CHARACTER));source.write_bytes(original_source)
 idle=directory/'idle.webp';idle_original=idle.read_bytes();idle.write_bytes(b'corrupt');reject(lambda:m.build(root,CHARACTER),'Idle reference checksum');idle.write_bytes(idle_original)
 write=Path.write_bytes;failed=[False]
 def fail(path,data):
  if path==manifest and not failed[0]:failed[0]=True;raise OSError('Injected manifest failure')
  return write(path,data)
 try:
  with patch.object(Path,'write_bytes',fail):r.write_pending({asset:b'replaced',manifest:b'replaced'})
 except OSError:pass
 else:raise AssertionError('Expected atomic failure')
 assert all(p.read_bytes()==b for p,b in original.items());count+=1
 assert json.loads(m.build(root,CHARACTER)[0][manifest])==json.loads(original[manifest]);count+=1
print('VICTORY_INGEST_PASS',{'negativeAndPreservationChecks':count,'frames':8,'distinctDrawings':4})
