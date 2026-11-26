import assert from 'node:assert/strict';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {Fighter} from '../dist/assets/combat/Fighter.js';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {InputBuffer} from '../dist/assets/combat/InputBuffer.js';
import {CombatWorld} from '../dist/assets/combat/CombatWorld.js';
import {CHARACTERS,BOSS_CHARACTERS} from '../dist/assets/game/characters.js';
import {specialMovesFor} from '../dist/assets/combat/MoveLibrary.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[]},configurable:true});
const recording=process.argv.includes('--record-controls'),records=[];let tick=100,cases=0,slowControls=0,sharedCases=0,negativeControls=0;
function key(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
let activeInput;const codes={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'up',KeyJ:'lp',KeyK:'mp',KeyU:'lk'};function press(code){activeInput.setTouch(codes[code],true);}function release(code){activeInput.setTouch(codes[code],false);}
function step(input,fs,rules){input.prepareTick();for(const f of fs){f.captureInput(input,tick);f.updatePlayer(input,rules);}input.endTick();tick++;}
function physical(f){return[f.x,f.y,f.state,f.stateFrame,f.animationFrame,f.hp,f.superGauge,f.airborne,f.jumpHeight,f.jumpVelocity,f.currentMove?.id??null,f.moveFrame,f.dashFrames,f.hitStop];}
function groups(kind,face){const F=face===1?'ArrowRight':'ArrowLeft',B=face===1?'ArrowLeft':'ArrowRight',qcf=[[[1,'ArrowDown']],[[1,F]],[[0,'ArrowDown']]];if(kind==='antiAir')return[[[1,F]],[[0,F],[1,'ArrowDown']],[[1,F]]];if(kind==='mobility')return[[[1,'ArrowDown']],[[1,B]],[[0,'ArrowDown']]];if(kind==='super')return[...qcf,[[0,F],[1,'ArrowDown']],[[1,F]],[[0,'ArrowDown']]];return qcf;}
function run(c,face,mode,kind,slow){const input=activeInput=new InputManager(),w=new CombatWorld(c,c,mode),f=w.player;f.facing=face;f.superGauge=1000;const rows=[];try{for(const g of groups(kind,face)){for(const[down,code]of g)(down?press:release)(code);if(slow){step(input,[f],w.rules);rows.push(physical(f));}}press(kind==='mobility'?'KeyU':'KeyJ');if(kind==='exPrimary')press('KeyK');step(input,[f],w.rules);rows.push(physical(f));const moves=specialMovesFor(c.id),expected=kind==='super'?(f.selectedSuperArt?c.id+'_SA'+f.selectedSuperArt.id:moves.super.id):moves[kind].id;if(!recording||slow)assert.equal(f.currentMove?.id,expected,c.id+'/'+face+'/'+mode+'/'+kind+'/'+(slow?'sampled':'burst'));return rows;}finally{window.dispatchEvent(new Event('blur'));input.destroy();}}
for(const c of [...CHARACTERS,...BOSS_CHARACTERS])for(const face of [-1,1])for(const mode of ['duel','belt'])for(const kind of ['primary','antiAir','mobility','exPrimary','super']){run(c,face,mode,kind,false);cases++;records.push([c.id,face,mode,kind,run(c,face,mode,kind,true)]);slowControls++;}
if(!recording){for(const c of CHARACTERS)for(const face of [-1,1]){const input=activeInput=new InputManager(),w=new CombatWorld(c,c,'duel'),other=new CombatWorld(c,c,'duel').player;for(const f of[w.player,other])f.facing=face;try{for(const g of groups('primary',face))for(const[d,k]of g)(d?press:release)(k);press('KeyJ');step(input,[w.player,other],w.rules);assert.equal(w.player.currentMove?.id,specialMovesFor(c.id).primary.id);assert.equal(other.currentMove?.id,w.player.currentMove.id,'Reading one input stream must not consume another buffer');sharedCases++;}finally{window.dispatchEvent(new Event('blur'));input.destroy();}}
for(const kind of ['single-tap','double-tap','blur','end-tick','expired','overflow']){const input=activeInput=new InputManager(),buffer=new InputBuffer();try{const capture=t=>{input.prepareTick();buffer.capture(input,t);input.endTick();};if(kind==='single-tap'){press('ArrowRight');capture(100);assert(!buffer.doubleTap('right'));}if(kind==='double-tap'){press('ArrowRight');capture(100);release('ArrowRight');capture(101);press('ArrowRight');capture(102);assert(buffer.doubleTap('right'));}if(kind==='blur'||kind==='end-tick'){for(const g of groups('primary',1))for(const[d,k]of g)(d?press:release)(k);if(kind==='blur')window.dispatchEvent(new Event('blur'));else input.endTick();press('KeyJ');capture(100);assert(!buffer.motion(['D','DF','F'],1,14),'Discarded frame directions cannot reappear');}if(kind==='expired'){for(const g of groups('primary',1)){for(const[d,k]of g)(d?press:release)(k);capture(tick++);}capture(tick+100);assert(!buffer.motion(['D','DF','F'],1,14));}if(kind==='overflow'){for(let n=0;n<1000;n++){press('ArrowLeft');release('ArrowLeft');}assert(input.keyboardDirectionChanges().length<=32);capture(100);assert(buffer.directionFrames.length<=240);}negativeControls++;}finally{window.dispatchEvent(new Event('blur'));input.destroy();}}}
let mixedControls=0;
for(const face of [-1,1])for(const firstTouch of [false,true]){const input=activeInput=new InputManager(),b=new InputBuffer(),F=face===1?'right':'left',Fcode=face===1?'ArrowRight':'ArrowLeft';try{if(firstTouch)input.setTouch('down',true);else key('keydown','ArrowDown');if(firstTouch)key('keydown',Fcode);else input.setTouch(F,true);if(firstTouch)input.setTouch('down',false);else key('keyup','ArrowDown');input.prepareTick();b.capture(input,900);assert(b.motion(['D','DF','F'],face,14),'Mixed keyboard/touch order must survive');assert(!b.doubleTap(F),'Direction history must not synthesize dash presses');mixedControls++;}finally{input.destroy();}}
for(const face of [-1,1]){const input=activeInput=new InputManager(),F=face===1?'right':'left',code=face===1?'ArrowRight':'ArrowLeft';try{key('keydown',code);input.setTouch(F,true);key('keyup',code);assert(input.held(F));assert.equal(input.directionChanges().length,2,'Known baseline plus one edge; overlapping sources do not manufacture edges');assert.equal(input.directionChanges()[0].size,0);input.setTouch(F,false);assert.equal(input.directionChanges().length,3);input.endTick();assert.equal(input.directionChanges().length,0);mixedControls++;}finally{input.destroy();}}
const directions={U:['up'],D:['down'],L:['left'],R:['right'],UL:['up','left'],UR:['up','right'],DL:['down','left'],DR:['down','right']},buttons=['lp','mp','hp','lk','mk','hk','jump','start'],allDirections=['up','down','left','right'],keyCodes={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',lp:'KeyJ',mp:'KeyK',hp:'KeyL',lk:'KeyU',mk:'KeyI',hk:'KeyO',jump:'Space',start:'KeyP'};let pads=[];
class Element extends EventTarget{dataset={};style={setProperty(){}};classList={toggle(){}};setPointerCapture(){};getBoundingClientRect(){return{left:0,top:0,width:300,height:300,right:300,bottom:300};}closest(){return this;}}
function setup(){globalThis.window=new EventTarget();window.innerWidth=800;window.innerHeight=520;const nodes=new Map();for(const [name,actions]of Object.entries(directions)){const n=new Element();n.dataset=actions.length===1?{action:actions[0]}:{directions:actions.join(' ')};nodes.set(name,n);}for(const action of buttons){const n=new Element();n.dataset.action=action;nodes.set(action,n);}const root=new Element(),dpad=new Element();root.querySelectorAll=s=>s==='[data-action]'?[...nodes.values()].filter(n=>n.dataset.action):[];root.querySelector=s=>s==='.dpad'?dpad:null;root.contains=n=>[...nodes.values()].includes(n);globalThis.document={createElement:()=>root,elementFromPoint:()=>document.hit,addEventListener(){},removeEventListener(){}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});pads=[];const input=new InputManager(),touch=new TouchControls(input);return{input,touch,nodes,dpad};}
function pointer(node,type,id,x=document.hit?100:-100,y=document.hit?100:-100){const e=new Event(type,{cancelable:true});Object.defineProperties(e,{pointerId:{value:id},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
function domKey(type,code){const e=new Event(type,{cancelable:true});Object.defineProperty(e,'code',{value:code});window.dispatchEvent(e);}
function down(s,name,id=11){document.hit=s.nodes.get(name);pointer(s.dpad,'pointerdown',id);pointer(s.nodes.get(name),'pointerdown',id);}
function move(s,name,id=11){document.hit=s.nodes.get(name)??null;pointer(s.dpad,'pointermove',id);}
function end(s,type='pointerup',id=11){pointer(s.dpad,type,id);}
function held(s,expected){for(const a of allDirections)assert.equal(s.input.touchHeld(a),expected.includes(a),'Touch direction '+a+' expected '+expected);}
let singleDiagonalControls=0;
for(const side of ['left','right'])for(const finish of ['pointerup','pointercancel','lostpointercapture','release','hide','edit']){const s=setup(),f=new Fighter(CHARACTERS[0],'player',600,500,1);down(s,side==='right'?'DR':'DL');if(finish==='release')s.touch.releaseAll();else if(finish==='hide'){s.touch.setVisible(false);s.touch.setVisible(true);}else if(finish==='edit'){s.touch.setEditMode(true);s.touch.setEditMode(false);}else end(s,finish);pointer(s.nodes.get('lp'),'pointerdown',40);f.captureInput(s.input,1000);f.updatePlayer(s.input,new CombatWorld(CHARACTERS[0],CHARACTERS[0],'duel').rules);assert.equal(f.currentMove?.id,'5LP','Single diagonal '+side+'/'+finish+' must not manufacture QCF/QCB');singleDiagonalControls++;s.touch.releaseAll();s.input.destroy();}
{const s=setup();s.input.setTouch('down',true);s.input.setTouch('right',true);s.input.endTick();s.touch.releaseAll();held(s,[]);assert.equal(s.input.directionChanges().length,2,'Known pre-release baseline plus one atomic neutral state');assert.equal(s.input.directionChanges()[0].size,2);assert.equal(s.input.directionChanges()[1].size,0);s.input.destroy();singleDiagonalControls++;}
let coalescedCases = 0;
if (!recording) {
  for (const face of [-1, 1]) {
    for (const kind of ['quarter-circle', 'straight', 'cancel', 'return-to-down']) {
      const s = setup();
      const world = new CombatWorld(CHARACTERS[0], CHARACTERS[1], 'duel');
      const fighter = world.player;
      fighter.facing = face;
      const x = face === 1 ? 250 : 50;
      const forward = face === 1 ? 'right' : 'left';
      Object.defineProperty(navigator, 'vibrate', { value: () => { vibrations++; } });
      let vibrations = 0;
      down(s, 'D');
      vibrations = 0;
      document.hit = null;
      const event = new Event('pointermove', { cancelable: true });
      const clientX = kind === 'return-to-down' ? 150 : x;
      const clientY = kind === 'return-to-down' ? 250 : 150;
      const samples = kind === 'straight' ? [] : [{ clientX: x, clientY: 250 }, { clientX: x, clientY: 150 }];
      Object.defineProperties(event, {
        pointerId: { value: 11 },
        clientX: { value: clientX },
        clientY: { value: clientY },
        getCoalescedEvents: { value: () => samples },
      });
      s.dpad.dispatchEvent(event);
      held(s, [kind === 'return-to-down' ? 'down' : forward]);
      assert.equal(vibrations, kind === 'return-to-down' ? 0 : 1, 'Only the final direction may vibrate');
      if (kind === 'cancel') end(s, 'pointercancel');
      else end(s);
      held(s, []);
      pointer(s.nodes.get('lp'), 'pointerdown', 40);
      step(s.input, [fighter], world.rules);
      assert.equal(fighter.currentMove?.id, kind === 'quarter-circle' || kind === 'return-to-down' ? 'RYU_PRIMARY' : '5LP', kind + ' face ' + face);
      s.touch.releaseAll();
      s.input.destroy();
      coalescedCases++;
    }
  }
}
let rapidChordCases = 0;
if (!recording) {
  const character = CHARACTERS.find(c => c.id === 'KEN');
  for (const mode of ['duel', 'belt']) for (const face of [-1, 1]) {
    for (const scenario of ['forward', 'down-forward', 'attack-first', 'cancel-attack', 'cancel-pad', 'completed-before-cancel', 'physical']) {
      const s = setup();
      const world = new CombatWorld(character, character, mode);
      const fighter = world.player;
      fighter.facing = face;
      const forward = face === 1 ? 'R' : 'L';
      const dip = face === 1 ? 'DR' : 'DL';
      const mk = s.nodes.get('mk');
      if (scenario === 'attack-first') pointer(mk, 'pointerdown', 40);
      down(s, scenario === 'down-forward' ? dip : forward);
      if (scenario !== 'attack-first' && scenario !== 'physical') pointer(mk, 'pointerdown', 40);
      if (scenario === 'physical') { domKey('keydown', 'KeyI'); domKey('keyup', 'KeyI'); }
      if (scenario === 'cancel-pad') end(s, 'pointercancel');
      else end(s);
      pointer(mk, scenario === 'cancel-attack' ? 'pointercancel' : 'pointerup', 40);
      if (scenario === 'completed-before-cancel') {
        pointer(mk, 'pointerdown', 41);
        pointer(mk, 'pointercancel', 41);
      }
      held(s, []);
      assert.equal(s.input.touchHeld('mk'), false);
      step(s.input, [fighter], world.rules);
      const expected = scenario === 'cancel-attack' ? undefined
        : scenario === 'down-forward' && mode === 'duel' ? '2MK'
        : ['forward', 'down-forward', 'completed-before-cancel'].includes(scenario) ? 'KEN_CMD_MK' : '5MK';
      assert.equal(fighter.currentMove?.id, expected, mode + '/' + face + '/' + scenario);
      s.touch.releaseAll();
      s.input.destroy();
      rapidChordCases++;
    }
  }
}
let releasePointCases = 0;
if (!recording) {
  for (const face of [-1, 1]) {
    for (const scenario of ['forward', 'outside', 'cancel', 'lost', 'unowned', 'mouse', 'menu', 'neutral-entry']) {
      const s = setup();
      const world = new CombatWorld(CHARACTERS[0], CHARACTERS[1], 'duel');
      const fighter = world.player;
      fighter.facing = face;
      if (scenario === 'menu') s.touch.setSelectionMode(true);
      down(s, 'D');
      move(s, face === 1 ? 'DR' : 'DL');
      document.hit = null;
      if (scenario === 'menu') document.hit = s.nodes.get(face === 1 ? 'R' : 'L');
      if (scenario === 'neutral-entry') move(s, 'neutral');
      let releaseVibrations = 0;
      Object.defineProperty(navigator, 'vibrate', { value: () => { releaseVibrations++; } });
      const type = scenario === 'cancel' ? 'pointercancel' : scenario === 'lost' ? 'lostpointercapture' : 'pointerup';
      const event = new Event(type, { cancelable: true });
      Object.defineProperties(event, {
        pointerId: { value: scenario === 'unowned' ? 99 : 11 },
        pointerType: { value: scenario === 'mouse' ? 'mouse' : 'touch' },
        clientX: { value: scenario === 'outside' ? -20 : face === 1 ? 250 : 50 },
        clientY: { value: 150 },
      });
      s.dpad.dispatchEvent(event);
      if (scenario === 'unowned') {
        held(s, [face === 1 ? 'right' : 'left', 'down']);
        end(s);
      }
      end(s, 'lostpointercapture');
      held(s, []);
      assert.equal(releaseVibrations, 0, 'Release coordinates must only update input history');
      pointer(s.nodes.get('lp'), 'pointerdown', 40);
      step(s.input, [fighter], world.rules);
      assert.equal(fighter.currentMove?.id, ['forward', 'neutral-entry'].includes(scenario) ? 'RYU_PRIMARY' : '5LP', scenario + ' face ' + face);
      s.touch.releaseAll();
      s.input.destroy();
      releasePointCases++;
    }
  }
}
if(recording)console.log(JSON.stringify(records));else console.log('TOUCH_MOTION_BURST_PASS',JSON.stringify({cases,slowControls,sharedCases,negativeControls,mixedControls,singleDiagonalControls,coalescedCases,rapidChordCases,releasePointCases,characters:10,facings:2,modes:2,commands:5}));
