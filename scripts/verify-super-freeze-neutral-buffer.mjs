import assert from 'node:assert/strict';
import { InputManager } from '../dist/assets/input/InputManager.js';
import { CombatWorld } from '../dist/assets/combat/CombatWorld.js';
import { CHARACTERS, BOSS_CHARACTERS, getCharacter } from '../dist/assets/game/characters.js';
import { normalFor, specialMovesFor, superArtMoveFor, throwMoveFor } from '../dist/assets/combat/MoveLibrary.js';
import { airNormalFor } from '../dist/assets/combat/TechniqueLibrary.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pad;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});
const roster=[...CHARACTERS,...BOSS_CHARACTERS],codes={lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO'},buttons={lp:0,mp:1,hp:3,lk:2,mk:4,hk:5};
function fixture(c,face,mode,source='touch'){
 pad=source==='gamepad'?{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}:null;
 const input=new InputManager(),w=new CombatWorld(c,getCharacter('GILL'),mode,c.superArts[0]),f=w.player,e=w.enemy;f.x=f.previousX=500;f.y=f.previousY=e.y=e.previousY=500;e.x=e.previousX=500+450*face;e.hp=e.maxHp=5000;f.superGauge=f.superGaugeMax;e.superGauge=1000;
 const ai=e.updateAiDirected.bind(e);e.updateAiDirected=(t,r,d)=>ai(t,r,{...d,desiredX:e.x,desiredY:e.y,attackAllowed:false,rangedAllowed:false});
 let tick=100,starts=0;const start=f.startMove.bind(f);f.startMove=(...a)=>{starts++;return start(...a);};
 const edge=(a,held)=>{if(source==='keyboard'){const ev=new Event(held?'keydown':'keyup',{cancelable:true});Object.defineProperties(ev,{code:{value:codes[a]},repeat:{value:false}});window.dispatchEvent(ev);}else if(source==='gamepad')pad.buttons[buttons[a]].pressed=held;else input.setTouch(a,held);};
 const step=()=>{input.prepareTick();w.update(input,tick++);input.endTick();};
 e.startMove(specialMovesFor('GILL').super);step();assert(w.superFreezeFrames>6,'Actual opponent super creates long world freeze');assert.equal(starts,0);
 return{input,w,f,e,edge,step,tap(a){edge(a,true);if(source!=='gamepad')edge(a,false);step();edge(a,false);},jump:n=>tick+=n,starts:()=>starts,close(){input.destroy();}};
}
let cases=0,controls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const source of['touch','keyboard','gamepad'])for(const stance of['stand','crouch','air'])for(const button of['lp','mp','hp','lk','mk','hk'])for(const when of['early','last']){
 const t=fixture(c,face,mode,source);if(when==='last')while(t.w.superFreezeFrames>1)t.step();
 if(stance==='crouch'){t.f.state='crouch';t.input.setTouch('down',true);}if(stance==='air'){t.f.state='jump';t.f.airborne=true;t.f.jumpHeight=80;t.f.jumpVelocity=2;}
 const frame=t.f.animationFrame,height=t.f.jumpHeight,gauge=t.f.superGauge,time=t.w.time,enemyFrame=t.e.moveFrame;
 t.tap(button);t.input.setTouch('down',false);assert.equal(t.f.currentMove,null);assert.equal(t.starts(),0);
 while(t.w.superFreezeFrames>0){t.step();assert.equal(t.f.animationFrame,frame);assert.equal(t.f.jumpHeight,height);assert.equal(t.f.superGauge,gauge);assert.equal(t.w.time,time);assert.equal(t.e.moveFrame,enemyFrame);assert.equal(t.starts(),0);}
 t.step();const expected=stance==='air'?airNormalFor(c.id,button):normalFor(button,stance==='crouch'&&mode==='duel',c.id);
 assert.equal(t.f.currentMove?.id,expected.id,[c.id,face,mode,source,stance,button,when].join('/'));assert.equal(t.f.moveFrame,0);assert.equal(t.starts(),1);assert.equal(t.f.superGauge,gauge);t.close();cases++;
}
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const kind of['epoch','elapsed','interrupt','new-move','fresh','jump','landing','locked','active-whiff','held','latest']){
 const t=fixture(c,face,mode);
 if(kind==='landing'){t.f.state='jump';t.f.airborne=true;t.f.jumpHeight=1;t.f.jumpVelocity=-2;}
 if(kind==='locked'){t.f.state='hit';t.f.stateFrame=-30;}
 if(kind==='active-whiff')t.f.startMove(normalFor('hp',false,c.id));
 if(kind==='held'){t.edge('lp',true);t.input.endTick();t.step();}else t.tap('lp');
 if(kind==='epoch')t.input.resetCommandHistory();if(kind==='elapsed')t.jump(40);if(kind==='interrupt')t.f.receiveHit(normalFor('mp',false,c.id),t.e,false);if(kind==='new-move')t.f.startMove(normalFor('hk',false,c.id));if(kind==='latest')t.tap('mp');
 while(t.w.superFreezeFrames>0)t.step();
 if(kind==='fresh'){t.edge('hk',true);t.edge('hk',false);}if(kind==='jump')t.input.setTouch('jump',true);t.step();
 if(kind==='new-move'||kind==='fresh')assert.equal(t.f.currentMove?.id,'5HK');else if(kind==='active-whiff')assert.equal(t.f.currentMove?.id,'5HP');else if(kind==='latest')assert.equal(t.f.currentMove?.id,'5MP');else assert.equal(t.f.currentMove,null,kind+' must not revive a stale or ineligible attack');
 if(kind==='jump')assert(t.f.airborne);t.close();controls++;
}
let commandControls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const route of['throw','ex','super'])for(const drained of[false,true]){
 const t=fixture(c,face,mode),gauge=t.f.superGauge,forward=face===1?'right':'left';
 if(route!=='throw')for(let k=0;k<(route==='super'?2:1);k++){t.input.setTouchDirections(['down']);t.input.setTouchDirections(['down',forward]);t.input.setTouchDirections([forward]);}
 const pair=route==='throw'?['lp','lk']:route==='ex'?['lp','mp']:['lp'];for(const a of pair)t.edge(a,true);for(const a of pair)t.edge(a,false);t.step();assert.equal(t.f.currentMove,null);assert.equal(t.f.superGauge,gauge);if(drained)t.f.superGauge=0;
 while(t.w.superFreezeFrames>0)t.step();t.step();const expected=route==='throw'?throwMoveFor(c.id):route==='ex'?specialMovesFor(c.id).exPrimary:superArtMoveFor(c.id,c.superArts[0].id,c.superArts[0].gauge);
 if(drained&&route!=='throw'){assert.equal(t.f.currentMove,null);assert.equal(t.f.superGauge,0);}else{assert.equal(t.f.currentMove?.id,expected.id);assert.equal(t.f.superGauge,(drained?0:gauge)-(expected.exCost??expected.superCost??0));}
 t.close();commandControls++;
}
console.log(JSON.stringify({passed:true,cases,controls,commandControls,actualOpponentSuper:true,roster:10,firstAndLastFreezeTick:true,noExecutionOrCostWhileFrozen:true,firstFreeTick:true,airCrouchIntent:true,freshInputAndJumpPriority:true}));
