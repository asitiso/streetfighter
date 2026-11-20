import assert from 'node:assert/strict';
import{CHARACTERS,BOSS_CHARACTERS,getCharacter}from'../dist/assets/game/characters.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{Fighter}from'../dist/assets/combat/Fighter.js';
import{normalFor}from'../dist/assets/combat/MoveLibrary.js';
import{animationSequenceSample as sample}from'../dist/assets/render/AnimationTimingMapper.js';
const quiet={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,freezeChecks=0,wallChecks=0,reversals=0,controls=0,dashTransitions=0;
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const mode of['duel','belt'])for(const facing of[-1,1])for(const direction of[-1,1])for(const actor of['player','ai']){
 const w=new CombatWorld(c,getCharacter('RYU'),mode),f=w.player,r=w.rules;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;
 const target=new Fighter(getCharacter('RYU'),'enemy',600+facing*1000,f.y,-facing);
 function step(dir=direction,depth=false){const input={...quiet,held:k=>depth?k==='up':k===(dir<0?'left':'right')};if(actor==='player')f.updatePlayer(input,r);else{target.x=f.x+facing*1000;f.updateAiDirected(target,r,{role:'attack',desiredX:depth?f.x:f.x+dir*1000,desiredY:depth?f.y-100:f.y,attackAllowed:false,rangedAllowed:false});}}
 const expected=direction===facing?'walk':'walk-back';for(let i=0;i<3;i++){step();assert.equal(sample(f,0)?.sequence.kind,expected);}
 let frozen=sample(f,0);f.hitStop=3;for(let i=0;i<3;i++){const pos=[f.x,f.y];step();assert.deepEqual([f.x,f.y],pos);assert.deepEqual(sample(f,0),frozen,c.id+' '+actor+' freeze must retain walking strip and frame');freezeChecks++;}
 step();assert.equal(sample(f,0)?.sequence.kind,expected);
 f.x=f.previousX=direction<0?r.arenaLeft:r.arenaRight;for(let i=0;i<4;i++){step();assert.equal(f.x,f.previousX);assert.equal(sample(f,0)?.sequence.kind,expected,c.id+' '+actor+' clamped walking must retain intended direction');wallChecks++;}
 frozen=sample(f,0);f.hitStop=2;for(let i=0;i<2;i++){step();assert.deepEqual(sample(f,0),frozen);freezeChecks++;}
 step(-direction);assert.equal(sample(f,0)?.sequence.kind,direction===facing?'walk-back':'walk');reversals++;
 if(mode==='belt'){step(direction,true);assert.equal(sample(f,0)?.sequence.kind,'walk','Depth-only walk must not inherit old horizontal intent');controls++;}
 if(actor==='player'){f.updatePlayer({...quiet,held:k=>k==='left'||k==='right'},r);assert.equal(f.x,f.previousX);assert.equal(f.walkDirection,0,'Opposing horizontal keys clear old directional intent');assert.equal(sample(f,0)?.sequence.kind,'idle','Canceled horizontal movement must show neutral idle');controls++;f.updatePlayer(quiet,r);assert.equal(sample(f,0)?.sequence.kind,'idle');controls++;}
 f.parryWindow=f.lowParryWindow=f.redParryWindow=0;const attacker=new Fighter(getCharacter('RYU'),'enemy',f.x+50,f.y,-facing);assert.equal(f.receiveHit(normalFor('mp'),attacker,false),'hit');assert.equal(sample(f,0)?.sequence.kind,'hit');controls++;cases++;
}
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const mode of['duel','belt'])for(const facing of[-1,1])for(const direction of[-1,1]){const w=new CombatWorld(c,getCharacter('RYU'),mode),f=w.player;w.enemies.length=0;f.x=f.previousX=600;f.facing=facing;w.update({...quiet,held:k=>k===(direction<0?'left':'right')},0);const action=direction<0?'right':'left',tap={...quiet,held:k=>k===action,pressed:k=>k===action};for(const[t,input]of[[1,tap],[2,quiet],[3,tap]])w.update(input,t);assert.equal(f.dashFrames,8);let t=4;while(f.dashFrames>0)w.update(quiet,t++);const final=sample(f,0);assert.equal(final?.sequence.kind,-direction===facing?'walk':'walk-back');f.hitStop=2;for(let i=0;i<2;i++){w.update(quiet,t++);assert.deepEqual(sample(f,0),final,'Final dash freeze must retain the completed dash direction');freezeChecks++;}dashTransitions++;}
console.log('WALK_DIRECTION_CONTINUITY_PASS',{cases,freezeChecks,wallChecks,reversals,controls,dashTransitions,characters:10,actors:2,modes:2,facings:2,directions:2});
