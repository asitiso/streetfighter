import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {victimReactionSample} from '../dist/assets/render/VictimReactionProfiles.js';
globalThis.Image=class{complete=true;naturalWidth=0;naturalHeight=0;set src(v){this.url=v;if(v)this.onerror?.();}get src(){return this.url;}};
const {drawCombatFighter}=await import('../dist/assets/render/Visuals.js');
function draw(f,alpha){let m=[1,0,0,1,0,0];const paints=[],stack=[],o={globalAlpha:1,filter:'none'};
 const ctx=new Proxy(o,{get(o,k){if(k in o)return o[k];if(['fill','stroke','fillRect'].includes(k))return()=>paints.push({kind:k,matrix:[...m]});return ({save(){stack.push({m:[...m],alpha:o.globalAlpha,filter:o.filter});},restore(){const s=stack.pop();m=s.m;o.globalAlpha=s.alpha;o.filter=s.filter;},translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},rotate(a){const c=Math.cos(a),s=Math.sin(a),[aa,b,cc,d]=m;m[0]=aa*c+cc*s;m[1]=b*c+d*s;m[2]=cc*c-aa*s;m[3]=d*c-b*s;},drawImage(im,...args){paints.push({kind:'image',asset:im.src,matrix:[...m],args});},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})})[k]??(()=>{});}});
 drawCombatFighter(ctx,f,alpha,.5);assert.equal(stack.length,0);assert(paints.length>0);return paints;
}
const quiet={held:()=>false,pressed:()=>false,released:()=>false},roster=[...CHARACTERS,...BOSS_CHARACTERS];
let cases=0,settleControls=0,hitControls=0,paints=0;
for(const c of roster)for(const facing of [-1,1])for(const crouch of [false,true])for(const incoming of ['lp','lk'])for(const next of ['lp','mp','hp','hk']){
 const w=new CombatWorld(c,getCharacter('RYU'),'duel',c.superArts[0]),f=w.player,e=w.enemy;f.x=f.previousX=500;f.facing=facing;e.x=e.previousX=500+facing*45;e.y=e.previousY=f.y;e.facing=-facing;
 e.startMove(normalFor(incoming,crouch,'RYU'));e.moveFrame=e.currentMove.startup;w.resolveAttack(e,f,quiet);assert.equal(f.state,'hit');assert(victimReactionSample(f).active);hitControls++;
 let ticks=0;while(f.state==='hit'&&ticks++<120)f.updatePlayer(quiet,w.rules);assert.equal(f.state,'idle');assert(f.visualHitSequenceFrames>1);assert(victimReactionSample(f).active,'Idle settling must remain visible');settleControls++;
 f.updatePlayer({...quiet,pressed:k=>k===next},w.rules);assert.equal(f.state,'attack');assert(f.visualHitSequenceFrames>0,'Fixture retains actual hit recoil timer');
 const fresh=new Fighter(c,'player',f.x,f.y,f.facing,c.superArts[0]);fresh.startMove(normalFor(next,false,c.id));
 fresh.hp=f.hp;fresh.superGauge=f.superGauge;fresh.moveFrame=f.moveFrame;fresh.stateFrame=f.stateFrame;fresh.animationFrame=f.animationFrame;
 const before=[f.visualHitSequenceFrames,f.hp,f.superGauge,f.lastHitPower],actual=draw(f,1),expected=draw(fresh,1);assert.equal(actual.length,expected.length);
 for(let i=0;i<actual.length;i++){assert.equal(actual[i].kind,expected[i].kind);assert.notEqual(actual[i].kind,'image','Failed assets must exercise vector fallback');for(let j=0;j<6;j++)assert(Math.abs(actual[i].matrix[j]-expected[i].matrix[j])<1e-8,c.id+' '+incoming+' → '+next+' stale recoil at paint '+i);paints++;}
 assert.deepEqual([f.visualHitSequenceFrames,f.hp,f.superGauge,f.lastHitPower],before,'Drawing cannot alter combat or settling timers');assert.equal(victimReactionSample(f).active,false);cases++;
}
console.log('COUNTERATTACK_RECOIL_PASS',{characters:10,facings:2,cases,settleControls,hitControls,paints,combatTimersPreserved:true,failedAssetsUseCleanAttackPose:true});
