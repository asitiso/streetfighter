import assert from'node:assert/strict';
import{SceneManager}from'../dist/assets/core/SceneManager.js';
let cases=0;
for(const kind of['sync','async','deferred'])for(const destroyFails of[false,true])for(const reason of[Error('primary exit failure'),undefined,'primitive exit failure']){
 const manager=new SceneManager(),events=[];let rejectExit;const gate=new Promise((_,reject)=>rejectExit=reject);gate.catch(()=>{});
 const scene=id=>({resize(){events.push(id+' resize')},enter(){events.push(id+' enter')},exit(){events.push(id+' exit')},destroy(){events.push(id+' destroy')},fixedUpdate(){events.push(id+' update')},render(){events.push(id+' render')}});
 const old={...scene('old'),exit(){events.push('old exit');if(kind==='sync')throw reason;return kind==='async'?Promise.reject(reason):gate;},destroy(){events.push('old destroy');if(destroyFails)throw Error('secondary destroy failure')}};
 await manager.setScene(old);events.length=0;const failed=manager.setScene(scene('skipped')),recovered=manager.setScene(scene('recovered'));const outcome=failed.then(()=>({resolved:true}),error=>({resolved:false,error}));
 if(kind==='deferred'){await Promise.resolve();await Promise.resolve();assert.deepEqual(events,['old exit']);manager.fixedUpdate(1/60,1);manager.render({},1,1/60);assert(!events.includes('old render'));rejectExit(reason);}
 const rejected=await outcome;assert.equal(rejected.resolved,false);assert.equal(rejected.error,reason,'destroy failure must not replace exit failure');await recovered;
 assert.deepEqual(events,['old exit','old destroy','recovered resize','recovered enter'],'exit failure still destroys old scene and queue recovers');manager.fixedUpdate(1/60,2);manager.render({},1,1/60);assert(events.includes('recovered update'));assert(events.includes('recovered render'));cases++;
}
console.log(JSON.stringify({passed:true,cases}));
