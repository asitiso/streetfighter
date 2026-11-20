import assert from 'node:assert/strict';import{AssetManager,ASSET_GROUPS,CAMPAIGN_OFFLINE_URLS}from'../dist/assets/core/AssetManager.js';const links=[],requests=[],messages=[],stored=new Map();const response={ok:true,status:200,clone(){return this;}};globalThis.document={querySelector(selector){return links.find(l=>selector.includes('"'+l.dataset.gamePreload+'"'))??null;},createElement(){return{dataset:{}};},head:{appendChild(link){links.push(link);}}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,serviceWorker:{controller:{postMessage:m=>messages.push(m)}}}});globalThis.caches={open:async()=>({match:async u=>stored.get(u),put:async(u,r)=>{stored.set(u,r);}})};globalThis.fetch=async(url,options)=>{requests.push({url,cache:options.cache});return response;};const a=new AssetManager();let progressChecks=0;for(const[name,urls]of Object.entries(ASSET_GROUPS)){const progress=[];await a.loadGroup(name,(done,total)=>progress.push([done,total]));assert(a.hasGroup(name));assert.deepEqual(progress.at(-1),[urls.length,urls.length]);progressChecks++;}const invalid=links.filter(l=>!l.href.startsWith('/assets/')||!l.href.endsWith('.js'));assert.equal(invalid.length,0,'Media/JSON must never be parsed as JavaScript module preloads: '+invalid.slice(0,3).map(l=>l.href).join(','));const expectedModules=[...new Set(Object.values(ASSET_GROUPS).flat().filter(u=>u.startsWith('/assets/')&&u.endsWith('.js')))];assert.deepEqual(links.map(l=>l.href).sort(),expectedModules.sort());assert(links.length>0);assert(links.every(l=>l.rel==='modulepreload'));assert.equal(new Set(links.map(l=>l.href)).size,links.length);for(const url of new Set(Object.values(ASSET_GROUPS).flat()))assert(stored.has(url),'All media and code still enter cache: '+url);assert(requests.some(r=>r.url.endsWith('.ogg')&&r.cache==='force-cache'));assert(requests.some(r=>r.url.endsWith('.png')&&r.cache==='force-cache'));assert(requests.filter(r=>r.url.startsWith('/assets/')&&r.url.endsWith('.js')).every(r=>r.cache==='reload'));const before=links.length;await a.prepareOfflineCampaign();assert.equal((await a.verifyOfflineCampaign()).ready,true);assert(CAMPAIGN_OFFLINE_URLS.every(u=>stored.has(u)));assert(links.every(l=>l.href.endsWith('.js')));assert.equal(new Set(links.map(l=>l.href)).size,links.length);navigator.onLine=false;const requestsBefore=requests.length;a.invalidateGroup('stage-2');await a.loadGroup('stage-2');assert.equal(requests.length,requestsBefore,'Offline cached stage should not fetch');assert.equal(links.length,before,'Cached/offline routes must reuse module hint');delete globalThis.document;a.modulePreload('/assets/scenes/Stage2Scene.js');console.log(JSON.stringify({passed:true,groups:progressChecks,moduleHints:links.length,mediaCached:true,offlineCampaignReady:true,offlineStageReady:true,noDuplicateHints:true,noDocumentSafe:true,cacheUrls:stored.size,serviceWorkerMessages:messages.length}));
// CacheStorage is optional: privacy settings and a full disk must not block play.
let cacheFaultCases = 0;
for (const faultAt of ['open', 'match', 'put']) {
  for (const faultName of ['QuotaExceededError', 'SecurityError', 'AbortError']) {
    for (const group of ['app-shell', 'stage-2', 'ending']) {
      const network = [];
      const fault = () => { throw new DOMException('injected cache failure', faultName); };
      globalThis.caches = {
        open: async () => {
          if (faultAt === 'open') fault();
          return {
            match: async () => { if (faultAt === 'match') fault(); },
            put: async () => { if (faultAt === 'put') fault(); },
          };
        },
      };
      navigator.onLine = true;
      globalThis.fetch = async url => { network.push(url); return response; };
      const manager = new AssetManager();
      const progress = [];
      await manager.loadGroup(group, (done, total) => progress.push([done, total]));
      const urls = ASSET_GROUPS[group];
      assert(manager.hasGroup(group), `${group}/${faultAt}/${faultName}`);
      assert.deepEqual(network.sort(), [...urls].sort(), 'Every asset still loads from the network');
      assert.deepEqual(progress.at(-1), [urls.length, urls.length]);
      cacheFaultCases++;
    }
  }
}

// A failed shared request must release the loading slot so a new tap can retry.
// Non-OK HTTP responses remain failures; an old cache must not disguise them.
let recoveryCases = 0;
for (const failure of ['network', 404, 503]) {
  for (const group of ['stage-2', 'ending']) {
    const urls = ASSET_GROUPS[group];
    const codeUrl = urls.find(url => url.startsWith('/assets/') && url.endsWith('.js'));
    assert(codeUrl);
    const network = [];
    let failing = true;
    let cachedCodeReads = 0;
    globalThis.caches = { open: async () => ({
      match: async url => {
        if (url === codeUrl && failure !== 'network') { cachedCodeReads++; return response; }
      },
      put: async () => {},
    }) };
    globalThis.fetch = async url => {
      network.push(url);
      if (failing && url === codeUrl) {
        if (failure === 'network') throw new TypeError('injected offline failure');
        return { ok: false, status: failure };
      }
      return response;
    };
    const manager = new AssetManager();
    const attempts = await Promise.allSettled([manager.loadGroup(group), manager.loadGroup(group)]);
    assert(attempts.every(attempt => attempt.status === 'rejected'), 'Both callers see the failed load');
    assert.equal(attempts[0].reason, attempts[1].reason, 'Callers share one failed request');
    assert.equal(manager.hasGroup(group), false, 'Partial assets cannot mark a scene ready');
    assert.equal(network.filter(url => url === codeUrl).length, 1, 'Simultaneous taps share requests');
    assert.equal(cachedCodeReads, 0, 'HTTP errors must not be masked by cached code');
    failing = false;
    const retryProgress = [];
    await Promise.all([
      manager.loadGroup(group, (done, total) => retryProgress.push([done, total])),
      manager.loadGroup(group),
    ]);
    assert(manager.hasGroup(group), 'The next explicit attempt can recover');
    assert.equal(network.filter(url => url === codeUrl).length, 2);
    assert.deepEqual(retryProgress.at(-1), [urls.length, urls.length]);
    const fetched = network.length;
    await manager.loadGroup(group);
    assert.equal(network.length, fetched, 'A ready scene does not fetch again');
    recoveryCases++;
  }
}
console.log(JSON.stringify({ passed: true, cacheFaultCases, sharedFailureRecoveryCases: recoveryCases }));