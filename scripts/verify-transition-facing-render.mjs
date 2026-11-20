import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequencesFor} from '../dist/assets/render/AnimationSequenceLibrary.js';
import {animationTransitionSample as sample} from '../dist/assets/render/AnimationTransitionProfiles.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],unavailable=process.argv.includes('--unavailable');
const assets=new Map(roster.flatMap(c=>animationSequencesFor(c.id,true).map(s=>[s.asset,s])));
globalThis.Image=class{complete=!unavailable;set src(v){this.url=v;const s=assets.get(v);this.naturalWidth=unavailable?0:s?s.frameWidth*s.frameCount:384;this.naturalHeight=448;if(!unavailable)this.onload?.();}get src(){return this.url;}};
const {runtimeQuality}=await import('../dist/assets/core/RuntimeQuality.js');runtimeQuality.setTier('high');
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
const cases=[['dash-attack','walk','attack',1],['landing-attack','jump','attack',1],['parry-punish','parry','attack',-1],['crouch-attack','crouch','attack',-1],['attack-neutral','attack','idle',1],['landing-neutral','jump','idle',0]];
let renders=0,mirrors=0,authoredDraws=0,vectorDraws=0;
for(const c of roster)for(const [kind,from,to,direction] of cases){const pairs=[];
 for(const facing of[-1,1]){const f=new Fighter(c,'player',400,500,facing,c.superArts[0]);f.state=from;f.dashFrames=kind==='dash-attack'?4:0;f.airborne=from==='jump';sample(f);f.state=to;f.airborne=false;f.dashFrames=0;f.landingFrames=kind.startsWith('landing')?8:0;f.currentMove=to==='attack'?normalFor('hp',false,c.id):null;
 const expected=sample(f);assert.equal(expected.kind,kind);
 const translations=[],rotations=[],scales=[],images=[];let vectors=0;
 const ctx=new Proxy({globalAlpha:1,translate:(...a)=>translations.push(a),rotate:a=>rotations.push(a),scale:(...a)=>scales.push(a),drawImage:(...a)=>images.push(a),fill:()=>vectors++,stroke:()=>vectors++,createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 drawCombatFighter(ctx,f,0,0);assert.deepEqual(translations[0],[400,500]);const offset=translations[1];
 if(direction)assert(Math.sign(offset[0])===facing*direction,c.id+' '+kind+' must shift toward its facing-relative direction');else assert.equal(offset[0],0);
 assert.deepEqual(offset,[expected.offsetX,expected.offsetY],'Renderer applies the world-space offset exactly once');assert.equal(rotations[0],expected.rotation);assert.deepEqual(scales[0],[expected.scaleX,expected.scaleY]);
 if(!unavailable){assert(images.some(a=>assets.has(a[0].src)),'Exercise authored renderer');authoredDraws++;}else{assert.equal(images.length,0);assert(vectors>0,'Exercise vector fallback');vectorDraws++;}
 pairs.push({offset,rotation:rotations[0],scale:scales[0]});renders++;
 }
 assert(Math.abs(pairs[0].offset[0]+pairs[1].offset[0])<1e-10,'Opposite-facing world offsets must mirror');assert.equal(pairs[0].offset[1],pairs[1].offset[1]);assert.equal(pairs[0].rotation,-pairs[1].rotation);assert.deepEqual(pairs[0].scale,pairs[1].scale);mirrors++;
}
console.log('TRANSITION_FACING_RENDER_PASS',{unavailable,renders,mirrors,authoredDraws,vectorDraws});
