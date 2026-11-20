import assert from 'node:assert/strict';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
const roster=[...CHARACTERS,...BOSS_CHARACTERS],q={held:()=>false,pressed:()=>false,released:()=>false},recording=process.argv.includes('--record-controls'),records=[];let mixedCases=0,survivorChecks=0,naturalCases=0,freezeChecks=0;
function world(){return new CombatWorld(getCharacter('KEN'),getCharacter('RYU'),'belt');}
// Stable ordering, identity and array reference must survive arbitrary expiry order.
for(let seed=0;seed<48;seed++)for(const frozen of [false,true]){
 const w=world(),list=w.events,source=Array.from({length:31},(_,i)=>({type:i%2?'super-flash':'hit',x:i,y:seed,power:80,ttl:(seed*17+i*11)%43-2,label:String(i),audioPlayed:i%3===0}));w.events.push(...source);const initial=source.map(e=>e.ttl);
 for(let tick=1;tick<=46;tick++){
  const fighterBefore=[w.player.x,w.player.y,w.player.state,w.player.stateFrame,w.player.hp,w.player.superGauge,w.player.animationFrame];
  if(frozen){w.superFreezeFrames=2;w.update(q,tick);assert.deepEqual([w.player.x,w.player.y,w.player.state,w.player.stateFrame,w.player.hp,w.player.superGauge,w.player.animationFrame],fighterBefore);freezeChecks++;}else w.ageEvents();
  const expected=source.filter((_,i)=>initial[i]-tick>0),actualLive=w.events.filter(e=>e.ttl>0);
  assert.deepEqual(actualLive,expected);assert.equal(w.events,list);for(let i=0;i<expected.length;i++){assert.equal(actualLive[i],expected[i]);assert.equal(actualLive[i].ttl,initial[source.indexOf(actualLive[i])]-tick);survivorChecks++;}
  if(!recording)assert(w.events.every(e=>e.ttl>0),'Expired effects must be removed even behind a longer KO/flash');
  records.push({seed,frozen,tick,live:actualLive.map(e=>({...e})),fighter:fighterBefore});
 }mixedCases++;
}
// Generate real KO and later super-flash via production combat paths.
for(const c of roster)for(const mode of ['belt','duel'])for(const facing of [-1,1]){
 const w=new CombatWorld(getCharacter('KEN'),c,mode),p=w.player;p.x=600;p.facing=facing;const e=w.enemy;e.x=600+facing*45;e.y=p.y;e.hp=1;e.aiCooldown=1;w.enemyDefenseDecision=()=>false;
 p.startMove(normalFor('hp',false,'KEN'));p.moveFrame=p.currentMove.startup;w.resolveAttack(p,e,q);assert(w.events.some(e=>e.type==='ko'));
 const caster=new (p.constructor)(c,'enemy',850,p.y,-facing);caster.superGauge=1000;caster.startMove(superArtMoveFor(c.id,1,c.superArts[0].gauge));w.emitMoveStartFx(caster);assert(w.events.some(e=>e.type==='super-flash'));
 for(let t=1;t<=40;t++){if(w.superFreezeFrames>0)w.update(q,t);else w.ageEvents();}
 assert(w.events.some(e=>e.type==='ko'&&e.ttl===50));if(!recording)assert(!w.events.some(e=>e.type==='super-flash'),'36-tick flash cannot persist behind 90-tick KO');naturalCases++;
}
if(recording)console.log(JSON.stringify(records));else console.log('EVENT_EXPIRY_PASS',{mixedCases,survivorChecks,naturalCases,freezeChecks,liveOrderIdentityAndFieldsPreserved:true});
