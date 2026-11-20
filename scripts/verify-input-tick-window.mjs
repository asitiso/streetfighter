import assert from 'node:assert/strict';
import{InputBuffer}from'../dist/assets/combat/InputBuffer.js';import{Fighter}from'../dist/assets/combat/Fighter.js';import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';import{specialMovesFor,throwMoveFor}from'../dist/assets/combat/MoveLibrary.js';import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';import{Stage1Scene}from'../dist/assets/scenes/Stage1Scene.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],recordOnly=process.argv.includes('--record-active'),quiet=()=>input(),rows=[];let windowControls=0,activeCases=0,expiredCases=0,sceneCases=0,throwEscapeControls=0;
function input(held=[],pressed=[]){return{held:k=>held.includes(k),pressed:k=>pressed.includes(k),released:()=>false};}
function rules(mode){return{mode,depthMovement:mode==='belt',laneTolerance:mode==='belt'?54:22,arenaLeft:120,arenaRight:1160,arenaTop:mode==='belt'?394:500,arenaBottom:mode==='belt'?580:500};}
function pathFor(command,facing){const F=facing===1?'right':'left',B=facing===1?'left':'right',D=['down'],DF=['down',F],DB=['down',B];return command==='dp'?[[F],D,DF]:command==='qcb'?[D,DB,[B]]:command==='super'?[D,DF,[F],D,DF,[F]]:[D,DF,[F]];}
function attackFor(command){return command==='qcb'?['lk']:command==='ex'?['lp','mp']:['lp'];}
function expectedMove(c,command){const s=specialMovesFor(c.id);return command==='dp'?s.antiAir:command==='qcb'?s.mobility:command==='ex'?s.exPrimary:command==='super'?s.super:s.primary;}
if(!recordOnly){
 for(const facing of [-1,1])for(const within of [11,14,16,24])for(const base of [0,10000]){const F=facing===1?'right':'left';
  const b=new InputBuffer();b.capture(input(['down']),base);b.capture(input(['down',F]),base+2);b.capture(input([F],[F]),base+4);b.capture(quiet(),base+within-1);assert(b.motion(['D','DF','F'],facing,within));assert(b.pressedWithin(F,within));b.capture(quiet(),base+within);assert(!b.motion(['D','DF','F'],facing,within),'Old first token must expire at exact boundary');b.capture(quiet(),base+within+4);assert(!b.pressedWithin(F,within),'Old button edge must expire by tick');assert(!b.pressedWithin(F,0));assert(!b.motion(['D','DF','F'],facing,0));windowControls+=5;
  for(const age of [within-1,within,600]){const t=new InputBuffer();t.capture(input([F],[F]),base);t.capture(quiet(),base+1);t.capture(input([F],[F]),base+age);assert.equal(t.doubleTap(F,within),age<within,'Double tap uses elapsed ticks');windowControls++;}
 }
}
for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const command of ['qcf','qcb','dp','ex','super'])for(const dwell of [1,2])for(const base of [0,10000]){
 const f=new Fighter(c,'player',600,500,facing);f.superGauge=1000;const r=rules(mode),path=pathFor(command,facing),trace=[];let previous=[],tick=base;
 function step(held,pressed){const i=input(held,pressed);f.captureInput(i,tick++);f.updatePlayer(i,r);trace.push([f.x,f.y,f.state,f.stateFrame,f.animationFrame,f.moveFrame,f.currentMove?.id??null,f.superGauge,f.parryWindow,f.lowParryWindow]);}
 for(const held of path){for(let d=0;d<dwell;d++){step(held,held.filter(k=>!previous.includes(k)));previous=held;}}
 const attack=attackFor(command);step([...path.at(-1),...attack],attack);assert.equal(f.currentMove?.id,expectedMove(c,command).id,c.id+' active '+command);rows.push({c:c.id,mode,facing,command,dwell,base,trace});activeCases++;
}
if(!recordOnly){
 for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const command of ['qcf','qcb','dp','ex','super'])for(const gap of [30,600,3600]){
  const f=new Fighter(c,'player',600,500,facing);f.superGauge=1000;const r=rules(mode),path=pathFor(command,facing);let previous=[];
  for(const[t,held]of path.entries()){const i=input(held,held.filter(k=>!previous.includes(k)));f.captureInput(i,t);f.updatePlayer(i,r);previous=held;}
  const attack=attackFor(command),i=input(attack,attack);f.captureInput(i,path.length+gap);f.updatePlayer(i,r);assert.equal(f.currentMove?.id,command==='qcb'?'5LK':'5LP',c.id+' expired '+command+' must not revive after tick gap');assert.equal(f.superGauge,1000,'Expired command must not spend EX/super gauge');expiredCases++;
 }
 for(const c of roster)for(const mode of ['belt','duel'])for(const facing of [-1,1])for(const command of ['qcf','dash']){
  let current=quiet();const live={held:k=>current.held(k),pressed:k=>current.pressed(k),released:()=>false},s=new Stage1Scene(live,{playStagePulse(){},setPaused(){}},c,c.superArts[0],1);s.enter();s.introFrames=0;if(mode==='duel')s.prepareDuel();s.phase=mode;const f=s.world.player,e=s.world.enemy;f.x=f.previousX=600;e.x=e.previousX=600+facing*300;e.updateAiDirected=()=>{};e.updateAi=()=>{};const F=facing===1?'right':'left',path=command==='qcf'?pathFor('qcf',facing):[[F],[],[]];let previous=[];
  for(const[t,held]of path.entries()){current=input(held,held.filter(k=>!previous.includes(k)));s.fixedUpdate(1/60,t);previous=held;}
  current=input(['start'],['start']);s.fixedUpdate(1/60,3);assert(s.paused);const last=f.buffer.latest().tick;for(let t=4;t<604;t++){current=quiet();s.fixedUpdate(1/60,t);}assert.equal(f.buffer.latest().tick,last,'Paused scene must not capture new combat input');current=input(['start'],['start']);s.fixedUpdate(1/60,604);assert(!s.paused);
  current=command==='qcf'?input(['lp'],['lp']):input([F],[F]);s.fixedUpdate(1/60,605);if(command==='qcf')assert.equal(f.currentMove?.id,'5LP',c.id+' actual menu resume must punch normally');else{assert.equal(f.dashFrames,0,c.id+' actual menu resume must not revive double tap');assert.equal(f.state,'walk');}sceneCases++;
 }
 for(const c of roster)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const age of [4,5,600]){const w=new CombatWorld(c,c,mode),d=w.player,a=w.enemy;d.x=600;a.x=600+facing*40;d.y=a.y=500;a.facing=-facing;d.facing=facing;d.captureInput(input(['lp','lk'],['lp','lk']),0);d.captureInput(quiet(),age);a.startMove(throwMoveFor(c.id));a.moveFrame=a.currentMove.startup;const hp=d.hp;w.resolveAttack(a,d,quiet());if(age<5){assert(w.events.some(e=>e.type==='throw-escape'));assert.equal(d.hp,hp);}else{assert(!w.events.some(e=>e.type==='throw-escape'),'Expired LP+LK must not escape a new throw');assert(d.hp<hp);}throwEscapeControls++;}
 console.log('INPUT_TICK_WINDOW_PASS',{windowControls,activeCases,expiredCases,sceneCases,throwEscapeControls,characters:10,modes:2,facings:2,commands:5,pausedMenuAndSparseCapturesCovered:true});
}else console.log(JSON.stringify(rows));
