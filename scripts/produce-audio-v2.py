import sys,pathlib,subprocess,json,math,random,shutil
work=pathlib.Path(sys.argv[1]); root=pathlib.Path(sys.argv[2]);sys.path.insert(0,str(work/'deps'))
import numpy as np
import mido
ff=str(next((work/'deps/imageio_ffmpeg/binaries').glob('ffmpeg*.exe')))
fluid=str(next((work/'fluidsynth').rglob('fluidsynth.exe')));font=work/'GeneralUser-GS.sf2'
score=root/'public/audio/score-v2'; sfx=root/'public/audio/sfx-v2';source=root/'art-source/audio-v2'
for p in [score,sfx,source,work/'renders']:p.mkdir(parents=True,exist_ok=True)
shutil.copy2(work/'GeneralUser-GS-LICENSE.txt',source/'GeneralUser-GS-LICENSE.txt');shutil.copy2(work/'impact/License.txt',source/'Kenney-Impact-LICENSE.txt')
def run(args):
 p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW)
 if p.returncode:raise RuntimeError(p.stderr.decode(errors='replace')[-3000:])
 return p.stdout

def decode(p):return np.frombuffer(run([ff,'-v','error','-i',str(p),'-f','f32le','-ac','2','-ar','44100','pipe:1']),np.float32).reshape(-1,2).copy()
def wav(p,x):
 run([ff,'-v','error','-y','-f','f32le','-ar','44100','-ac','2','-i','pipe:0',str(p)]) if False else None
 import wave
 with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(44100);f.writeframes((np.clip(x,-.999,.999)*32767).astype('<i2').tobytes())
def respeed(x,r):
 n=max(1,int(len(x)/r)); t=np.linspace(0,len(x)-1,n);return np.stack([np.interp(t,np.arange(len(x)),x[:,i]) for i in range(2)],axis=1)
def trim(x):
 v=np.max(np.abs(x),axis=1);active=np.flatnonzero(v>max(.002,float(v.max())*.018))
 if not len(active):return x[:4410]
 return x[max(0,int(active[0])-100):min(len(x),int(active[-1])+1500)]
def mix(parts,length=None):
 n=length or max(int(d*44100)+len(x) for x,g,d in parts);out=np.zeros((n,2),np.float32)
 for x,g,d in parts:
  at=int(d*44100);count=min(len(x),n-at)
  if count>0:out[at:at+count]+=x[:count]*g
 return out
