import assert from 'node:assert/strict';
import {Stage1Scene} from '../dist/assets/scenes/Stage1Scene.js';
import {CHARACTERS} from '../dist/assets/game/characters.js';
const audio=new Proxy({}, {get:()=>()=>{}});
function setup(kind,remaining,c=CHARACTERS[0]) {
 let press=[],held=[],epoch=0,tick=0;
 const input={pressed:k=>press.includes(k),held:k=>held.includes(k),released:()=>false,directionChanges:()=>[],get historyEpoch(){return epoch;}};
 const s=new Stage1Scene(input,audio,c,c.superArts[0],5);
 s.introFrames=0;
 if(kind==='intro')s.introFrames=remaining;
 if(kind==='wave')s.waveBreakFrames=remaining;
 if(kind==='duel'){s.prepareDuel();s.phase='transition';s.phaseFrames=remaining;}
 if(kind==='final'){s.prepareFinalDuel();s.phase='final-transition';s.phaseFrames=remaining;}
 const world=s.world, f=world.player;
 for(const e of world.enemies)e.updateAiDirected=()=>{};
 return{s,f,step(buttons=[],holds=[]){press=buttons;held=holds;s.fixedUpdate(1/60,++tick);press=[];},reset(){epoch++;},world};
}
let cases=0;
for(const c of CHARACTERS)for(const kind of ['intro','wave','duel','final'])for(const remaining of [1,3,6])for(const button of ['lp','hp','jump']){
 const t=setup(kind,remaining,c),hp=t.f.hp,gauge=t.f.superGauge,worldTime=t.world.time;
 t.step([button]);assert.equal(t.f.currentMove,null,'No action may begin before combat');
 for(let n=1;n<remaining;n++)t.step();
 assert.equal(t.world.time,worldTime,'Countdown must keep combat frozen');assert.equal(t.f.hp,hp);assert.equal(t.f.superGauge,gauge);
 t.step();
 if(button==='jump')assert(t.f.airborne,'Released jump near readiness must survive '+c.id+'/'+kind+'/'+remaining);
 else assert.equal(t.f.currentMove?.button,button,'Released attack near readiness must survive '+c.id+'/'+kind+'/'+remaining);
 cases++;
}
let boundaries=0;
for(const kind of ['intro','wave','duel','final'])for(const invalid of ['early','epoch']){
 const t=setup(kind,invalid==='early'?7:3);
 t.step(['lp']);if(invalid==='epoch')t.reset();
 for(let n=1;n<(invalid==='early'?7:3);n++)t.step();t.step();
 assert.equal(t.f.currentMove,null,'Old/focus-invalidated taps must not leak into combat');boundaries++;
}
for(const kind of ['intro','wave','duel','final']){
 const t=setup(kind,3);t.step(['lp']);t.step();t.step();t.step(['hp']);
 assert.equal(t.f.currentMove?.button,'hp','Fresh input takes priority');
}
console.log('TRANSITION_READY_INPUT_PASS',{cases,boundaries,freshPriority:4});

for(const kind of ['intro','wave','duel','final']){
 const t=setup(kind,3,CHARACTERS.find(c=>c.id==='KEN'));
 t.step([],['down']);t.step([],['down','right']);t.step(['lp'],['right']);t.step();
 assert.equal(t.f.currentMove?.id,'KEN_PRIMARY','Motion completed in ready window keeps special priority');
 const move=t.f.currentMove; t.step();assert.equal(t.f.currentMove,move,'Buffered action fires once');
}
console.log('TRANSITION_READY_COMMAND_PASS',{commands:4,once:4});

{
 const t=setup('wave',1);
 t.f.hp=500;
 const apple=t.world.belt.spawnPickup('apple',t.f.x,t.f.y);
 apple.z=apple.vz=0;
 t.step(['hp']);
 assert.equal(t.f.currentMove,null);
 t.step(['lp']);
 assert.equal(t.f.hp,660,'A fresh punch on the first combat tick must still collect food');
 assert.equal(t.f.currentMove,null,'A consumed pickup input must take priority over a buffered punch');
 t.step();
 assert.equal(t.f.currentMove,null,'The old punch must not fire on a later tick');
 t.step(['lp']);
 assert.equal(t.f.currentMove?.button,'lp','A fresh attack after pickup must still work');
}
