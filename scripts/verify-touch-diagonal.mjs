import assert from 'node:assert/strict';
import{InputManager}from'../dist/assets/input/InputManager.js';import{TouchControls}from'../dist/assets/ui/TouchControls.js';import{Fighter}from'../dist/assets/combat/Fighter.js';import{CHARACTERS,BOSS_CHARACTERS}from'../dist/assets/game/characters.js';import{specialMovesFor}from'../dist/assets/combat/MoveLibrary.js';
const directions={U:['up'],D:['down'],L:['left'],R:['right'],UL:['up','left'],UR:['up','right'],DL:['down','left'],DR:['down','right']},buttons=['lp','mp','hp','lk','mk','hk','jump','start'],allDirections=['up','down','left','right'],keyCodes={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO',jump:'Space',start:'KeyP'};let pads=[];
class Element extends EventTarget{dataset={};style={setProperty(){}};classList={toggle(){}};setPointerCapture(){};getBoundingClientRect(){return{left:0,top:0,width:300,height:300,right:300,bottom:300};}closest(){return this;}}
function setup(){globalThis.window=new EventTarget();window.innerWidth=800;window.innerHeight=520;const nodes=new Map();for(const [name,actions]of Object.entries(directions)){const n=new Element();n.dataset=actions.length===1?{action:actions[0]}:{directions:actions.join(' ')};nodes.set(name,n);}for(const action of buttons){const n=new Element();n.dataset.action=action;nodes.set(action,n);}const root=new Element(),dpad=new Element();root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()].filter(n=>n.dataset.action):[];root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad};}
function pointer(node,type,id,x=document.hit?100:-100,y=document.hit?100:-100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
function down(s,name,id=11){document.hit=s.nodes.get(name);pointer(s.dpad,'pointerdown',id);pointer(s.nodes.get(name),'pointerdown',id);}
function move(s,name,id=11){document.hit=s.nodes.get(name)??null;pointer(s.dpad,'pointermove',id);}
function end(s,type='pointerup',id=11){pointer(s.dpad,type,id);}
function held(s,expected){for(const a of allDirections)assert.equal(s.input.touchHeld(a),expected.includes(a),'Touch direction '+a+' expected '+expected);}
// A drag shares D through D→DF and F through DF→F; no synthetic key re-presses.
{const s=setup();down(s,'D');held(s,['down']);s.input.endTick();move(s,'DR');held(s,['down','right']);assert(!s.input.touchReleased('down'));assert(!s.input.touchPressed('down'));assert(s.input.touchPressed('right'));s.input.endTick();move(s,'R');held(s,['right']);assert(!s.input.touchPressed('right'));assert(s.input.touchReleased('down'));end(s);held(s,[]);s.input.destroy();}
let directionCases=0,ownershipControls=0,resetControls=0,mixedControls=0,gameplayCases=0,keyboardComparisons=0,gutterControls=0;
{const s=setup();down(s,'D');s.input.endTick();document.hit=null;pointer(s.dpad,'pointermove',11,201,250);held(s,['down','right']);assert(!s.input.touchReleased('down'));s.input.endTick();pointer(s.dpad,'pointermove',11,250,199);held(s,['right']);assert(!s.input.touchPressed('right'));s.input.endTick();pointer(s.dpad,'pointermove',11,150,150);held(s,[]);end(s);s.input.destroy();gutterControls=3;}
for(const [name,actions]of Object.entries(directions))for(const finish of ['pointerup','pointercancel','lostpointercapture']){const s=setup();down(s,name);held(s,actions);s.input.endTick();down(s,name==='UL'?'DR':'UL',22);held(s,actions);end(s,finish,22);end(s,finish,99);held(s,actions);ownershipControls+=3;move(s,null);held(s,[]);move(s,name);held(s,actions);end(s,finish);held(s,[]);s.input.destroy();directionCases++;}
for(const name of Object.keys(directions))for(const reset of ['release','hide','edit']){const s=setup();down(s,name);if(reset==='release')s.touch.releaseAll();if(reset==='hide'){s.touch.setVisible(false);s.touch.setVisible(true);}if(reset==='edit'){s.touch.setEditMode(true);s.touch.setEditMode(false);}held(s,[]);down(s,'DR',33);end(s,'pointerup',11);held(s,['down','right']);end(s,'pointerup',33);held(s,[]);s.input.destroy();resetControls++;}
for(const action of allDirections)for(const source of ['keyboard','gamepad']){const s=setup();if(source==='keyboard')key('keydown',keyCodes[action]);else{const p={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};p.buttons[{up:12,down:13,left:14,right:15}[action]].pressed=true;pads=[p];s.input.prepareTick();}down(s,action==='up'?'UL':action==='down'?'DR':action==='left'?'DL':'UR');end(s);assert(s.input.held(action));assert(!s.input.touchHeld(action));s.input.destroy();mixedControls++;}
function commandTrace(c,facing,mode,command,touchInput){const s=setup(),f=new Fighter(c,'player',600,500,facing),r={mode,depthMovement:mode==='belt',laneTolerance:mode==='belt'?54:22,arenaLeft:120,arenaRight:1160,arenaTop:mode==='belt'?394:500,arenaBottom:mode==='belt'?580:500};f.superGauge=1000;const F=facing===1?'R':'L',B=facing===1?'L':'R',DF=facing===1?'DR':'DL',DB=facing===1?'DL':'DR',path=command==='dp'?[F,'D',DF]:command==='qcb'?['D',DB,B]:command==='super'?['D',DF,F,'D',DF,F]:['D',DF,F],attack=command==='qcb'?['lk']:command==='ex'?['lp','mp']:['lp'];let previous=[];const rows=[];for(let t=0;t<=path.length;t++){const name=path[Math.min(t,path.length-1)],wanted=[...directions[name],...(t===path.length?attack:[])];if(touchInput){if(t===0)down(s,name);else if(t<path.length)move(s,name);else for(const [i,a]of attack.entries())pointer(s.nodes.get(a),'pointerdown',40+i);}else{for(const a of previous)if(!wanted.includes(a))key('keyup',keyCodes[a]);for(const a of wanted)if(!previous.includes(a))key('keydown',keyCodes[a]);previous=wanted;}f.captureInput(s.input,t);f.updatePlayer(s.input,r);rows.push([f.x,f.y,f.state,f.stateFrame,f.moveFrame,f.currentMove?.id??null,f.superGauge,f.parryWindow,f.lowParryWindow]);s.input.endTick();}const expected=command==='dp'?specialMovesFor(c.id).antiAir:command==='qcb'?specialMovesFor(c.id).mobility:command==='ex'?specialMovesFor(c.id).exPrimary:command==='super'?specialMovesFor(c.id).super:specialMovesFor(c.id).primary;assert.equal(f.currentMove?.id,expected.id,c.id+' '+command+' actual command');s.touch.releaseAll();s.input.destroy();return rows;}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const facing of [-1,1])for(const mode of ['duel','belt'])for(const command of ['qcf','qcb','dp','ex','super']){const expected=commandTrace(c,facing,mode,command,false),actual=commandTrace(c,facing,mode,command,true);assert.deepEqual(actual,expected,'Touch commands must match real keyboard gameplay without shortcuts');gameplayCases++;keyboardComparisons++;}
console.log('TOUCH_DIAGONAL_PASS',{directionCases,ownershipControls,resetControls,mixedControls,gameplayCases,keyboardComparisons,characters:10,facings:2,modes:2,commands:5,gutterControls,sharedDirectionsStable:true,realMotionBuffer:true});

