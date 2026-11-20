import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{runInNewContext}from'node:vm';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),name=/const CACHE_VERSION = '([^']+)'/.exec(source)[1],previous='game-cache-v'+(Number(name.match(/\d+$/)[0])-1),origin='https://streetfighter.test',path=origin+'/probe.webp';
async function run({fault='',online=true,status=200,current=false,prior=false,index=false,rollback=false,mode='cors'}={}){const stores=new Map(),handlers=new Map();
let fetches=0,puts=0;
const store=n=>{if(!stores.has(n))stores.set(n,new Map());
return stores.get(n);
};
if(current)store(name).set(path,new Response('current'));
if(prior)store(previous).set(path,new Response('previous'));
if(index)store(name).set(origin+'/index.html',new Response('shell'));
if(rollback)store('ssc-update-meta').set(origin+'/__ssc_rollback_target__',new Response(previous));
const caches={keys:async()=>{if(fault==='keys')throw Error('keys unavailable');
return[...stores.keys()];
},open:async n=>{if(fault==='allOpen'||fault==='metaOpen'&&n==='ssc-update-meta'||fault==='currentOpen'&&n===name||fault==='previousOpen'&&n===previous)throw Error('open unavailable');
return{match:async r=>{if(fault==='allMatch'||fault==='metaMatch'&&n==='ssc-update-meta'||fault==='currentMatch'&&n===name||fault==='previousMatch'&&n===previous)throw Error('match unavailable');
const key=typeof r==='string'?new URL(r,origin).href:r.url;
return store(n).get(key)?.clone();
},put:async(r,res)=>{puts++;
store(n).set(r.url,res.clone());
}};
}};
runInNewContext(source,{URL,Response,caches,fetch:async()=>{fetches++;
if(!online)throw Error('network unavailable');
return new Response('fresh',{status,headers:{'content-type':'image/webp'}});
},self:{location:{origin},addEventListener:(t,h)=>handlers.set(t,h)}});
let promise;
handlers.get('fetch')({request:{url:path,method:'GET',mode},respondWith:p=>promise=p});
return{response:await promise,fetches,puts};
}let cases=0;

for(const fault of ['metaOpen','metaMatch','currentOpen','currentMatch','keys','previousOpen','previousMatch','allOpen','allMatch'])for(const status of [200,404]){const r=await run({fault,status});
assert.equal(r.response.status,status,fault+' must not block network');
assert.equal(await r.response.text(),'fresh');
assert.equal(r.fetches,1,'Cache failures must not add network retries');
cases++;
}
for(const [args,body]of [[{fault:'metaOpen',online:false,current:true},'current'],[{fault:'metaMatch',online:false,current:true},'current'],[{fault:'currentOpen',online:false,prior:true},'previous'],[{fault:'currentMatch',online:false,prior:true},'previous'],[{fault:'keys',online:false,current:true},'current'],[{fault:'previousOpen',online:false,current:true},'current'],[{fault:'previousMatch',online:false,current:true},'current'],[{fault:'allOpen',online:false},''],[{fault:'allMatch',online:false,prior:true,current:true},''],[{online:false,index:true,mode:'navigate'},'shell']]){const r=await run(args);
assert.equal(await r.response.text(),body);
assert.equal(r.fetches,1);
assert.equal(r.response.type,body?'default':'error');
cases++;
}
{const r=await run({rollback:true,prior:true});
assert.equal(await r.response.text(),'previous');
assert.equal(r.fetches,0,'Readable explicit rollback stays authoritative');
cases++;
}
{const r=await run({rollback:true,prior:true,fault:'previousOpen'});
assert.equal(await r.response.text(),'fresh');
assert.equal(r.fetches,1);
cases++;
}
console.log(JSON.stringify({passed:true,cases,networkControls:18,offlineControls:10,rollbackControls:2}));

