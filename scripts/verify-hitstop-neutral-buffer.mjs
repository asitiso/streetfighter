import assert from 'node:assert/strict';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { CHARACTERS, BOSS_CHARACTERS, getCharacter } from '../dist/assets/game/characters.js';
import { specialMovesFor, normalFor, throwMoveFor, superArtMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';
globalThis.window = new EventTarget(); globalThis.document = new EventTarget(); let pad;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pad ? [pad] : [] } });
const roster = [...CHARACTERS, ...BOSS_CHARACTERS], codes = { lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO' }, buttons = { lp:0,mp:1,hp:3,lk:2,mk:4,hk:5 };
function fixture(c, face, mode, source = 'touch') {
 pad = source === 'gamepad' ? { axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false})) } : null;
 const input = new InputManager(), w = new CombatWorld(c,c,mode,c.superArts[0]), f = w.player; f.facing=face; f.x=f.previousX=500; f.superGauge=f.superGaugeMax;
 let tick=100;
 const edge=(a,held)=>{if(source==='keyboard'){const e=new Event(held?'keydown':'keyup',{cancelable:true});Object.defineProperties(e,{code:{value:codes[a]},repeat:{value:false}});window.dispatchEvent(e);}else if(source==='gamepad')pad.buttons[buttons[a]].pressed=held;else input.setTouch(a,held);};
 const step=(world=false)=>{input.prepareTick();if(world)w.update(input,tick++);else{f.captureInput(input,tick++);f.updatePlayer(input,w.rules);}input.endTick();};
 const tap=a=>{edge(a,true);if(source!=='gamepad')edge(a,false);step();edge(a,false);};
 const resume=()=>{while(f.hitStop>0)step();step();};
 return {input,w,f,edge,step,tap,resume,jump:n=>tick+=n,freeze:n=>{for(let k=0;k<n;k++){input.prepareTick();f.captureInput(input,tick++,true);input.endTick();}},close(){input.destroy();}};
}
let realProjectileCases=0;
for(const id of ['RYU','KEN','CHUNLI','IBUKI','URIEN','GILL']) for(const face of [-1,1]) for(const mode of ['belt','duel']) {
 const t=fixture(getCharacter(id),face,mode),e=t.w.enemy; e.x=e.previousX=500+face*440;e.y=e.previousY=t.f.y;e.hp=e.maxHp=5000;
 e.updateAiDirected=()=>{};e.updateAi=()=>{};t.w.enemyDefenseDecision=()=>false;t.f.startMove(specialMovesFor(id).primary);
 let n=0;while(!(t.f.currentMove===null&&t.f.hitStop>0)){t.step(true);assert(++n<180,id+' actual projectile contact');}
 while(t.f.hitStop>3)t.step(true);const frame=t.f.animationFrame;
 t.input.setTouch('lp',true);t.input.setTouch('lp',false);t.step(true);assert.equal(t.f.currentMove,null);assert.equal(t.f.animationFrame,frame,'no attack/animation progress during stop');
 while(t.f.hitStop>0)t.step(true);t.step(true);assert.equal(t.f.currentMove?.id,'5LP',id+' actual projectile hitstop press survives release');assert.equal(t.f.moveFrame,0);t.close();realProjectileCases++;
}
let cases=0,controls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const source of['touch','keyboard','gamepad'])for(const stance of['stand','crouch','air'])for(const button of['lp','mp','hp','lk','mk','hk']){
 const t=fixture(c,face,mode,source);if(stance==='crouch'){t.f.state='crouch';t.input.setTouch('down',true);}if(stance==='air'){t.f.state='jump';t.f.airborne=true;t.f.jumpHeight=80;t.f.jumpVelocity=2;}
 t.f.hitStop=3;const frame=t.f.animationFrame,gauge=t.f.superGauge;t.tap(button);assert.equal(t.f.currentMove,null);assert.equal(t.f.animationFrame,frame);assert.equal(t.f.superGauge,gauge);t.input.setTouch('down',false);t.resume();
 const expected=stance==='air'?airNormalFor(c.id,button):normalFor(button,stance==='crouch'&&mode==='duel',c.id);assert.equal(t.f.currentMove?.id,expected.id);assert.equal(t.f.moveFrame,0);assert.equal(t.f.superGauge,gauge);
 let n=0;while(t.f.currentMove||t.f.airborne){t.step();assert(++n<200);}t.step();assert.equal(t.f.currentMove,null,'buffer consumed once');t.close();cases++;
}
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel']){
 for(const kind of['epoch','elapsed','interrupt','new-move','fresh','jump','landing','locked','active-whiff','expired','boundary','newer','no-press','super-freeze','pause-freeze']){
  const t=fixture(c,face,mode);t.f.hitStop=kind==='expired'?7:kind==='boundary'?6:3;
  if(kind==='landing'){t.f.airborne=true;t.f.state='jump';t.f.jumpHeight=1;t.f.jumpVelocity=-2;}
  if(kind==='locked'){t.f.state='hit';t.f.stateFrame=-2;}
  if(kind==='active-whiff')t.f.startMove(normalFor('hp',false,c.id));
  if(kind==='no-press'){t.edge('lp',true);t.input.endTick();t.step();}else t.tap('lp');
  if(kind==='epoch')t.input.resetCommandHistory();if(kind==='elapsed')t.jump(40);if(kind==='interrupt')t.f.receiveHit(normalFor('mp',false,c.id),t.w.enemy,false);if(kind==='new-move')t.f.startMove(normalFor('hk',false,c.id));
  if(kind==='newer')t.tap('mp');
  if(kind==='super-freeze'||kind==='pause-freeze'){if(kind==='pause-freeze')t.jump(40);t.freeze(20);}
  while(t.f.hitStop>0)t.step();
  if(kind==='fresh'){t.edge('hk',true);t.edge('hk',false);}if(kind==='jump')t.input.setTouch('jump',true);
  t.step();
  if(kind==='fresh')assert.equal(t.f.currentMove?.id,'5HK');else if(kind==='newer')assert.equal(t.f.currentMove?.id,'5MP');else if(kind==='new-move')assert.equal(t.f.currentMove?.id,'5HK');else if(kind==='active-whiff')assert.equal(t.f.currentMove?.id,'5HP');else if(kind==='boundary')assert.equal(t.f.currentMove?.id,'5LP');else if(kind==='super-freeze')assert.equal(t.f.currentMove?.id,'5LP');else assert.equal(t.f.currentMove,null,kind+' discards stale or ineligible queued move');
  if(kind==='jump')assert(t.f.airborne);t.close();controls++;
 }
}
let commandControls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const route of['throw','ex','super'])for(const drained of[false,true]){
 const t=fixture(c,face,mode);t.f.hitStop=3;const gauge=t.f.superGauge,forward=face===1?'right':'left';
 if(route!=='throw')for(let k=0;k<(route==='super'?2:1);k++){t.input.setTouchDirections(['down']);t.input.setTouchDirections(['down',forward]);t.input.setTouchDirections([forward]);}
 const pair=route==='throw'?['lp','lk']:route==='ex'?['lp','mp']:['lp'];for(const a of pair)t.edge(a,true);for(const a of pair)t.edge(a,false);t.step();assert.equal(t.f.currentMove,null);assert.equal(t.f.superGauge,gauge);
 if(drained)t.f.superGauge=0;t.resume();const expected=route==='throw'?throwMoveFor(c.id):route==='ex'?specialMovesFor(c.id).exPrimary:superArtMoveFor(c.id,c.superArts[0].id,c.superArts[0].gauge);
 if(drained&&route!=='throw'){assert.equal(t.f.currentMove,null);assert.equal(t.f.superGauge,0);}else{assert.equal(t.f.currentMove?.id,expected.id);assert.equal(t.f.superGauge,(drained?0:gauge)-(expected.exCost??expected.superCost??0));}
 t.close();commandControls++;
}
{
 const t=fixture(CHARACTERS[0],1,'duel');t.f.hitStop=3;t.tap('lp');
 const clone=Object.assign(Object.create(Object.getPrototypeOf(t.f)),t.f);
 while(clone.hitStop>0)clone.updatePlayer(t.input,t.w.rules);clone.updatePlayer(t.input,t.w.rules);
 assert.equal(clone.currentMove,null,'Copied visual/reference fighter must not inherit another device-owned pending input');
 t.resume();assert.equal(t.f.currentMove?.id,'5LP','Original owner retains its queued attack after copying');t.close();controls++;
}
console.log(JSON.stringify({passed:true,realProjectileCases,cases,controls,commandControls,firstFreeTick:true,noRepeat:true,crouchAirIntentPreserved:true,staleAndInterruptGuards:true}));
