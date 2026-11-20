import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {throwMoveFor,normalFor} from '../dist/assets/combat/MoveLibrary.js';
import {InputManager} from '../dist/assets/input/InputManager.js';
const recording=process.argv.includes('--record-controls'),roster=[...CHARACTERS,...BOSS_CHARACTERS];
globalThis.window=new EventTarget();globalThis.document=new EventTarget();
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
function fixture(c,mode,side,edgeRole,wall,central=false){
 const w=new CombatWorld(c,c,mode),input=new InputManager(),a=side==='player'?w.player:w.enemy,d=side==='player'?w.enemy:w.player;
 const sign=wall==='left'?-1:1,edge=central?600:wall==='left'?w.rules.arenaLeft:w.rules.arenaRight,outer=edgeRole==='attacker'?a:d,inner=outer===a?d:a;
 outer.x=outer.previousX=edge;inner.x=inner.previousX=edge-sign*60;
 a.y=a.previousY=d.y=d.previousY=500;
 a.facing=d.x>=a.x?1:-1;d.facing=-a.facing;
 a.startMove(throwMoveFor(c.id));a.moveFrame=a.currentMove.startup-1;
 if(d===w.player){input.setTouch('lp',true);input.setTouch('lk',true);input.setTouch('lp',false);input.setTouch('lk',false);}
 else{d.startMove(normalFor('lp',false,c.id));d.aiCooldown=10;}
 return{w,input,a,d,outer,edge,sign};
}
let cases=0,frozenChecks=0,centralControls=0;
const physics=createHash('sha256');
for(const c of roster)for(const mode of ['belt','duel'])for(const side of ['player','enemy'])for(const edgeRole of ['attacker','defender'])for(const wall of ['left','right']){
 const f=fixture(c,mode,side,edgeRole,wall);try{
  const hp=[f.a.hp,f.d.hp],gauge=[f.a.superGauge,f.d.superGauge];
  f.input.prepareTick();f.w.update(f.input,1);f.input.endTick();
  assert(f.w.events.some(e=>e.type==='throw-escape'),'Real throw resolution must trigger an escape');
  assert.equal(f.a.throwEscapeFrames,12);assert.equal(f.d.throwEscapeFrames,12);
  if(!recording)assert.equal(f.outer.x,f.edge,c.id+'/'+mode+'/'+side+'/'+edgeRole+'/'+wall+' escape must stay in arena');
  assert.deepEqual([f.a.hp,f.d.hp],hp);assert.deepEqual([f.a.superGauge,f.d.superGauge],gauge);
  assert.equal(f.w.totalPlayerDamage,0);assert.equal(f.w.totalEnemyDamage,0);
  for(let tick=2;tick<=5;tick++){const clocks=[f.a.animationFrame,f.d.animationFrame];f.input.prepareTick();f.w.update(f.input,tick);f.input.endTick();assert.deepEqual([f.a.animationFrame,f.d.animationFrame],clocks,'Escape hitstop timing unchanged');if(!recording)assert.equal(f.outer.x,f.edge);frozenChecks++;}
  cases++;
 }finally{f.input.destroy();}
}
for(const c of roster)for(const mode of ['belt','duel'])for(const side of ['player','enemy'])for(const edgeRole of ['attacker','defender'])for(const wall of ['left','right']){
 const f=fixture(c,mode,side,edgeRole,wall,true);try{for(let tick=1;tick<=16;tick++){f.input.prepareTick();f.w.update(f.input,tick);f.input.endTick();physics.update(JSON.stringify({actors:[f.a,f.d].map(a=>[a.x,a.y,a.hp,a.superGauge,a.state,a.stateFrame,a.moveFrame,a.currentMove?.id??null,a.animationFrame,a.hitStop,a.throwEscapeFrames]),events:f.w.events.map(e=>[e.type,e.x,e.y,e.ttl])}));}centralControls++;}finally{f.input.destroy();}
}
const digest=physics.digest('hex');
if(!recording)assert.equal(digest,'28c8726fa1614dcee0a9949b12cb808fbced0f68520f0b2aa4f47ae8763e8253','Central throw escape physics and timing must remain unchanged');
console.log(JSON.stringify({passed:true,recording,cases,frozenChecks,centralControls,physics:digest}));
