import assert from 'node:assert/strict';
import {TouchControls} from '../dist/assets/ui/TouchControls.js';
import {InputManager} from '../dist/assets/input/InputManager.js';
import {EndingScene} from '../dist/assets/scenes/EndingScene.js';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {getCharacter} from '../dist/assets/game/characters.js';
globalThis.window=new EventTarget();globalThis.document=new EventTarget();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});const c=getCharacter('KEN'),audio={playStagePulse(){}};let cases=0;
function fixture(){const input=new InputManager(),classes=new Set(),start={textContent:'START'};let layouts=0;const control=Object.create(TouchControls.prototype);Object.assign(control,{input,endingMode:false,settings:{stickScale:1.4,buttonScale:.7,stickX:64,stickY:48,buttonsX:52,buttonsY:44},element:{querySelector:selector=>selector==='.start-button'?start:null,classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);}}},pointerPoints:new Map(),buttonPointers:new Map(),dpadActions:[],directionPressed:null,dpadPointerId:null,drag:null,applySettings(){layouts++;}});return{input,control,classes,start,layouts:()=>layouts,close:()=>input.destroy()};}
for(const close of ['exit','destroy']){const f=fixture(),s=new EndingScene({},audio,c,c.superArts[0],[],()=>{},undefined,undefined,false,active=>f.control.setEndingMode(active));s.enter();assert(f.classes.has('ending-mode'));assert.equal(f.start.textContent,'BACK TO TITLE');s[close]();assert(!f.classes.has('ending-mode'));assert.equal(f.start.textContent,'START');f.close();cases++;}
{const f=fixture(),before=f.control.getSettings();for(const a of ['lp','start','left'])f.input.setTouch(a,true);f.control.setEndingMode(true);for(const a of ['lp','start','left']){assert.equal(f.input.touchHeld(a),false);assert.equal(f.input.pressed(a),false);}f.input.setTouch('start',true);f.control.setEndingMode(true);assert.equal(f.input.touchHeld('start'),true);f.control.setEndingMode(false);assert.equal(f.input.touchHeld('start'),false);assert.equal(f.input.pressed('start'),false);assert.deepEqual(f.control.getSettings(),before);assert.equal(f.layouts(),2);f.close();cases++;}
{const f=fixture(),e=new Event('keydown',{cancelable:true});Object.defineProperties(e,{code:{value:'KeyJ'},repeat:{value:false}});window.dispatchEvent(e);f.control.setEndingMode(true);assert.equal(f.input.held('lp'),true);assert.equal(f.input.pressed('lp'),false);f.input.setTouch('start',true);f.input.setTouch('start',false);f.input.prepareTick();assert.equal(f.input.pressed('start'),true);f.close();cases++;}
{const f=fixture();let captured;const a={input:{},audio,save:{completedStages:[],stageResults:[]},touch:f.control,recovery:{checkpoint(){}},persist:async()=>{},enterLoadedScene(createScene){return this.scenes.setScene(createScene());},loadStageModule:async()=>({EndingScene}),scenes:{setScene:async s=>captured=s}};await GameApp.prototype.showEnding.call(a,c,c.superArts[0]);captured.enter();assert(f.classes.has('ending-mode'));captured.exit();captured.destroy();assert(!f.classes.has('ending-mode'));assert.equal(f.layouts(),2);f.close();cases++;}
console.log(JSON.stringify({passed:true,cases,lifecycle:2,inputAndSettings:1,firstTickAndKeyboard:1,gameAppWiring:1}));


const ending = new EndingScene({},audio,c,c.superArts[0],[],()=>{});
const prompts = [];
const ctx = { fillText(text,x,y,maxWidth) { prompts.push({text,x,y,maxWidth,font:this.font,color:this.fillStyle}); } };
ending.time = 0;
ending.drawPrompt(ctx);
ending.time = Math.PI * 3 / 8;
ending.drawPrompt(ctx);
assert.equal(prompts[0].text,'ENTER / START / ATTACK TO RETURN TO TITLE');
assert.equal(prompts[0].font.includes('18px'),true);
assert.equal(prompts[0].color,'#fff4dc');
assert.deepEqual(prompts[0],prompts[2],'Return hint should keep its contrast over time');
ending.returnError='RETURN FAILED';
ending.drawPrompt(ctx);
assert.equal(prompts[4].text,'RETURN FAILED','Recovery remains visible');
console.log('ENDING_RETURN_LABEL_PASS');


let showTouch = true;
const touchEnding = new EndingScene({},audio,c,c.superArts[0],[],()=>{},undefined,undefined,false,undefined,()=>showTouch);
touchEnding.time = 5;
prompts.length = 0;
touchEnding.drawPrompt(ctx, showTouch);
assert(!prompts.some(p => p.text.includes('TO RETURN TO TITLE')), 'A visible touch button replaces the keyboard hint');
assert(prompts.some(p => p.text.includes('UNLOCKED')));
touchEnding.returnError = 'RETURN FAILED';
touchEnding.drawPrompt(ctx, showTouch);
assert(prompts.some(p => p.text === 'RETURN FAILED' && p.y < 250), 'Touch retry status must be above the footer');
const cards = [];
const recordContext = {
  beginPath() {}, fill() {}, fillText() {},
  roundRect(x,y,width,height) { cards.push({x,y,width,height}); },
};
touchEnding.drawRecord(recordContext, showTouch);
assert.equal(cards.length, 6);
assert(cards.every(card => card.y > 486 && card.y + card.height <= 550), 'Touch record leaves room below the story and above the button');
showTouch = false;
prompts.length = 0;
touchEnding.returnError = '';
touchEnding.drawPrompt(ctx, showTouch);
assert(prompts.some(p => p.text.includes('TO RETURN TO TITLE')));
console.log('ENDING_TOUCH_SAFE_FOOTER_PASS');


for (const compact of [false, true]) {
  const text = [], layout = [];
  const record = {
    beginPath() {}, fill() {},
    roundRect(x,y,width,height) { layout.push({x,y,width,height}); },
    fillText(label,x,y,maxWidth) { text.push({label,x,y,maxWidth,font:this.font,color:this.fillStyle}); },
  };
  touchEnding.drawRecord(record, compact);
  assert.equal(layout.length, 6);
  assert.equal(text.length, 12);
  assert.equal(layout[0].x + layout.at(-1).x + layout.at(-1).width, 1280, 'Record row is centered');
  for (const [index, card] of layout.entries()) {
    const [label,value] = text.slice(index * 2,index * 2 + 2);
    assert.match(label.font, compact ? /21px/ : /14px/);
    assert.match(value.font, compact ? /26px/ : /22px/);
    assert.equal(label.color, '#e6dfd5');
    assert.equal(label.x, card.x + card.width / 2);
    assert.equal(value.x,label.x);
    assert(label.maxWidth < card.width && value.maxWidth < card.width);
    assert(label.y < value.y && label.y > card.y && value.y < card.y + card.height);
  }
}
console.log('ENDING_RECORD_READABILITY_PASS');

for (const compact of [false, true]) {
  const early = [];
  touchEnding.time = 0;
  touchEnding.drawRecord({
    fillText(text) { early.push({ text, alpha: this.globalAlpha }); },
    beginPath() {}, roundRect() {}, fill() {},
  }, compact);
  assert.equal(early.length, 12, 'Campaign results must be visible from the first frame');
  assert(early.every(item => item.alpha === 1), 'Record must be legible when the exit is already available');
}
console.log('ENDING_RECORD_ON_ENTRY_PASS');
