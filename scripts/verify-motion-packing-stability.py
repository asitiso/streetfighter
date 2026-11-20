from pathlib import Path
import importlib.util
root=Path(__file__).resolve().parents[1]
for filename,kind in [('build-walk-back-motion-v2.py','walk-back'),('build-walk-forward-motion-v2.py','walk')]:
 spec=importlib.util.spec_from_file_location('packing_'+kind,root/'scripts'/filename);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 frames=module.frames_from((root/f'public/art/animation-hq/ryu/{kind}.webp').read_bytes())
 full,full_encoding=module.pack(frames,10_000_000)
 assert full_encoding['rgb']=='lossless'
 # A lower budget selects lossy RGB, as the original installed asset did.
 from io import BytesIO
 from PIL import Image
 strip=Image.new('RGBA',(frames[0].width*len(frames),448))
 for index,frame in enumerate(frames):strip.alpha_composite(frame,(frames[0].width*index,0))
 encoded=BytesIO();strip.save(encoded,'WEBP',quality=100,method=6)
 budget=(len(full)+len(encoded.getvalue()))//2
 assert len(encoded.getvalue())<budget<len(full)
 original,encoding=module.pack(frames,budget)
 assert encoding['rgb']=='lossy' and encoding['quality']==100
 rebuilt,rebuilt_encoding=module.pack(frames,10_000_000,encoding)
 assert rebuilt==original and rebuilt_encoding==encoding,'More headroom changed accepted bytes'
 same_full,same_full_encoding=module.pack(frames,10_000_000,full_encoding)
 assert same_full==full and same_full_encoding==full_encoding
 for limit,settings in [(len(original),encoding),(10_000_000,{**encoding,'quality':94}),(10_000_000,{**encoding,'alphaLossless':False})]:
  try:module.pack(frames,limit,settings)
  except (ValueError,AssertionError):pass
  else:raise AssertionError('Cap or encoding validation bypassed')
 print('MOTION_PACKING_STABILITY_PASS',kind,'headroom change preserves accepted bytes; invalid caps/settings rejected')
