import assert from 'node:assert/strict';
import {GameApp} from '../dist/assets/core/GameApp.js';
import {SessionRecoveryStore,SESSION_RECOVERY_KEY} from '../dist/assets/core/SessionRecovery.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
function store(route){memory.clear();const seed={candidate:'test',sessionId:'old-session',status:'active',route,stage:route==='ending'?5:Number(route.slice(-1)),character:'KEN',superArt:2,startedAt:'before',updatedAt:'before',cleanReason:null};localStorage.setItem(SESSION_RECOVERY_KEY,JSON.stringify(seed));const recovery=new SessionRecoveryStore('test');recovery.begin();return{recovery,seed};}
let cases=0;
for(const route of ['stage-1','stage-2','stage-3','stage-4','stage-5','ending'])for(const failure of ['sync','async','deferred']){
 const {recovery,seed}=store(route);let calls=0,reject;const error=Error('controlled '+failure);const pending=new Promise((_,r)=>reject=r);pending.catch(()=>{});const target=()=>{calls++;if(calls>1)return Promise.resolve();if(failure==='sync')throw error;return failure==='async'?Promise.reject(error):pending;};
 const fake={recovery,save:null,recoveryHistory:{record(){}},showTitle:async()=>{},startStageNumber:target,showEnding:target};
 const attempt=GameApp.prototype.recoverInterruptedSession.call(fake);if(failure==='deferred'){assert.equal(recovery.snapshot().available,false,'In-flight recovery must be consumed once');reject(error);}await assert.rejects(attempt,e=>e===error);
 assert.deepEqual(recovery.snapshot().checkpoint,seed,'Failed recovery must retain the original route/fighter/art');assert.equal(calls,1,'Must not auto-retry');
 await GameApp.prototype.recoverInterruptedSession.call(fake);assert.equal(calls,2);assert.equal(recovery.snapshot().available,false,'Successful retry consumes checkpoint');cases++;
}
{const{recovery,seed}=store('stage-3');const consumed=recovery.consumeRecovery();recovery.restoreRecovery(consumed);consumed.character='RYU';assert.deepEqual(recovery.snapshot().checkpoint,seed);const view=recovery.snapshot().checkpoint;view.stage=1;assert.equal(recovery.snapshot().checkpoint.stage,3);recovery.restoreRecovery({...seed,stage:4});assert.equal(recovery.snapshot().checkpoint.stage,3,'Do not overwrite an available recovery');cases++;}
{const{recovery}=store('stage-2');recovery.consumeRecovery();let titles=0;await GameApp.prototype.recoverInterruptedSession.call({recovery,showTitle:async()=>titles++});assert.equal(titles,1);cases++;}
console.log(JSON.stringify({passed:true,cases,retryFailureCases:18,cloneAndAvailableControl:1,emptyControl:1}));
