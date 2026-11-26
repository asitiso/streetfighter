import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {CHARACTERS,BOSS_CHARACTERS,getCharacter} from '../dist/assets/game/characters.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {specialMovesFor,normalFor,superArtMoveFor} from '../dist/assets/combat/MoveLibrary.js';
import {airNormalFor} from '../dist/assets/combat/TechniqueLibrary.js';
const actions=['left','right','up','down','lp','mp','hp','lk','mk','hk','jump','start'],buttons=actions.slice(4),keys={lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO',jump:'Space',start:'KeyP'},padButton={lp:0,mp:1,hp:3,lk:2,mk:4,hk:5,jump:8,start:9};let pads=[];
class Element extends EventTarget{dataset={};style={setProperty(){}};classList={toggle(){}};setPointerCapture(){};closest(){return this;}}
function setup(){globalThis.window=new EventTarget();window.innerWidth=1280;window.innerHeight=720;const nodes=new Map(actions.map(action=>{const n=new Element();n.dataset.action=action;return [action,n];})),root=new Element(),dpad=new Element();root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()]:[];root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];const input=new InputManager(),touch=new TouchControls(input);return {input,touch,nodes,dpad};}
function pointer(node,type,id){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:100},clientY:{value:100}});node.dispatchEvent(e);}
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
let cases=0,mixedSourceControls=0,resetControls=0,gameplayCases=0,dpadControls=0,failures=[];
for(const action of buttons)for(const end of ['pointerup','pointercancel','pointerleave'])for(const reverse of [false,true])for(const firstEnds of [false,true])for(const source of ['touch','keyboard','gamepad']){
 const {input,touch,nodes}=setup(),node=nodes.get(action),ids=reverse?[22,11]:[11,22];pointer(node,'pointerdown',ids[0]);assert(input.touchHeld(action));input.endTick();pointer(node,'pointerdown',ids[1]);assert.equal(input.touchPressed(action),false);
 if(source==='keyboard')key('keydown',keys[action]);if(source==='gamepad'){const p={axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};p.buttons[padButton[action]].pressed=true;pads=[p];input.prepareTick();}input.endTick();pointer(node,end,99);if(!input.touchHeld(action)||input.touchReleased(action))failures.push(action+' '+end+' unowned pointer released button');input.endTick();pointer(node,end,ids[firstEnds?0:1]);if(!input.touchHeld(action)||input.touchReleased(action))failures.push(action+' '+end+' released with second finger held');input.endTick();pointer(node,end,ids[firstEnds?1:0]);assert.equal(input.touchHeld(action),false);if(!input.touchReleased(action))failures.push(action+' final pointer release missing');if(source!=='touch'){assert(input.held(action));assert.equal(input.released(action),false);mixedSourceControls++;}touch.releaseAll();input.destroy();cases++;
}
for(const action of buttons)for(const reset of ['release','hide','edit'])for(const end of ['pointerup','pointercancel']){
 const {input,touch,nodes}=setup(),node=nodes.get(action);pointer(node,'pointerdown',11);pointer(node,'pointerdown',22);if(reset==='release')touch.releaseAll();if(reset==='hide'){touch.setVisible(false);touch.setVisible(true);}if(reset==='edit'){touch.setEditMode(true);touch.setEditMode(false);}assert.equal(input.touchHeld(action),false);input.endTick();pointer(node,'pointerdown',33);pointer(node,end,11);pointer(node,end,22);if(!input.touchHeld(action))failures.push(action+' '+reset+' old pointer ended new touch');input.endTick();pointer(node,end,33);assert.equal(input.touchHeld(action),false);touch.releaseAll();input.destroy();resetControls++;
}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const scenario of ['two-fingers','unowned-end'])for(const end of ['pointerup','pointercancel','pointerleave']){
 const {input,touch,nodes}=setup(),w=new CombatWorld(c,getCharacter('RYU'),'duel'),f=w.player;pointer(nodes.get('lp'),'pointerdown',11);input.endTick();if(scenario==='two-fingers')pointer(nodes.get('lp'),'pointerdown',22);pointer(nodes.get('lp'),end,scenario==='two-fingers'?11:99);pointer(nodes.get('lk'),'pointerdown',33);f.updatePlayer(input,w.rules);if(f.currentMove?.kind!=='throw')failures.push(c.id+' '+scenario+' '+end+' lost held LP throw chord');touch.releaseAll();input.destroy();gameplayCases++;
}
{const {input,touch,nodes,dpad}=setup();document.hit=nodes.get('left');pointer(dpad,'pointerdown',1);pointer(nodes.get('left'),'pointerdown',1);assert(input.touchHeld('left'));document.hit=nodes.get('right');pointer(dpad,'pointermove',1);assert.equal(input.touchHeld('left'),false);assert(input.touchHeld('right'));pointer(dpad,'pointerup',1);assert.equal(input.touchHeld('right'),false);touch.releaseAll();input.destroy();dpadControls++;}
assert.equal(failures.length,0,JSON.stringify({count:failures.length,examples:failures.slice(0,10)},null,2));
console.log('TOUCH_BUTTON_OWNERSHIP_PASS',{buttons:8,cases,mixedSourceControls,resetControls,gameplayCases,dpadControls,unownedEndsIgnored:true,lastPointerOwnsRelease:true});


