import assert from 'node:assert/strict';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor,throwMoveFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];
const throws=roster.flatMap(c=>[throwMoveFor(c.id),...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.level==='throw'||m.kind==='throw').map(move=>({c,move})));
let throwCases=0,escapeCases=0,immunityCases=0,defenseControls=0;
function prepare(d,a,w,kind){
 if(kind==='red'){assert.equal(d.receiveHit(normalFor('lp',false,a.character.id),a,true),'block');while(d.hitStop)d.updatePlayer(q,w.rules);}
 if(kind==='high'||kind==='red')d.updatePlayer({...q,pressed:k=>k===(d.facing===1?'right':'left')},w.rules);
 if(kind==='low')d.updatePlayer({...q,pressed:k=>k==='down'},w.rules);
}
function snapshot(f){return [f.x,f.y,f.state,f.stateFrame,f.hp,f.superGauge,f.hitStop,f.parryWindow,f.lowParryWindow,f.redParryWindow,f.throwSyncFrames,f.throwSyncRole,f.throwEscapeFrames,f.superVictimFrames,f.superVictimMotif,f.jumpHeight,f.jumpVelocity,f.airborne];}
function fixture(c,move,mode,facing,kind){const w=new CombatWorld(getCharacter('KEN'),c,mode),d=w.player,a=w.enemy;d.x=d.previousX=600;d.facing=facing;a.x=a.previousX=600+facing*45;a.y=a.previousY=d.y;a.facing=-facing;prepare(d,a,w,kind);a.superGauge=1000;a.startMove(move);a.moveFrame=a.currentMove.startup;return {w,d,a};}
for(const {c,move} of throws)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const kind of ['high','red','low','none'])for(const guard of [false,true]){
 const {w,d,a}=fixture(c,move,mode,facing,kind),hp=d.hp;
 w.resolveAttack(a,d,{...q,held:k=>guard&&k===(facing===1?'left':'right')});
 if(!recording){assert(d.hp<hp,move.id+'/'+kind+' throws must bypass a pending parry window');assert.equal(d.throwSyncRole,'victim');assert.equal(a.throwSyncRole,'attacker');assert(!w.events.some(e=>e.type.includes('parry')));assert.equal(w.playerParries,0);}
 // Low-only/no-parry-window outcomes are unchanged controls.
 if(kind==='low'||kind==='none')records.push({character:c.id,move:move.id,mode,facing,kind,guard,defender:snapshot(d),attacker:snapshot(a),events:w.events.map(({attackerSide,moveId,type,power})=>({attackerSide,moveId,type,power}))});throwCases++;
}
for(const {c,move} of throws)for(const mode of ['duel','belt'])for(const facing of [-1,1])for(const kind of ['high','red']){
 const {w,d,a}=fixture(c,move,mode,facing,kind),hp=d.hp;
 d.captureInput({...q,pressed:k=>k==='lp'||k==='lk'},100);w.resolveAttack(a,d,q);assert.equal(d.hp,hp);assert(w.events.some(e=>e.type==='throw-escape'));assert.equal(d.throwEscapeFrames,12);assert.equal(a.throwEscapeFrames,12);assert.equal(d.throwSyncFrames,0);escapeCases++;
 for(const immunity of ['airborne','escape','active-parry']){
  const {w:wi,d:di,a:ai}=fixture(c,move,mode,facing,'none');
  if(immunity==='airborne')di.updatePlayer({...q,pressed:k=>k==='jump'},wi.rules);
  else if(immunity==='escape'){di.throwEscaped(1);di.x=600;}
  else{di.updatePlayer({...q,pressed:k=>k===(facing===1?'right':'left')},wi.rules);assert.equal(di.receiveHit(normalFor('mp',false,c.id),ai,false),'parry');}
  const hp=di.hp;assert.equal(di.canBeThrown(),false);wi.resolveAttack(ai,di,q);assert.equal(di.hp,hp);assert.equal(di.throwSyncFrames,0);immunityCases++;
 }
}
// Existing strike/projectile, low-parry and red-parry behavior stays intact,
// including parryable guard-break attacks. Every outcome is recorded pre/post.
for(const c of roster){const set=specialMovesFor(c.id),moves=[...['lp','mp','hp','lk','mk','hk'].flatMap(b=>[normalFor(b,false,c.id),normalFor(b,true,c.id)]),set.primary,set.antiAir,set.mobility,set.exPrimary,...c.superArts.map(a=>superArtMoveFor(c.id,a.id,a.gauge))].filter(m=>m.level!=='throw'&&m.kind!=='throw'&&!m.install);
 for(const move of moves)for(const facing of [-1,1])for(const defense of ['parry','red-parry','block','hit']){
 if(defense==='block'&&move.guardBreak)continue;
 const w=new CombatWorld(c,getCharacter('RYU'),'duel'),d=w.player,a=w.enemy;d.facing=facing;a.facing=-facing;
 if(defense==='red-parry')prepare(d,a,w,'red');else if(defense==='parry')prepare(d,a,w,move.level==='low'?'low':'high');
 const outcome=d.receiveHit(move,a,defense==='block');assert.equal(outcome,defense);records.push({character:c.id,move:move.id,facing,defense,outcome,defender:snapshot(d),attacker:snapshot(a)});defenseControls++;
 }}
if(recording)console.log(JSON.stringify(records));else console.log('THROW_PARRY_PRIORITY_PASS',{throwMoves:throws.length,throwCases,escapeCases,immunityCases,defenseControls,recordedControls:records.length,characters:roster.length});
