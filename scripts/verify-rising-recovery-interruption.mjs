import assert from 'node:assert/strict';
import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';
import{CombatWorld}from'../dist/assets/combat/CombatWorld.js';
import{normalFor,specialMovesFor,superArtMoveFor}from'../dist/assets/combat/MoveLibrary.js';
import{animationSequenceSample as sample}from'../dist/assets/render/AnimationTimingMapper.js';
import{animationTransitionSample as transition}from'../dist/assets/render/AnimationTransitionProfiles.js';
const q={held:()=>false,pressed:()=>false,released:()=>false};let cases=0,freezeChecks=0;
for(const c of[...CHARACTERS,...BOSS_CHARACTERS])for(const face of[-1,1])for(const mode of['duel','belt'])for(const move of[specialMovesFor(c.id).antiAir,...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge)).filter(m=>m.id.startsWith(c.id))]){
 if(!move.launch)continue;
 for(const action of['normal','jump','hit','block','parry','throw-collision','throw-escape','victory','ko']){
  const w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.superGauge=1000;f.startMove(move);let ticks=0,air=false;
  do{f.updatePlayer(q,w.rules);transition(f);air||=f.airborne;assert(++ticks<150,'touchdown timeout');}while(!air||f.airborne||f.landingFrames===0);
  if(['normal','jump','block','parry'].includes(action))while(!f.canDefend()){f.updatePlayer(q,w.rules);transition(f);assert(++ticks<200);}
  const hit=normalFor('mp',false,c.id);f.parryWindow=f.lowParryWindow=f.redParryWindow=0;
  if(action==='normal')f.updatePlayer({...q,pressed:k=>k==='lp'},w.rules);
  if(action==='jump')f.updatePlayer({...q,pressed:k=>k==='jump'},w.rules);
  if(action==='hit')f.receiveHit(hit,w.enemy,false);
  if(action==='block')f.receiveHit(hit,w.enemy,true);
  if(action==='parry'){f.parryWindow=6;f.receiveHit(hit,w.enemy,false);}
  if(action==='throw-collision')f.receiveThrownCollision(30,face);
  if(action==='throw-escape')f.throwEscaped(face);
  if(action==='victory')f.enterVictoryPose();
  if(action==='ko')f.receiveHit({...hit,damage:99999},w.enemy,false);
  const expected={normal:'attack',jump:'jump',hit:'hit',block:'block',parry:'parry','throw-collision':'knockdown','throw-escape':'idle',victory:'victory',ko:'ko'}[action];assert.equal(f.state,expected,c.id+'/'+move.id+'/'+action);
  assert.equal(f.visualRecoveryMoveId,null,'old flight recovery must be released');if(action!=='jump')assert.equal(f.attackHasLanded,false,'old landing cannot affect new action');
  const s=sample(f,0);assert(!s||!['shoryuken','tensei-ranka','rocket-uppercut','stun-gun-headbutt','abare-tosanami','you-hou'].includes(s.sequence.kind),'old rise strip retained '+action);
  if(action==='normal')assert.equal(s?.sequence.kind,'stand-light');
  if(action==='jump')assert.equal(s?.sequence.kind,'jump');
  const t=transition(f);if(action==='normal')assert(!t.active||t.kind==='landing-attack','only the new landing attack may own geometry');else assert.equal(t.active,false,'reaction must not retain old geometry '+action);
  if(f.hitStop>0){const pose=sample(f,0),hp=f.hp,moveFrame=f.moveFrame;while(f.hitStop>0){f.updatePlayer(q,w.rules);assert.deepEqual(sample(f,0),pose);assert.equal(f.hp,hp);assert.equal(f.moveFrame,moveFrame);freezeChecks++;}}
  cases++;
 }
}
console.log(JSON.stringify({passed:true,cases,freezeChecks}));
