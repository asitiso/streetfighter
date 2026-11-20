import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {normalFor,specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pad;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pad?[pad]:[]}});
const roster=[...CHARACTERS,...BOSS_CHARACTERS],codes={left:'ArrowLeft',right:'ArrowRight',lp:'KeyJ',jump:'Space'},buttons={left:14,right:15,lp:0,jump:8};
function fixture(c,face,mode,source='touch',freeze='hitstop'){
 pad=source==='gamepad'?{axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))}:null;
 const input=new InputManager(),w=new CombatWorld(c,getCharacter('GILL'),mode,c.superArts[0]),f=w.player,e=w.enemy;
 f.x=f.previousX=500;f.y=f.previousY=e.y=e.previousY=500;e.x=e.previousX=500+450*face;e.hp=e.maxHp=5000;e.superGauge=1000;f.superGauge=f.superGaugeMax;
 const ai=e.updateAiDirected.bind(e);e.updateAiDirected=(t,r,d)=>ai(t,r,{...d,desiredX:e.x,desiredY:e.y,attackAllowed:false,rangedAllowed:false});let tick=100,starts=0;const dash=f.startDash.bind(f);f.startDash=(...a)=>{starts++;return dash(...a);};
 const edge=(a,held)=>{if(source==='keyboard'){const ev=new Event(held?'keydown':'keyup',{cancelable:true});Object.defineProperties(ev,{code:{value:codes[a]},repeat:{value:false}});window.dispatchEvent(ev);}else if(source==='gamepad')pad.buttons[buttons[a]].pressed=held;else if(source==='pad'&&(a==='left'||a==='right'))input.setTouchDirections(held?[a]:[]);else input.setTouch(a,held);};
 const step=()=>{input.prepareTick();w.update(input,tick++);input.endTick();};
 if(freeze!=='hitstop'){e.startMove(specialMovesFor('GILL').super);step();assert(w.superFreezeFrames>6);}if(freeze!=='super')f.hitStop=3;
 return{input,w,f,e,edge,step,starts:()=>starts,jump:n=>tick+=n,double(action,released=true){edge(action,true);if(source==='gamepad')step();edge(action,false);if(source==='gamepad')step();edge(action,true);if(released&&source!=='gamepad')edge(action,false);step();if(released)edge(action,false);},tap(a){edge(a,true);if(source!=='gamepad')edge(a,false);step();edge(a,false);},thaw(){while(w.superFreezeFrames>0||f.hitStop>0)step();step();},close(){input.destroy();}};
}
let cases=0,gamepadCases=0,controls=0;
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const direction of['left','right'])for(const source of['touch','keyboard','pad'])for(const freeze of['hitstop','super','combined'])for(const released of[false,true]){
 const t=fixture(c,face,mode,source,freeze),x=t.f.x,clock=t.f.animationFrame,gauge=t.f.superGauge;t.double(direction,released);
 assert.equal(t.starts(),0);while(t.w.superFreezeFrames>0||t.f.hitStop>0){t.step();assert.equal(t.f.x,x);assert.equal(t.f.animationFrame,clock);assert.equal(t.f.dashFrames,0);}
 t.step();assert.equal(t.f.dashFrames,8,[c.id,face,mode,direction,source,freeze,released].join('/'));assert.equal(t.f.dashDirection,direction==='left'?-1:1);assert.equal(t.f.x,x+(direction==='left'?-5:5));assert.equal(t.f.superGauge,gauge);assert.equal(t.starts(),1);
 for(let n=0;n<6;n++)t.step();assert.equal(t.starts(),1,'Queued dash consumed once');assert.equal(t.f.dashFrames,2);t.close();cases++;
}
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const direction of['left','right'])for(const freeze of['hitstop','super','combined']){
 const t=fixture(c,face,mode,'gamepad',freeze);t.double(direction);t.thaw();assert.equal(t.f.dashFrames,8);assert.equal(t.f.dashDirection,direction==='left'?-1:1);assert.equal(t.starts(),1);t.close();gamepadCases++;
}
for(const c of roster)for(const face of[-1,1])for(const mode of['belt','duel'])for(const kind of['single','preheld','conflict','epoch','elapsed','interrupt','new-move','fresh-attack','fresh-jump','newer-attack','newer-jump','newer-dash','opposite-single','opposite-held','fresh-opposite','fresh-dash-over-attack','fresh-dash-over-jump','fresh-dash-and-attack','fresh-dash-and-jump','airborne','locked','active-whiff','already-dashing','expired','boundary']){
 const t=fixture(c,face,mode);if(kind==='expired')t.f.hitStop=7;if(kind==='boundary')t.f.hitStop=6;if(kind==='airborne'){t.f.airborne=true;t.f.state='jump';t.f.jumpHeight=80;t.f.jumpVelocity=2;}if(kind==='locked'){t.f.state='hit';t.f.stateFrame=-30;}if(kind==='active-whiff')t.f.startMove(normalFor('hp',false,c.id));if(kind==='already-dashing'){t.f.dashFrames=4;t.f.dashDirection=-1;}
 if(kind==='fresh-dash-over-attack')t.tap('lp');else if(kind==='fresh-dash-over-jump')t.tap('jump');else if(kind==='single')t.tap('right');else if(kind==='preheld'){t.edge('right',true);t.input.endTick();t.step();}else{if(kind==='conflict')t.input.setTouch('left',true);t.double('right');}
 if(kind==='epoch')t.input.resetCommandHistory();if(kind==='elapsed')t.jump(40);if(kind==='interrupt')t.f.receiveHit(normalFor('mp',false,c.id),t.e,false);if(kind==='new-move')t.f.startMove(normalFor('hk',false,c.id));if(kind==='newer-attack')t.tap('lp');if(kind==='newer-jump')t.tap('jump');if(kind==='newer-dash')t.double('left');if(kind==='opposite-single')t.tap('left');if(kind==='opposite-held'){t.edge('left',true);t.step();}
 while(t.f.hitStop>0)t.step();if(kind==='fresh-attack'){t.edge('lp',true);t.edge('lp',false);}if(kind==='fresh-jump'){t.edge('jump',true);t.edge('jump',false);}if(kind==='fresh-opposite'){t.edge('left',true);t.edge('left',false);}if(kind.startsWith('fresh-dash-')){for(let k=0;k<2;k++){t.edge('left',true);t.edge('left',false);}if(kind==='fresh-dash-and-attack'){t.edge('lp',true);t.edge('lp',false);}if(kind==='fresh-dash-and-jump'){t.edge('jump',true);t.edge('jump',false);}}t.step();
 if(kind==='fresh-dash-over-attack'||kind==='fresh-dash-over-jump'){assert.equal(t.f.dashFrames,8);assert.equal(t.f.dashDirection,-1);assert.equal(t.f.currentMove,null);assert.equal(t.f.airborne,false);}else if(kind==='boundary'){assert.equal(t.f.dashFrames,8);assert.equal(t.f.dashDirection,1);}else if(kind==='newer-dash'){assert.equal(t.f.dashFrames,8);assert.equal(t.f.dashDirection,-1);}else if(kind==='already-dashing'){assert.equal(t.f.dashFrames,3);assert.equal(t.f.dashDirection,-1);assert.equal(t.starts(),0);}else{assert.equal(t.f.dashFrames,0,kind+' cannot revive unwanted dash');assert.equal(t.starts(),0);}
 if(kind==='fresh-attack'||kind==='newer-attack'||kind==='fresh-dash-and-attack')assert.equal(t.f.currentMove?.id,'5LP');if(kind==='fresh-jump'||kind==='newer-jump'||kind==='fresh-dash-and-jump')assert(t.f.airborne);t.close();controls++;
}
console.log(JSON.stringify({passed:true,cases,gamepadCases,controls,roster:10,noMovementDuringFreeze:true,firstFreeTick:true,originalDashPhysics:true,noRepeat:true,freshAndOppositeIntentGuards:true}));