stats=[]
def encode(name,x,dest,music=False):
 if not len(x):raise RuntimeError('empty '+name)
 x=x/(max(float(np.max(np.abs(x))),.01))* .78
 # Tiny edge ramps remove discontinuities without softening attack timing.
 ramp=min(96,len(x)//8);x[:ramp]*=np.linspace(0,1,ramp)[:,None];x[-ramp:]*=np.linspace(1,0,ramp)[:,None]
 temp=work/'renders'/('master-'+name+'.wav');wav(temp,x)
 filters='highpass=f=30,acompressor=threshold=0.18:ratio=2.2:attack=8:release=120,loudnorm=I=-14:TP=-2:LRA=9' if music else 'highpass=f=35,alimiter=limit=0.79:level=false'
 run([ff,'-v','error','-y','-i',str(temp),'-af',filters,'-ar','44100','-c:a','libvorbis','-q:a','5' if music else '4',str(dest)])
 y=decode(dest);peak=float(np.max(np.abs(y)));rms=float(np.sqrt(np.mean(y*y)));stats.append({'file':str(dest.relative_to(root)), 'seconds':len(y)/44100,'peak':peak,'rms':rms,'bytes':dest.stat().st_size})
 print('PRODUCED',name,round(len(y)/44100,3),dest.stat().st_size,flush=True)

def compose(name,bpm,bars,tonic,style,seed):
 rng=random.Random(seed);mid=mido.MidiFile(ticks_per_beat=480);events=[]
 def event(t,msg):events.append((max(0,round(t*480)),msg))
 def note(ch,n,t,d,v):
  if t>=bars*4:return
  t=max(0,t+rng.uniform(-.007,.007));event(t,mido.Message('note_on',channel=ch,note=max(0,min(127,n)),velocity=max(1,min(127,v+rng.randint(-5,5)))));event(min(t+d,bars*4),mido.Message('note_off',channel=ch,note=n,velocity=0))
 programs={0:33 if style!='funk' else 36,1:30 if style in ['rock','boss','industrial'] else 28,2:61 if style!='temple' else 45,3:4,4:48,5:29 if style in ['rock','boss','industrial'] else 65,6:116}
 for ch,p in programs.items():
  event(0,mido.Message('program_change',channel=ch,program=p));event(0,mido.Message('control_change',channel=ch,control=7,value={0:108,1:76,2:78,3:62,4:61,5:79,6:85}[ch]));event(0,mido.Message('control_change',channel=ch,control=10,value={0:64,1:32,2:92,3:78,4:45,5:60,6:100}[ch]));event(0,mido.Message('control_change',channel=ch,control=91,value=25))
 event(0,mido.Message('program_change',channel=9,program=16 if style in ['rock','boss','industrial'] else 8))
 event(0,mido.Message('control_change',channel=9,control=7,value=106))
 progression=[0,-2,-5,-7,0,3,-5,-1] if style=='temple' else [0,0,-4,-4,-2,-2,-5,-1]
 riff=[0,None,7,10,12,None,10,7,5,None,3,7,10,7,3,None]
 if style=='boss':riff=[0,0,12,10,7,None,5,3,0,None,7,10,12,15,14,10]
 if style=='ending':riff=[0,None,4,7,12,None,11,7,9,None,7,4,2,None,4,7]
 for bar in range(bars):
  at=bar*4; r=tonic+progression[bar%8];phrase=bar//8
  for i in range(16):
   beat=at+i*.25
   note(9,51 if style=='boss' and phrase%2 else 42,beat,.07,72 if i%4==0 else 46 if i%2 else 58)
   if i in [0,6,8,11] or style in ['rock','boss','industrial'] and i in [2,10,14]:note(9,36,beat,.11,112 if i%8==0 else 93)
   if i in [4,12]:note(9,38,beat,.13,113);note(9,39,beat+.012,.07,60)
   if i in [3,10,15] and style in ['funk','street']:note(9,38,beat,.05,34)
   if i==14 and bar%2==1:note(9,46,beat,.15,63)
  if bar%8==0:note(9,49,at,.8,91)
  if bar%4==3:
   for i,n in enumerate([45,47,48,50]):note(9,n,at+3+i*.25,.11,78+i*5)
  # Syncopated electric bass, with restrained octave pickups.
  for off,interval,dur in [(0,0,.43),(.75,0,.18),(1.5,7,.2),(2,12,.38),(2.75,10,.17),(3.25,7,.2),(3.75,12,.16)]:note(0,r+interval,at+off,dur,101 if off%2==0 else 83)
  # Tight muted or distorted guitar power-chord comping, panned against Rhodes.
  for off in ([0,.5,1.5,2,2.5,3.25] if style in ['rock','boss','industrial'] else [.5,1.25,2.5,3.25]):
   for interval in [0,7,12]:note(1,r+12+interval,at+off,.16 if style!='ending' else .45,67)
  for off in [0,2]:
   for interval in [0,3 if style!='ending' else 4,7,10]:note(3,r+24+interval,at+off,1.1,46)
  if style in ['boss','temple','industrial','ending']:
   for interval in [0,7,15]:note(4,r+24+interval,at,3.7,43+phrase%2*8)
  if style=='temple':
   for off in [0,1.5,2,3.5]:note(6,48 if off%2==0 else 55,at+off,.3,94)
  if bar%2==0:
   for off in [.75,2.75]:
    for interval in [0,7,15]:note(2,r+24+interval,at+off,.19,74)
  if bar%8 in [0,1,2,4,5,6] or style=='ending':
   for i,interval in enumerate(riff):
    if interval is None or i%2 and bar%2:continue
    note(5,r+24+interval+(12 if phrase%2 else 0),at+i*.25,.22 if i not in [4,12] else .37,78 if i%4==0 else 65)
  if bar%8==7:
   for i,interval in enumerate([12,10,7,5,3,2,1,0]):note(5,r+24+interval,at+i*.5,.27,78+i*2)
 track=mido.MidiTrack();mid.tracks.append(track);track.append(mido.MetaMessage('set_tempo',tempo=mido.bpm2tempo(bpm),time=0));track.append(mido.MetaMessage('track_name',name='Original '+name,time=0));last=0
 for tick,msg in sorted(events,key=lambda q:(q[0],q[1].type!='note_off')):track.append(msg.copy(time=tick-last));last=tick
 track.append(mido.MetaMessage('end_of_track',time=1920));midi=source/(name+'.mid');mid.save(str(midi));raw=work/'renders'/(name+'.wav')
 run([fluid,'-ni','-q','-g','.55','-r','44100','-o','synth.reverb.active=1','-o','synth.chorus.active=0','-F',str(raw),str(font),str(midi)])
 x=decode(raw);length=round(bars*4*60/bpm*44100);out=x[:length].copy()
 # Fold the rendered release tail onto the loop's opening rather than fading music away.
 tail=x[length:length+min(44100,len(x)-length)];out[:len(tail)]+=tail
 encode(name,out,score/(name+'.ogg'),True)

tracks=[('title-theme',144,16,38,'rock',11),('select-theme',160,16,40,'funk',22),('stage1-theme',160,32,38,'street',31),('stage2-theme',164,32,40,'funk',42),('stage3-theme',162,32,33,'rock',53),('stage4-theme',164,32,38,'temple',64),('stage5-theme',168,32,36,'industrial',75),('final-boss-theme',172,32,40,'boss',86),('ending-theme',120,16,36,'ending',97)]
for args in tracks:compose(*args)
A=work/'impact/Audio'
def sample(name,rate=1):return trim(respeed(decode(A/name),rate))
whoosh=trim(decode(work/'kick-whoosh-generated.mp3'));encode('whoosh',whoosh,sfx/'whoosh.ogg')
for i in range(3):
 punch=sample('impactPunch_medium_%03d.ogg'%i);body=sample('impactSoft_heavy_%03d.ogg'%i,.82);snap=sample('impactGeneric_light_%03d.ogg'%i,1.1)
 encode('hit-light-'+str(i),mix([(punch,.9,0),(snap,.22,.002),(body,.4,.005)]),sfx/('hit-light-'+str(i)+'.ogg'))
 heavy=sample('impactPunch_heavy_%03d.ogg'%i,.82);wood=sample('impactWood_heavy_%03d.ogg'%i,.68)
 encode('hit-heavy-'+str(i),mix([(heavy,1,0),(body,.7,.004),(wood,.16,.009)]),sfx/('hit-heavy-'+str(i)+'.ogg'))
for i in range(2):
 encode('block-'+str(i),mix([(sample('impactSoft_heavy_%03d.ogg'%i),.9,0),(sample('impactPunch_medium_%03d.ogg'%i,.9),.35,.003)]),sfx/('block-'+str(i)+'.ogg'))
 encode('parry-'+str(i),mix([(sample('impactMetal_light_%03d.ogg'%i,1.3),.8,0),(sample('impactGlass_light_%03d.ogg'%i,1.15),.15,.002),(sample('impactPunch_medium_%03d.ogg'%i),.35,0)]),sfx/('parry-'+str(i)+'.ogg'))
encode('super-start',mix([(whoosh,.8,0),(sample('impactBell_heavy_001.ogg',.75),.35,.02),(sample('impactSoft_heavy_001.ogg',.6),.6,0)]),sfx/'super-start.ogg')
encode('super-impact',mix([(sample('impactPunch_heavy_002.ogg',.65),1,0),(sample('impactWood_heavy_002.ogg',.55),.25,.003),(whoosh,.25,.04),(sample('impactSoft_heavy_002.ogg',.55),.8,.008)]),sfx/'super-impact.ogg')
encode('ko',mix([(sample('impactPunch_heavy_003.ogg',.55),1,0),(sample('impactPlank_medium_003.ogg',.6),.3,.02),(sample('impactSoft_heavy_003.ogg',.5),.8,.04)]),sfx/'ko.ogg')
encode('ui',sample('impactWood_light_000.ogg',1.45),sfx/'ui.ogg')
encode('victory',mix([(sample('impactBell_heavy_004.ogg',1.0),.55,0),(sample('impactBell_heavy_004.ogg',1.25),.48,.12),(sample('impactBell_heavy_004.ogg',1.5),.42,.24)]),sfx/'victory.ogg')
(source/'production-metrics.json').write_text(json.dumps(stats,indent=2)+'\n')
(source/'score-cues.json').write_text(json.dumps([dict(zip(['key','bpm','bars','rootMidi','arrangement','seed'],x)) for x in tracks],indent=2)+'\n')
print('AUDIO_PRODUCTION_COMPLETE',len(stats),flush=True)
