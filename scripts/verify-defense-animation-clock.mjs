import assert from 'node:assert/strict';
import { Fighter } from '../dist/assets/combat/Fighter.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { combatSpritePose } from '../dist/assets/render/CombatSpriteProfiles.js';
import { motionPolishProfile } from '../dist/assets/render/MotionPolishProfiles.js';

const quiet={held:()=>false,pressed:()=>false,released:()=>false};
const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:100,arenaRight:1180,arenaTop:380,arenaBottom:590};
const roster=['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'];
let cases=0;
const bodyPose=victim=>{
 const {footPlant,speed,...body}=combatSpritePose(victim,0);
 return body;
};
for(const id of roster)for(const facing of [-1,1]) {
 const create=()=>new Fighter(getCharacter(id),'player',600,460,facing);
 const attacker=new Fighter(getCharacter('RYU'),'enemy',650,460,-facing);
 const move=normalFor('lp');
 const drainStop=victim=>{
  const initial=bodyPose(victim);
  while(victim.hitStop>0){victim.updatePlayer(quiet,rules);assert.deepEqual(bodyPose(victim),initial,'Hit stop must freeze defense pose');}
 };
 for(const red of [false,true]) {
  const victim=create();
  if(red){assert.equal(victim.receiveHit(move,attacker,true),'block');drainStop(victim);}
  victim.updatePlayer({...quiet,pressed:key=>key===(facing===1?'right':'left')},rules);
  assert.equal(victim.receiveHit(move,attacker,false),red?'red-parry':'parry');
  drainStop(victim);
  let ticks=0,previousWidth=0;
  while(victim.state==='parry') {
   const pose=combatSpritePose(victim,0);
   assert.ok(pose.useSprite);
   assert.ok(pose.scaleX>=1.018&&pose.scaleX<=1.0300001,`${id} parry must keep its intended expansion, not negative-clock compression`);
   assert.ok(pose.offsetX*facing<=-3,`${id} parry must brace away from the incoming attack`);
   assert.ok(pose.scaleX>=previousWidth,'Parry progression must advance');previousWidth=pose.scaleX;
   victim.updatePlayer(quiet,rules);ticks++;
  }
  assert.equal(ticks,red?10:8);assert.equal(victim.hp,victim.maxHp);assert.equal(victim.state,'idle');cases++;
 }
 for(const duration of [6,12,24]) {
  const victim=create(),blockMove={...move,blockStun:duration};
  const block=()=>assert.equal(victim.receiveHit(blockMove,attacker,true),'block');
  block();drainStop(victim);
  const initial=bodyPose(victim);let previousRecoil=Infinity,ticks=0;
  while(victim.state==='block') {
   const pose=combatSpritePose(victim,0),distance=-pose.offsetX*facing;
   assert.ok(distance>=4&&distance<=4+4.5*motionPolishProfile(id).hitRecoil+1e-8,`${id} guard recoil must remain within its authored profile range`);
   assert.ok(distance<=previousRecoil,'Block recoil must settle as stun expires');previousRecoil=distance;
   if(ticks===2){block();drainStop(victim);assert.deepEqual(bodyPose(victim),initial,'A new block must restart its brace');previousRecoil=Infinity;}
   victim.updatePlayer(quiet,rules);ticks++;
  }
  assert.equal(ticks,duration+2);assert.equal(victim.hp,victim.maxHp);assert.equal(victim.state,'idle');cases++;
 }
}
console.log('DEFENSE_ANIMATION_CLOCK_PASS',{cases,characters:roster.length});
