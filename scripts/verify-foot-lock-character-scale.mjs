import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationFrameProfile} from '../dist/assets/render/AnimationFrameProfiles.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS].filter(c=>!process.argv.includes('--unit-only')||c.id==='RYU');
const assets=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=true;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function context(){
 let m=[1,0,0,1,0,0];const stack=[],images=[],shadows=[];
 function multiply([a,b,c,d,e,f]){const [A,B,C,D,E,F]=m;m=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*e+C*f+E,B*e+D*f+F];}
 const ctx=new Proxy({globalAlpha:1,save(){stack.push([...m]);},restore(){m=stack.pop();},
 translate(x,y){multiply([1,0,0,1,x,y]);},scale(x,y){multiply([x,0,0,y,0,0]);},
 rotate(t){multiply([Math.cos(t),Math.sin(t),-Math.sin(t),Math.cos(t),0,0]);},
 ellipse(){shadows.push([...m]);},drawImage(...args){images.push({m:[...m],args});},
 createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},
 {get:(o,k)=>k in o?o[k]:(()=>{})});return {ctx,images,shadows};
}
let checks=0,nonzeroChecks=0,scaledChecks=0;const coverage=new Set();
for(const c of roster)for(const facing of[-1,1])for(const kind of['idle','walk','walk-back','landing','guard','parry']){
 const seen=new Set();
 for(let age=0;age<=120;age++){
  const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);
  f.state=kind==='walk'||kind==='walk-back'?'walk':kind==='guard'?'block':kind==='parry'?'parry':'idle';
  f.stateFrame=kind==='guard'?-age:kind==='parry'?-age:age;
  if(kind==='walk'||kind==='walk-back')f.previousX=f.x-facing*(kind==='walk'?1:-1);
  if(kind==='landing')f.landingFrames=8-age;
  const s=animationSequenceSample(f,0);if(s?.sequence.kind!==kind||seen.has(s.frame))continue;
  seen.add(s.frame);const p=animationFrameProfile(c.id,kind),strength=s.sequence.footLock?p.footLockStrength:0;
  const ax=(p.anchorX[s.frame]??0)*strength,ay=(p.anchorY[s.frame]??0)*strength;
  const out=context();drawCombatFighter(out.ctx,f,1,0);
  const body=out.images.filter(x=>x.args[0].src===s.sequence.asset);assert.equal(body.length,1);
  assert.equal(out.shadows.length,1);const m=body[0].m,base=out.shadows[0];
  // A source landmark displaced opposite the declared correction must map to
  // the same ground origin regardless of character shape or facing.
  const px=-ax/2,py=-ay/2;
  const x=m[0]*px+m[2]*py+m[4],y=m[1]*px+m[3]*py+m[5];
  assert(Math.abs(x-base[4])<1e-8&&Math.abs(y-base[5])<1e-8,
   c.id+' '+kind+' frame'+s.frame+' facing'+facing+' anchor residual '+JSON.stringify([x-base[4],y-base[5]]));
  checks++;if(ax||ay){nonzeroChecks++;if(c.widthScale!==1||c.heightScale!==1)scaledChecks++;}
  coverage.add(c.id+':'+kind);
 }
}
assert.equal(coverage.size,roster.length*6);assert(nonzeroChecks>0);
if(!process.argv.includes('--unit-only'))assert(scaledChecks>0);
console.log('FOOT_LOCK_CHARACTER_SCALE_PASS',{characters:roster.length,checks,nonzeroChecks,scaledChecks});