// Touch edges must overlap in real time to make the LP+LK throw chord.
let throwChordCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) for (const mode of ['duel','belt']) {
  for (const first of ['lp','lk']) for (const scenario of ['sequential','overlap','carry','cancel','confirmed','mixed']) {
    const {input,touch,nodes}=setup();
    const world=new CombatWorld(character,getCharacter('RYU'),mode);
    const second=first==='lp'?'lk':'lp';
    if (scenario==='mixed') key('keydown',keys[first]);
    else pointer(nodes.get(first),'pointerdown',11);
    if (scenario==='carry') input.endTick();
    if (scenario==='sequential') pointer(nodes.get(first),'pointerup',11);
    pointer(nodes.get(second),'pointerdown',22);
    if (scenario==='cancel') pointer(nodes.get(second),'pointercancel',22);
    else pointer(nodes.get(second),'pointerup',22);
    if (scenario==='mixed') key('keyup',keys[first]);
    else if (scenario!=='sequential' && scenario!=='carry') pointer(nodes.get(first),'pointerup',11);
    if (scenario==='confirmed') {
      pointer(nodes.get(first),'pointerdown',33);
      pointer(nodes.get(first),'pointercancel',33);
    }
    world.player.updatePlayer(input,world.rules);
    const shouldThrow=scenario!=='sequential' && scenario!=='cancel';
    const expected=shouldThrow?'THROW':first==='lk'?'5LK':'5LP';
    assert.equal(world.player.currentMove?.id,expected,[character.id,mode,first,scenario].join('/'));
    touch.releaseAll();
    assert(!input.touchHeld('lp') && !input.touchHeld('lk'));
    input.destroy();
    throwChordCases++;
  }
}
console.log('TOUCH_THROW_CHORD_PASS',{throwChordCases});


// An EX chord requires overlapping touches, independently of their dispatch tick.
let exChordCases = 0;
for (const character of [...CHARACTERS, ...BOSS_CHARACTERS]) for (const mode of ['duel','belt']) {
  for (const [first,second] of [['lp','mp'],['mp','hp'],['hp','lp']]) {
    for (const scenario of ['sequential','overlap','cancel','mixed']) {
      const {input,touch,nodes}=setup();
      const world=new CombatWorld(character,getCharacter('RYU'),mode);
      const f=world.player;
      f.superGauge=70;
      const step=tick=>{f.captureInput(input,tick);f.updatePlayer(input,world.rules);input.endTick();};
      input.setTouchDirections(['down']);step(1);
      input.setTouchDirections(['down','right']);step(2);
      input.setTouchDirections(['right']);
      if (scenario==='mixed') key('keydown',keys[first]);
      else pointer(nodes.get(first),'pointerdown',11);
      if (scenario==='sequential') pointer(nodes.get(first),'pointerup',11);
      pointer(nodes.get(second),'pointerdown',22);
      pointer(nodes.get(second),scenario==='cancel'?'pointercancel':'pointerup',22);
      if (scenario==='mixed') key('keyup',keys[first]);
      else if (scenario!=='sequential') pointer(nodes.get(first),'pointerup',11);
      step(3);
      const moves=specialMovesFor(character.id);
      const ex=scenario==='overlap'||scenario==='mixed';
      const expected=ex?moves.exPrimary:moves.primary;
      assert.equal(f.currentMove?.id,expected.id,[character.id,mode,first,second,scenario].join('/'));
      assert.equal(f.superGauge,70-(expected.exCost??0),'Spend meter only for the accepted move');
      assert(!input.touchHeld(first)&&!input.touchHeld(second));
      touch.releaseAll();input.destroy();exChordCases++;
    }
  }
}
console.log('TOUCH_EX_CHORD_PASS',{exChordCases});