let wakeCases=0;
for(const source of ['touch','keyboard'])for(const facing of [-1,1])for(const airborne of [false,true]){
 for(const gesture of ['short diagonal','separate presses','latest down only']){
  const s=setup(),c=CHARACTERS[0],f=new Fighter(c,'player',600,500,facing);
  const rules={mode:'belt',depthMovement:true,laneTolerance:54,arenaLeft:120,arenaRight:1160,arenaTop:394,arenaBottom:580};
  f.state='knockdown';f.stateFrame=-34;
  if(airborne){f.airborne=true;f.jumpHeight=14;f.jumpVelocity=-5;}
  const back=facing===1?'left':'right',backCell=facing===1?'L':'R';
  const tap=(diagonal,id)=>{
   if(source==='touch'){down(s,diagonal?'D'+backCell:'D',id);end(s,'pointerup',id);}
   else{
    key('keydown',keyCodes.down);
    if(diagonal){key('keydown',keyCodes[back]);key('keyup',keyCodes[back]);}
    key('keyup',keyCodes.down);
   }
  };
  tap(gesture!=='separate presses',11);
  if(gesture==='latest down only')tap(false,12);
  if(gesture==='separate presses'){
   if(source==='touch')down(s,backCell,12);
   else key('keydown',keyCodes[back]);
  }
  assert(s.input.pressed('down')&&!s.input.held('down'));
  s.input.prepareTick();f.updatePlayer(s.input,rules);s.input.endTick();
  while(f.airborne)f.updatePlayer(s.input,rules);
  const label=[source,facing,airborne,gesture].join('/');
  assert.equal(f.quickRiseCount,1,label);
  assert.equal(f.techRolling,gesture==='short diagonal',label);
  s.touch.releaseAll();s.input.destroy();wakeCases++;
 }
}
console.log('SUBFRAME_WAKE_DIRECTION_PASS',{wakeCases});

