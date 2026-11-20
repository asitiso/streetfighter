import assert from 'node:assert/strict';
import {FixedStepLoop} from '../dist/assets/core/FixedStepLoop.js';
let now=0,id=0,queue=new Map(),cancelled=new Map();
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>now}});
globalThis.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};
globalThis.cancelAnimationFrame=n=>{if(queue.has(n))cancelled.set(n,queue.get(n));queue.delete(n);};
const step=ms=>{now+=ms;const callbacks=[...queue.values()];queue.clear();for(const fn of callbacks)fn(now);};
function setup(update=()=>{},render=()=>{}){queue.clear();cancelled.clear();let ticks=[],renders=[];const loop=new FixedStepLoop((dt,tick)=>{ticks.push([dt,tick]);update(loop);},(alpha,dt)=>{renders.push([alpha,dt]);render(loop);});return{loop,ticks,renders};}
let cases=0;
for(const phase of ['update','render'])for(const restart of [false,true]){
 let first=true;const action=loop=>{if(first){first=false;loop.stop();if(restart)loop.start();}};
 const t=setup(phase==='update'?action:undefined,phase==='render'?action:undefined);t.loop.start();step(100);
 assert.equal(queue.size,restart?1:0,phase+' stop/restart must leave exactly one current reservation');
 if(phase==='update')assert.equal(t.ticks.length,1,'Stop inside update must terminate catchup immediately');else assert(t.ticks.length>=5&&t.ticks.length<=6);
 assert.equal(t.renders.length,phase==='update'?0:1,'Old update cannot render after stop');
 if(!restart){now+=60000;t.loop.start();}const prior=t.ticks.length;step(17);assert.equal(t.ticks.length,prior+1,'Resume cannot replay unconsumed old frame catchup');
 const drawn=t.renders.length;for(let i=0;i<20;i++){step(17);assert.equal(queue.size,1);}
 assert.equal(t.renders.length,drawn+20,'One render per browser frame');t.loop.stop();assert.equal(queue.size,0);cases++;
}
// A cancelled callback already copied by the browser must not join a later run.
{const t=setup();t.loop.start();const stale=[...queue.values()][0];t.loop.stop();t.loop.start();const live=[...queue.values()][0];now+=17;stale(now);assert.equal(t.ticks.length,0);assert.equal(t.renders.length,0);assert.equal(queue.size,1);queue.clear();live(now);assert.equal(t.ticks.length,1);assert.equal(t.renders.length,1);assert.equal(queue.size,1);t.loop.stop();cases++;}
// Normal 60Hz pace, 6-tick catchup cap, interpolation and real render timing stay unchanged.
{const t=setup();t.loop.start();t.loop.start();assert.equal(queue.size,1);for(let n=0;n<60;n++)step(1000/60);assert(t.ticks.length>=59&&t.ticks.length<=60);assert.equal(t.renders.length,60);for(const[dt]of t.ticks)assert.equal(dt,1/60);for(const[a]of t.renders)assert(a>=0&&a<1);const before=t.ticks.length;step(500);assert(t.ticks.length-before>=5&&t.ticks.length-before<=6,'Catchup capped at six 60Hz steps');assert.equal(t.renders.at(-1)[1],.5);t.loop.stop();assert.equal(queue.size,0);cases++;}
console.log(JSON.stringify({ok:true,cases,checks:['update/render stop and restart','single RAF chain','cancelled callback isolation','no blocked catchup','60Hz and interpolation unchanged','6 tick cap and real frame time preserved']}));
