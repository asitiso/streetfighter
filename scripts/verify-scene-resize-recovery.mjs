import assert from'node:assert/strict';
import{SceneManager}from'../dist/assets/core/SceneManager.js';
import{acquirePoseBlendCanvas}from'../dist/assets/render/PoseBlendBuffer.js';
globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;}};
let cases=0;
for(const cleanupFailure of['none','exit','destroy']){
 const manager=new SceneManager(),events=[],primary=Error('injected resize failure');let buffer;
 const ordinary=id=>({resize(w,h){events.push(id+' resize '+w+'x'+h)},enter(){events.push(id+' enter')},exit(){events.push(id+' exit')},destroy(){events.push(id+' destroy')},fixedUpdate(){events.push(id+' update')},render(){events.push(id+' render')}});
 manager.resize(1440,810);await manager.setScene(ordinary('old'));events.length=0;
 const bad={...ordinary('bad'),resize(w,h){events.push('bad resize '+w+'x'+h);buffer=acquirePoseBlendCanvas();buffer.width=buffer.height=2048;throw primary;},exit(){events.push('bad exit');if(cleanupFailure==='exit')throw Error('secondary exit failure')},destroy(){events.push('bad destroy');if(cleanupFailure==='destroy')throw Error('secondary destroy failure')}};
 await assert.rejects(manager.setScene(bad),error=>error===primary,'original resize error must survive cleanup');
 assert.deepEqual(events,['old exit','old destroy','bad resize 1440x810','bad exit','bad destroy'],'failed resize must exit and destroy scene');assert.equal(buffer.width,1,'failed resize must release pose buffer');
 manager.fixedUpdate(1/60,1);manager.render({},1,1/60);assert(!events.includes('bad update'));assert(!events.includes('bad render'));
 await manager.setScene(ordinary('good'));assert.equal(events.filter(x=>x==='bad destroy').length,1);manager.fixedUpdate(1/60,2);manager.render({},1,1/60);assert(events.includes('good enter'));assert(events.includes('good update'));assert(events.includes('good render'));cases++;
}
console.log(JSON.stringify({passed:true,cases}));
