import assert from 'node:assert/strict';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {FixedStepLoop} from '../dist/assets/core/FixedStepLoop.js';
import {InputManager} from '../dist/assets/input/InputManager.js';
let now=0,id=0,queue=new Map(),cases=0;
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
globalThis.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};globalThis.cancelAnimationFrame=n=>queue.delete(n);
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
globalThis.document=new EventTarget();globalThis.window=new EventTarget();window.matchMedia=()=>({matches:window.portrait});
function step(ms){now+=ms;const callbacks=[...queue.values()];queue.clear();for(const f of callbacks)f(now);}
for(const initialPortrait of [false,true])for(const initialHidden of [false,true])for(const finalPortrait of [false,true])for(const finalHidden of [false,true]){
 document.hidden=initialHidden;window.portrait=initialPortrait;let ticks=0,renders=0,releases=0;const input=new InputManager(),app=Object.create(GameApp.prototype),audio={paused:true,backgrounded:false,setBackgrounded(v){this.backgrounded=v;}};
 Object.assign(app,{pageHidden:false,playbackBlocked:false,input,audio,touch:{releaseAll(){releases++;input.setTouch('right',false);input.setTouch('lp',false);}},loop:new FixedStepLoop(()=>ticks++,()=>renders++)});
 app.syncPlayback();step(17);input.setTouch('right',true);input.endTick();app.pageHidden=true;app.syncPlayback();assert(audio.backgrounded);assert.equal(queue.size,0,'Pagehide blocks RAF even when visibility remains visible');const before=[ticks,renders];step(60000);assert.deepEqual([ticks,renders],before);
 document.hidden=finalHidden;window.portrait=finalPortrait;app.syncPlayback();assert(audio.backgrounded,'Resize/visibility cannot resume a page that has not returned');assert.equal(queue.size,0);input.setTouch('lp',true);input.setTouch('lp',false);
 app.pageHidden=false;app.syncPlayback();const blocked=finalHidden||finalPortrait;assert.equal(audio.backgrounded,blocked);assert.equal(queue.size,blocked?0:1);assert(audio.paused,'Manual audio pause remains');
 if(!blocked){assert(!input.touchHeld('right'));assert(!input.pressed('lp'));step(17);assert.equal(ticks,before[0]+1,'Only new elapsed time is simulated');input.setTouch('lp',true);assert(input.pressed('lp'),'Fresh attack immediate');input.endTick();const epoch=input.historyEpoch,count=releases;app.syncPlayback();assert(input.touchHeld('lp'),'Duplicate pageshow does not release fresh touch');assert.equal(input.historyEpoch,epoch);assert.equal(releases,count);}
 app.loop.stop();input.destroy();assert.equal(queue.size,0);cases++;
}
console.log(JSON.stringify({ok:true,cases,checks:['pagehide blocks independently','resize/visibility cannot bypass pagehide','pageshow respects portrait/visibility','no old catchup or attack','manual pause preserved','duplicate show preserves fresh touch']}));