const {CombatWorld}=await import('../dist/assets/combat/CombatWorld.js');
let grabCases=0;
for(const facing of [-1,1])for(const gesture of ['front','back','neutral then forward','keyboard','queued front']){
 const s=setup(),c=CHARACTERS[0],world=new CombatWorld(c,c,'belt'),p=world.player,e=world.enemy;
 p.x=600;p.y=e.y=500;p.facing=facing;e.x=p.x+facing*60;
 const hold=world.belt.hold={holder:p,victim:e,frames:0,knees:0,mash:0,byPlayer:true,limit:105,queued:null};
 const front=facing===1?'right':'left',back=facing===1?'left':'right';
 const holdDir=dir=>down(s,dir==='left'?'L':'R',11);
 const attack=s.nodes.get('lp');
 if(gesture==='queued front'){
  s.input.setTouch('lp',true);world.belt.tickPlayerSide(world,s.input);
  s.input.setTouch('lp',false);s.input.endTick();
  assert.equal(p.currentMove?.id,'BELT_KNEE');
 }
 if(gesture==='keyboard'){
  key('keydown',keyCodes[front]);key('keydown',keyCodes.lp);
 }else{
  if(gesture!=='neutral then forward')holdDir(gesture==='back'?back:front);
  pointer(attack,'pointerdown',22);pointer(attack,'pointerup',22);
  if(gesture==='neutral then forward')holdDir(front);
  else end(s,'pointerup',11);
 }
 s.input.prepareTick();world.belt.tickPlayerSide(world,s.input);s.input.endTick();
 if(gesture==='queued front'){
  assert.equal(hold.queued,'front','Short front throw survives a knee’s recovery');
  p.state='idle';p.currentMove=null;
  world.belt.tickPlayerSide(world,s.input);
 }
 if(gesture==='neutral then forward'){
  assert.equal(world.belt.stats.knees,1,'Moving after the touch attack must not change the knee to a throw');
  assert.equal(world.belt.hold,hold);
 }else{
  assert.equal(world.belt.hold,null,gesture+' resolves the hold');
  assert.equal(world.belt.stats[gesture==='back'?'backThrows':'frontThrows'],1);
 }
 s.touch.releaseAll();s.input.destroy();grabCases++;
}
console.log('SUBFRAME_GRAB_DIRECTION_PASS',{grabCases});

let combatStepCases=0;
for(const mode of ['belt','duel'])for(const source of ['touch','keyboard'])for(const intent of ['move','attack','hit-stop']){
 const s=setup(),c=CHARACTERS[0],world=new CombatWorld(c,c,mode),p=world.player;
 p.x=p.previousX=600;p.y=p.previousY=500;
 if(intent==='hit-stop')p.hitStop=2;
 if(source==='touch'){
  down(s,'DL');end(s);
  if(intent==='attack'){pointer(s.nodes.get('lp'),'pointerdown',22);pointer(s.nodes.get('lp'),'pointerup',22);}
 }else{
  key('keydown',keyCodes.left);key('keydown',keyCodes.down);key('keyup',keyCodes.left);key('keyup',keyCodes.down);
  if(intent==='attack'){key('keydown',keyCodes.lp);key('keyup',keyCodes.lp);}
 }
 s.input.prepareTick();p.captureInput(s.input,1);p.updatePlayer(s.input,world.rules);s.input.endTick();
 const shouldMove=mode==='belt'&&intent==='move';
 assert.equal(p.x<600,shouldMove,[mode,source,intent].join('/')+' horizontal step');
 assert.equal(p.y>500,shouldMove,[mode,source,intent].join('/')+' depth step');
 if(intent==='attack')assert.equal(p.currentMove?.id,'5LP','Fresh attack takes priority over the movement tap');
 const position=[p.x,p.y];
 p.captureInput(s.input,2);p.updatePlayer(s.input,world.rules);
 assert.deepEqual([p.x,p.y],position,'A released step never repeats on the next tick');
 s.touch.releaseAll();s.input.destroy();combatStepCases++;
}
console.log('SUBFRAME_BELT_STEP_PASS',{combatStepCases});

let mixedStepCases=0;
for(const source of ['touch','keyboard'])for(const [heldCell,diagonal] of [['L','DL'],['R','UR'],['D','DL'],['U','UR']]){
 const s=setup(),c=CHARACTERS[0],world=new CombatWorld(c,c,'belt'),p=world.player;
 p.x=p.previousX=600;p.y=p.previousY=500;
 const [base]=directions[heldCell];
 const pulse=directions[diagonal].find(action=>action!==base);
 const step=tick=>{s.input.prepareTick();p.captureInput(s.input,tick);p.updatePlayer(s.input,world.rules);s.input.endTick();return [p.x,p.y];};
 if(source==='touch')down(s,heldCell);
 else key('keydown',keyCodes[base]);
 const first=step(1);
 if(source==='touch'){move(s,diagonal);move(s,heldCell);}
 else{key('keydown',keyCodes[pulse]);key('keyup',keyCodes[pulse]);}
 assert(s.input.held(base)&&!s.input.held(pulse)&&s.input.pressed(pulse));
 const second=step(2),third=step(3);
 const sign=action=>action==='left'||action==='up'?-1:1;
 const baseAxis=base==='left'||base==='right'?0:1,pulseAxis=1-baseAxis;
 assert.equal(Math.sign(second[baseAxis]-first[baseAxis]),sign(base),'The held axis keeps moving');
 assert.equal(Math.sign(second[pulseAxis]-first[pulseAxis]),sign(pulse),'The released axis moves for one tick');
 assert.equal(Math.sign(third[baseAxis]-second[baseAxis]),sign(base),'The held axis stays active');
 assert.equal(third[pulseAxis],second[pulseAxis],'The short step does not drift');
 s.touch.releaseAll();s.input.destroy();mixedStepCases++;
}
console.log('MIXED_BELT_STEP_PASS',{mixedStepCases});
