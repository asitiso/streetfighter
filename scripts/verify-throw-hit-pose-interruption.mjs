import assert from 'node:assert/strict';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {normalFor,specialMovesFor,superArtMoveFor,throwMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {animationSequenceSample} from '../dist/assets/render/AnimationTimingMapper.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],quiet={held:()=>false,pressed:()=>false,released:()=>false};
const clean=f=>{assert.equal(f.throwSyncFrames,0,'Interrupted actor must stop stale paired throw pose');assert.equal(f.throwSyncTotal,0);assert.equal(f.throwSyncRole,null);assert.equal(f.throwSyncPartnerUid,null);assert.equal(f.throwSyncStyle,'RYU');};
function fixture(c,facing,path){const w=new CombatWorld(path==='victim-projectile'?getCharacter('RYU'):c,path==='victim-projectile'?c:getCharacter('RYU'),'belt');const p=w.player,e=w.enemy;p.x=p.previousX=500;p.y=p.previousY=500;p.facing=facing;e.x=e.previousX=p.x+facing*45;e.y=e.previousY=p.y;e.aiCooldown=1;e.facing=-facing;const move=throwMoveFor(p.character.id),hp=e.hp;p.startMove(move);p.moveFrame=move.startup;w.resolveAttack(p,e,quiet);assert.equal(p.throwSyncRole,'attacker');assert.equal(e.throwSyncRole,'victim');assert(p.throwSyncFrames>0&&e.throwSyncFrames>0);assert(e.hp<hp);return {w,p,e,throwDamage:hp-e.hp};}
let cases=0,melee=0,projectile=0,superControls=0,lethalControls=0;
for(const c of roster)for(const facing of [-1,1])for(const path of ['attacker-melee','attacker-projectile','victim-projectile'])for(const outcome of ['normal','super','lethal']){
 const {w,p,e,throwDamage}=fixture(c,facing,path),v=path==='victim-projectile'?e:p,partner=v===p?e:p,partnerState=[partner.throwSyncFrames,partner.throwSyncRole,partner.throwSyncPartnerUid],before=v.hp,damageBefore=v===p?w.totalEnemyDamage:w.totalPlayerDamage;
 const owner=path==='victim-projectile'?p:new Fighter(getCharacter(path==='attacker-melee'?'KEN':'RYU'),'enemy',v.x+facing*45,v.y,-facing);if(owner!==p)w.enemies.push(owner);
 const base=path==='attacker-melee'?normalFor('mp',false,'KEN'):specialMovesFor('RYU').primary;
 const move=outcome==='super'?superArtMoveFor(path==='attacker-melee'?'KEN':'RYU',1):outcome==='lethal'?{...base,damage:99999}:base;
 owner.facing=path==='victim-projectile'?facing:-facing;
 if(path==='attacker-melee'){owner.superGauge=1000;owner.startMove(move);owner.moveFrame=move.startup;w.resolveAttack(owner,v,quiet);melee++;}
 else{w.spawnScriptedProjectile(owner,move);const q=w.projectiles[0];q.x=v.x;q.y=v.y-88;q.vx=q.vy=0;w.updateProjectiles(quiet);projectile++;}
 assert(v.hp<before);clean(v);assert.deepEqual([partner.throwSyncFrames,partner.throwSyncRole,partner.throwSyncPartnerUid],partnerState,'Unhit partner keeps existing followthrough');
 const actualDamage=before-v.hp,recorded=v===p?w.totalEnemyDamage:w.totalPlayerDamage;assert.equal(recorded-damageBefore,actualDamage,'New hit is counted once without undoing throw damage');assert(w.totalPlayerDamage>=throwDamage);
 if(outcome==='normal'){assert.equal(v.state,'hit');assert.equal(v.superVictimFrames,0);assert.equal(animationSequenceSample(v,0)?.sequence.kind,v.airborne||v.jumpHeight>0?'fall':'hit','Latest authored hit is no longer hidden by throw state');}
 else if(outcome==='super'){assert(v.superVictimFrames>0,'New super keeps its own reaction');assert.equal(v.superVictimMotif,move.superPresentation?.motif??'burst');assert.equal(animationSequenceSample(v,0),null);superControls++;}
 else{assert.equal(v.state,'ko');assert.equal(v.hp,0);lethalControls++;}cases++;
}
let expiryControls=0,escapeControls=0;
for(const c of roster)for(const facing of [-1,1]){
 const {w,p,e}=fixture(c,facing,'attacker-melee');const x=p.x,y=p.y;for(const f of [p,e]){f.hitStop=0;for(let tick=0;tick<24;tick++)f.updatePlayer(quiet,w.rules);clean(f);}assert(p.x===x&&p.y===y);expiryControls++;
 const escaped=fixture(c,facing,'attacker-melee');escaped.p.throwEscaped(-facing);escaped.e.throwEscaped(facing);clean(escaped.p);clean(escaped.e);assert.equal(escaped.p.throwEscapeFrames,12);assert.equal(escaped.e.throwEscapeFrames,12);escapeControls++;
}
console.log('THROW_HIT_POSE_INTERRUPTION_PASS',{characters:10,facings:2,cases,melee,projectile,superControls,lethalControls,expiryControls,escapeControls,throwDamagePreserved:true,latestReactionVisible:true,partnerFollowthroughPreserved:true});