// For separate touch attacks, consume the first valid edge, even in a shared tick.
let touchOrderCases=0;
for(const character of [...CHARACTERS,...BOSS_CHARACTERS])for(const mode of ['duel','belt']){
  for(const scenario of ['ground','air','cancel-first','physical','frozen-jump']){
    const {input,touch,nodes}=setup(), world=new CombatWorld(character,getCharacter('RYU'),mode),f=world.player;
    if(scenario==='air'){f.state='jump';f.airborne=true;f.jumpHeight=70;}
    pointer(nodes.get('mk'),'pointerdown',11);
    pointer(nodes.get('mk'),scenario==='cancel-first'?'pointercancel':'pointerup',11);
    if(scenario==='physical'){key('keydown','KeyJ');key('keyup','KeyJ');}
    else {pointer(nodes.get('lp'),'pointerdown',22);pointer(nodes.get('lp'),'pointerup',22);}
    if(scenario==='frozen-jump'){
      input.setTouch('jump',true);input.setTouch('jump',false);
      f.captureInput(input,1,true,world.rules);
      input.endTick();
      f.captureInput(input,2);
    }
    f.updatePlayer(input,world.rules);
    const expected=scenario==='air'||scenario==='frozen-jump'?airNormalFor(character.id,'mk').id
      : scenario==='ground'?'5MK':'5LP';
    assert.equal(f.currentMove?.id,expected,[character.id,mode,scenario].join('/'));
    touch.releaseAll();input.destroy();touchOrderCases++;
  }
}

// Later taps of the same button cannot replace the direction of its first valid edge.
for(const firstDirection of ['right','down']){
  const {input,touch,nodes}=setup();
  const world=new CombatWorld(getCharacter('KEN'),getCharacter('RYU'),'duel');
  const kick=nodes.get('mk');
  input.setTouchDirections([firstDirection]);
  pointer(kick,'pointerdown',11);pointer(kick,'pointerup',11);
  input.setTouchDirections([firstDirection==='right'?'down':'right']);
  pointer(kick,'pointerdown',22);pointer(kick,'pointerup',22);
  input.setTouchDirections([]);
  world.player.updatePlayer(input,world.rules);
  assert.equal(world.player.currentMove?.id,firstDirection==='right'?'KEN_CMD_MK':'2MK');
  touch.releaseAll();input.destroy();touchOrderCases++;
}
console.log('TOUCH_ATTACK_ORDER_PASS',{touchOrderCases});


