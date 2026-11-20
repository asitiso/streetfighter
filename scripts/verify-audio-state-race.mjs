import assert from 'node:assert/strict';
import {AudioManager} from '../dist/assets/core/AudioManager.js';
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
function context(state){const c={state,calls:[]};for(const[method,target]of [['resume','running'],['suspend','suspended']])c[method]=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});c.calls.push({method,resolve,reject});return promise.then(()=>{c.state=target;});};return c;}
function fixture(state){const a=new AudioManager(),c=context(state);a.context=c;return{a,c};}
async function finish(c,index){assert(c.calls[index],'Expected audio operation '+index);c.calls[index].resolve();await flush();}
function block(a,kind,value){if(kind==='background'||kind==='both')a.setBackgrounded(value);if(kind==='pause'||kind==='both')a.setPaused(value);}
let cases=0;
for(const kind of ['background','pause','both'])for(const reverse of [false,true]){const{a,c}=fixture(reverse?'running':'suspended');if(reverse){block(a,kind,true);block(a,kind,false);}else{a.setBackgrounded(false);block(a,kind,true);}assert.equal(c.calls.length,1,'Share in-flight operation');await finish(c,0);assert.equal(c.calls.length,2,'Completion must reconcile latest desired state');await finish(c,1);assert.equal(c.state,reverse?'running':'suspended');assert.equal(a.isRunning(),reverse);assert.equal(c.calls.length,2);cases++;}
{const{a,c}=fixture('suspended');a.setBackgrounded(false);a.setBackgrounded(true);a.setBackgrounded(false);assert.equal(c.calls.length,1);await finish(c,0);assert.equal(c.state,'running');assert.equal(c.calls.length,1,'No extra operation after latest intent matches');cases++;}
{const{a,c}=fixture('suspended');for(let n=0;n<20;n++)a.setBackgrounded(false);assert.equal(c.calls.length,1,'Repeated sync cannot queue duplicate resumes');await finish(c,0);assert(a.isRunning());cases++;}
{const{a,c}=fixture('suspended');let settled=false;const unlock=a.unlock().then(()=>{settled=true;});a.setBackgrounded(true);await finish(c,0);assert.equal(settled,false,'Unlock waits until latest requested state is reconciled');await finish(c,1);await unlock;assert.equal(c.state,'suspended');cases++;}
{const{a,c}=fixture('suspended');a.setBackgrounded(false);c.calls[0].reject(Error('control rejected'));await flush();a.setBackgrounded(false);assert.equal(c.calls.length,2,'Rejection unlocks future explicit retry');await finish(c,1);assert(a.isRunning());cases++;}
{const a=new AudioManager();a.setEnabled(false);await a.unlock();assert.equal(a.context,null,'Muted boot does not create context');a.setBackgrounded(true);a.setPaused(true);await flush();assert.equal(a.context,null);cases++;}
{const{a,c}=fixture('running');a.setBackgrounded(true);a.setEnabled(false);a.setBackgrounded(false);await finish(c,0);assert.equal(c.state,'suspended');assert.equal(c.calls.length,1,'Disabled audio must not be resumed by reconciliation');cases++;}
console.log(JSON.stringify({ok:true,cases,checks:['late resume remains blocked','late suspend resumes visible audio','manual pause independent','one control operation in flight','unlock latest-state fence','failure retry','muted boot unchanged']}));
