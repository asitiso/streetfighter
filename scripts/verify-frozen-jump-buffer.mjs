import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pad;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});
const roster=[...CHARACTERS,...BOSS_CHARACTERS],codes={jump:'Space',up:'ArrowUp',lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO'},buttons={jump:8,up:12,lp:0,mp:1,hp:3,lk:2,mk:4,hk:5};
function fixture(c,face,mode,source='touch',freeze='hitstop'){
 pad=source==='gamepad'?{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}:null;
 const input=new InputManager(),w=new CombatWorld(c,getCharacter('GILL'),mode,c.superArts[0]),f=w.player,e=w.enemy;
 f.x=f.previousX=500;f.y=f.previousY=e.y=e.previousY=500;e.x=e.previousX=500+450*face;e.hp=e.maxHp=5000;e.superGauge=1000;f.superGauge=f.superGaugeMax;
 const ai=e.updateAiDirected.bind(e);e.updateAiDirected=(t,r,d)=>ai(t,r,{...d,desiredX:e.x,desiredY:e.y,attackAllowed:false,rangedAllowed:false});let tick=100;
 const edge=(a,held)=>{if(source==='keyboard'){const ev=new Event(held?'keydown':'keyup',{cancelable:true});Object.defineProperties(ev,{code:{value:codes[a]},repeat:{value:false}});window.dispatchEvent(ev);}else if(source==='gamepad')pad.buttons[buttons[a]].pressed=held;else input.setTouch(a,held);};
 const step=()=>{input.prepareTick();w.update(input,tick++);input.endTick();};
 if(freeze!=='hitstop'){e.startMove(specialMovesFor('GILL').super);step();assert(w.superFreezeFrames>6);}if(freeze!=='super')f.hitStop=3;
 return{input,w,f,e,edge,step,jump:n=>tick+=n,tap(actions){for(const a of actions)edge(a,true);if(source!=='gamepad')for(const a of actions)edge(a,false);step();for(const a of actions)edge(a,false);},thaw(){while(w.superFreezeFrames>0||f.hitStop>0)step();step();},close(){input.destroy();}};
}
let cases=0,depthControls=0,controls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const source of['touch','keyboard','gamepad'])for(const freeze of['hitstop','super','combined'])for(const action of['jump','up'])for(const combo of[null,'lp','mp','hp','lk','mk','hk']){
 const t=fixture(c,face,mode,source,freeze),frame=t.f.animationFrame,gauge=t.f.superGauge;
 t.tap(combo?[action,combo]:[action]);assert.equal(t.f.airborne,false);assert.equal(t.f.currentMove,null);assert.equal(t.f.animationFrame,frame);
 while(t.w.superFreezeFrames>0||t.f.hitStop>0){t.step();assert.equal(t.f.airborne,false);assert.equal(t.f.jumpHeight,0);assert.equal(t.f.animationFrame,frame);assert.equal(t.f.currentMove,null);assert.equal(t.f.superGauge,gauge);}
 t.step();const shouldJump=action==='jump'||mode==='duel';
 assert.equal(t.f.airborne,shouldJump,[c.id,face,mode,source,freeze,action,combo].join('/'));
 if(shouldJump){assert.equal(t.f.state,combo?'attack':'jump');assert.equal(t.f.jumpHeight,0);assert.equal(t.f.jumpVelocity,t.f.combatProfile.jumpVelocity);assert.equal(t.f.currentMove?.id,combo?airNormalFor(c.id,combo).id:undefined);cases++;}
 else{assert.equal(t.f.currentMove?.id,combo?normalFor(combo,false,c.id).id:undefined);depthControls++;}
 assert.equal(t.f.superGauge,gauge);for(let n=0;n<3;n++)t.step();if(shouldJump)assert(t.f.jumpVelocity<t.f.combatProfile.jumpVelocity,'Queued jump cannot repeat while airborne');t.close();
}
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const kind of['epoch','elapsed','interrupt','new-move','fresh-attack','fresh-jump','newer-attack','newer-jump','airborne','locked','whiff','held','expired','boundary','latest-combo']){
 const t=fixture(c,face,mode);if(kind==='expired')t.f.hitStop=7;if(kind==='boundary')t.f.hitStop=6;if(kind==='airborne'){t.f.airborne=true;t.f.state='jump';t.f.jumpHeight=80;t.f.jumpVelocity=2;}if(kind==='locked'){t.f.state='hit';t.f.stateFrame=-30;}if(kind==='whiff')t.f.startMove(normalFor('hp',false,c.id));
 if(kind==='held'){t.edge('jump',true);t.input.endTick();t.step();}else if(kind==='newer-jump')t.tap(['lp']);else t.tap(kind==='latest-combo'?['jump','lp']:['jump']);
 if(kind==='epoch')t.input.resetCommandHistory();if(kind==='elapsed')t.jump(40);if(kind==='interrupt')t.f.receiveHit(normalFor('mp',false,c.id),t.e,false);if(kind==='new-move')t.f.startMove(normalFor('hk',false,c.id));if(kind==='newer-attack')t.tap(['lp']);if(kind==='newer-jump')t.tap(['jump']);if(kind==='latest-combo')t.tap(['jump']);
 while(t.f.hitStop>0)t.step();if(kind==='fresh-attack'){t.edge('lp',true);t.edge('lp',false);}if(kind==='fresh-jump'){t.edge('jump',true);t.edge('jump',false);}t.step();
 if(kind==='airborne'){assert(t.f.jumpVelocity<2,'No double jump');assert.equal(t.f.currentMove,null);}else if(kind==='fresh-jump'||kind==='newer-jump'||kind==='boundary'||kind==='latest-combo'){assert(t.f.airborne);assert.equal(t.f.currentMove,null);}else{assert.equal(t.f.airborne,false);if(kind==='new-move')assert.equal(t.f.currentMove?.id,'5HK');else if(kind==='whiff')assert.equal(t.f.currentMove?.id,'5HP');else if(kind==='fresh-attack'||kind==='newer-attack')assert.equal(t.f.currentMove?.id,'5LP');else assert.equal(t.f.currentMove,null,kind+' must discard stale jump');}
 t.close();controls++;
}
let chordControls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const freeze of['hitstop','super','combined'])for(const pair of[['lp','lk'],['lp','mp'],['mp','hk']]){
 const t=fixture(c,face,mode,'touch',freeze),gauge=t.f.superGauge,forward=face===1?'right':'left';
 t.input.setTouchDirections(['down']);t.input.setTouchDirections(['down',forward]);t.input.setTouchDirections([forward]);t.tap(['jump',...pair]);t.input.setTouchDirections([]);t.thaw();
 assert(t.f.airborne);assert.equal(t.f.currentMove?.id,airNormalFor(c.id,pair[0]).id,'Jump chord preserves air priority over grounded throw/special');assert.equal(t.f.superGauge,gauge);t.close();chordControls++;
}
console.log(JSON.stringify({passed:true,cases,depthControls,controls,chordControls,roster:10,actualOpponentSuper:true,jumpAttackAtomic:true,depthUpNotJump:true,noDoubleJump:true,freshIntentPriority:true}));