// A legal chain samples the chosen attack's posture, even if the pad released first.
let touchChainCases=0;
for(const id of ['KEN','CHUNLI','DUDLEY','IBUKI','YUN','GILL'])for(const mode of ['duel','belt']){
  for(const face of [-1,1])for(const timing of ['live','hit-stop','super-freeze']){
    const gestures=['down-first','attack-first','cancel'];
    if(id==='IBUKI'||id==='YUN')gestures.push('two-legal');
    for(const gesture of gestures){
      const {input,touch,dpad,nodes}=setup(), c=getCharacter(id), world=new CombatWorld(c,getCharacter('RYU'),mode);
      const {player:f,enemy}=world;
      f.x=f.previousX=500;f.y=f.previousY=500;
      f.facing=face;
      enemy.x=enemy.previousX=500+face*52;enemy.y=enemy.previousY=500;
      enemy.updateAi=enemy.updateAiDirected=()=>{};
      world.enemyDefenseDecision=()=>false;
      f.startMove(normalFor('lp',true,id));
      let tick=0;
      const step=()=>{world.update(input,++tick);input.endTick();};
      while(!f.attackConnected&&tick<30)step();
      assert(f.attackConnected&&enemy.hp<enemy.maxHp,'Requires a real connect');
      if(timing!=='hit-stop')while(f.hitStop)step();
      if(timing==='super-freeze')world.superFreezeFrames=2;
      const attack=nodes.get('mp');
      document.hit=nodes.get('down');
      if(gesture!=='attack-first')pointer(dpad,'pointerdown',11);
      if(gesture==='two-legal'){pointer(nodes.get('lk'),'pointerdown',33);pointer(nodes.get('lk'),'pointerup',33);}
      pointer(attack,'pointerdown',22);
      if(gesture==='attack-first')pointer(dpad,'pointerdown',11);
      pointer(dpad,'pointerup',11);
      pointer(attack,gesture==='cancel'?'pointercancel':'pointerup',22);
      step();
      while((f.hitStop||world.superFreezeFrames)&&tick<50)step();
      if(timing!=='live')step();
      const stance=mode==='duel'&&gesture!=='attack-first'?2:5;
      const expected=gesture==='cancel'?'2LP':stance+(gesture==='two-legal'?'LK':'MP');
      assert.equal(f.currentMove?.id,expected,[id,mode,face,timing,gesture].join('/'));
      assert(!input.touchHeld('down')&&!input.touchHeld('mp'));
      touch.releaseAll();input.destroy();touchChainCases++;
    }
  }
}
console.log('TOUCH_CHAIN_POSTURE_PASS',{touchChainCases});


// A touch press cannot use command directions that arrive after it in the same tick.
let touchMotionOrderCases=0;
for(const id of ['RYU','KEN'])for(const mode of ['duel','belt'])for(const face of [-1,1]){
  const F=face===1?'right':'left', B=face===1?'left':'right';
  const forward=[['down'],['down',F],[F]];
  const moves=specialMovesFor(id), c=getCharacter(id), art=c.superArts[0];
  for(const [name,motion,button,valid] of [
    ['primary',forward,'lp',moves.primary],
    ['dp',[[F],['down'],['down',F]],'lp',moves.antiAir],
    ['mobility',[['down'],['down',B],[B]],'lk',moves.mobility],
    ['super',[...forward,...forward],'lp',superArtMoveFor(id,art.id,art.gauge)],
  ])for(const scenario of ['early','on-time','physical','repeat-early','cancel-first']){
    const {input,touch,nodes}=setup(), world=new CombatWorld(c,getCharacter('DUDLEY'),mode,art);
    const f=world.player;
    f.facing=face;
    f.superGauge=f.superGaugeMax;
    for(let i=0;i<motion.length-1;i++){
      input.setTouchDirections(motion[i]);
      f.captureInput(input,i+1);
      input.endTick();
    }
    if(scenario==='on-time')input.setTouchDirections(motion.at(-1));
    if(scenario==='physical'){key('keydown',keys[button]);key('keyup',keys[button]);}
    else{
      pointer(nodes.get(button),'pointerdown',11);
      pointer(nodes.get(button),scenario==='cancel-first'?'pointercancel':'pointerup',11);
    }
    if(scenario!=='on-time')input.setTouchDirections(motion.at(-1));
    if(scenario==='repeat-early'||scenario==='cancel-first'){
      pointer(nodes.get(button),'pointerdown',22);
      pointer(nodes.get(button),'pointerup',22);
    }
    input.setTouchDirections([]);
    f.captureInput(input,motion.length);
    f.updatePlayer(input,world.rules);
    const early=scenario==='early'||scenario==='repeat-early';
    const expected=!early?valid.id:name==='super'?moves.antiAir.id
      :normalFor(button,mode==='duel',id).id;
    assert.equal(f.currentMove?.id,expected,[id,mode,face,name,scenario].join('/'));
    touch.releaseAll();input.destroy();touchMotionOrderCases++;
  }
}
console.log('TOUCH_MOTION_ORDER_PASS',{touchMotionOrderCases});
