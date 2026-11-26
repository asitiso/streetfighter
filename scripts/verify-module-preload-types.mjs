import assert from 'node:assert/strict';import{AssetManager,ASSET_GROUPS,CAMPAIGN_OFFLINE_URLS,assetGroupLoadUrls}from'../dist/assets/core/AssetManager.js';const links=[],requests=[],messages=[],stored=new Map();const response={ok:true,status:200,clone(){return this;}};globalThis.document={querySelector(selector){return links.find(l=>selector.includes('"'+l.dataset.gamePreload+'"'))??null;},createElement(){return{dataset:{}};},head:{appendChild(link){links.push(link);}}};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,serviceWorker:{controller:{postMessage:m=>messages.push(m)}}}});globalThis.caches={open:async()=>({match:async u=>stored.get(u),put:async(u,r)=>{stored.set(u,r);}})};globalThis.fetch=async(url,options)=>{requests.push({url,cache:options.cache});return response;};const a=new AssetManager();let progressChecks=0;for(const name of Object.keys(ASSET_GROUPS)){const urls=assetGroupLoadUrls(name);const progress=[];await a.loadGroup(name,(done,total)=>progress.push([done,total]));assert(a.hasGroup(name));assert.deepEqual(progress.at(-1),[urls.length,urls.length]);progressChecks++;}const invalid=links.filter(l=>!l.href.startsWith('/assets/')||!l.href.endsWith('.js'));assert.equal(invalid.length,0,'Media/JSON must never be parsed as JavaScript module preloads: '+invalid.slice(0,3).map(l=>l.href).join(','));const expectedModules=[...new Set(Object.values(ASSET_GROUPS).flat().filter(u=>u.startsWith('/assets/')&&u.endsWith('.js')))];assert.deepEqual(links.map(l=>l.href).sort(),expectedModules.sort());assert(links.length>0);assert(links.every(l=>l.rel==='modulepreload'));assert.equal(new Set(links.map(l=>l.href)).size,links.length);for(const url of new Set(Object.keys(ASSET_GROUPS).flatMap(assetGroupLoadUrls)))assert(stored.has(url),'All media and code still enter cache: '+url);assert(requests.some(r=>r.url.endsWith('.ogg')&&r.cache==='force-cache'));assert(requests.some(r=>r.url.endsWith('.png')&&r.cache==='force-cache'));assert(requests.filter(r=>r.url.startsWith('/assets/')&&r.url.endsWith('.js')).every(r=>r.cache==='reload'));const before=links.length;await a.prepareOfflineCampaign();assert.equal((await a.verifyOfflineCampaign()).ready,true);assert(CAMPAIGN_OFFLINE_URLS.every(u=>stored.has(u)));assert(links.every(l=>l.href.endsWith('.js')));assert.equal(new Set(links.map(l=>l.href)).size,links.length);navigator.onLine=false;const requestsBefore=requests.length;a.invalidateGroup('stage-2');await a.loadGroup('stage-2');assert.equal(requests.length,requestsBefore,'Offline cached stage should not fetch');assert.equal(links.length,before,'Cached/offline routes must reuse module hint');delete globalThis.document;a.modulePreload('/assets/scenes/Stage2Scene.js');console.log(JSON.stringify({passed:true,groups:progressChecks,moduleHints:links.length,mediaCached:true,offlineCampaignReady:true,offlineStageReady:true,noDuplicateHints:true,noDocumentSafe:true,cacheUrls:stored.size,serviceWorkerMessages:messages.length}));
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
      const urls = assetGroupLoadUrls(group);
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
    const urls = assetGroupLoadUrls(group);
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
let overlappingGroupCases = 0;
for (const failFirst of [false, true]) {
  const groups = ['stage-4', 'stage-5'];
  const urls = new Set(groups.flatMap(assetGroupLoadUrls));
  const shared = ASSET_GROUPS['stage-4'].find(url => ASSET_GROUPS['stage-5'].includes(url));
  const fetched = [];
  delete globalThis.caches;
  globalThis.fetch = url => new Promise(resolve => fetched.push({ url, resolve }));
  const manager = new AssetManager();
  const progress = groups.map(() => []);
  const loads = Promise.allSettled(groups.map((group, index) =>
    manager.loadGroup(group, (done, total) => progress[index].push([done, total]))));
  await new Promise(setImmediate);
  assert.equal(fetched.length, urls.size, 'Overlapping groups must fetch each shared URL once');
  for (const request of fetched.splice(0)) request.resolve(failFirst && request.url === shared ? { ok: false, status: 503 } : response);
  const expected = failFirst ? 'rejected' : 'fulfilled';
  assert((await loads).every(result => result.status === expected));
  if (failFirst) {
    const retry = Promise.all(groups.map(group => manager.loadGroup(group)));
    await new Promise(setImmediate);
    assert.equal(fetched.filter(request => request.url === shared).length, 1, 'A failed shared file can be requested again');
    for (const request of fetched) request.resolve(response);
    await retry;
  } else {
    groups.forEach((group, index) => assert.deepEqual(progress[index].at(-1), [assetGroupLoadUrls(group).length, assetGroupLoadUrls(group).length]));
  }
  assert(groups.every(group => manager.hasGroup(group)));
  overlappingGroupCases++;
}
let sharedCodeReuseCases = 0;
const firstStageCode = ASSET_GROUPS['stage-1'].filter(url => url.endsWith('.js'));
const secondStageCode = ASSET_GROUPS['stage-2'].filter(url => url.endsWith('.js'));
const sharedCode = secondStageCode.filter(url => firstStageCode.includes(url));
const newCode = secondStageCode.filter(url => !firstStageCode.includes(url));
assert(sharedCode.length && newCode.length);
for (const source of ['network', 'fallback']) {
  const assets = new Map(firstStageCode.map(url => [url, response]));
  globalThis.caches = { open: async () => ({
    match: async url => assets.get(url),
    put: async (url, value) => { assets.set(url, value); },
  }) };
  navigator.onLine = true;
  let initial = true;
  const network = [];
  globalThis.fetch = async (url, options) => {
    network.push({ url, cache: options.cache });
    if (initial && source === 'fallback' && firstStageCode.includes(url)) throw new TypeError('Offline fallback');
    return response;
  };
  const manager = new AssetManager();
  await manager.loadGroup('stage-1');
  initial = false;
  network.length = 0;
  const progress = [];
  await manager.loadGroup('stage-2', (...entry) => progress.push(entry));
  assert.deepEqual(network.filter(request => request.cache === 'reload').map(request => request.url).sort(),
    [...(source === 'network' ? newCode : secondStageCode)].sort(), source + ' affects only verified shared code');
  assert.deepEqual(progress.at(-1), [assetGroupLoadUrls('stage-2').length, assetGroupLoadUrls('stage-2').length]);
  assert(manager.hasGroup('stage-2'));
  network.length = 0;
  manager.invalidateGroup('stage-2');
  await manager.loadGroup('stage-2');
  assert.deepEqual(network.filter(request => request.cache === 'reload').map(request => request.url).sort(),
    [...secondStageCode].sort(), 'Explicit recovery rechecks every code file in the affected group');
  network.length = 0;
  await new AssetManager().loadGroup('stage-2');
  assert.deepEqual(network.filter(request => request.cache === 'reload').map(request => request.url).sort(),
    [...secondStageCode].sort(), 'Another application session checks its own modules');
  sharedCodeReuseCases++;
}
for (const kind of ['throw-attacker', 'throw-victim', 'air-fall', 'knockdown-motion', 'super-hit']) {
  for (const fighter of ['urien', 'gill']) {
    const url = `/art/${kind}-v1/${fighter}.webp`;
    for (const stage of ['stage-1', 'stage-2', 'stage-3', 'stage-4']) {
      assert(!assetGroupLoadUrls(stage).includes(url), `Final-stage reaction art should not delay ${stage}`);
    }
    assert(assetGroupLoadUrls('stage-5').includes(url), 'Final-stage reaction art must still load for the bosses');
    assert(CAMPAIGN_OFFLINE_URLS.includes(url), 'Final-stage reaction art remains in offline preparation');
  }
  for (const fighter of ['dudley', 'alex', 'ryu']) {
    assert(assetGroupLoadUrls('stage-1').includes(`/art/${kind}-v1/${fighter}.webp`), 'Keep reaction art for Stage 1 fighters');
  }
}

let liteStageCases = 0;
for (const stage of ['stage-1', 'stage-5']) {
  for (const missing of [false, true]) {
    const original = '/art/throw-escape-v1/ken.webp';
    const compact = '/art/animation-lite/ken/throw-escape.webp';
    const requests = [];
    const notices = [];
    navigator.serviceWorker.controller.postMessage = message => notices.push(message);
    delete globalThis.caches;
    globalThis.fetch = async url => {
      requests.push(url);
      return missing && url === compact ? { ok: false, status: 404 } : response;
    };
    const assets = new AssetManager();
    const progress = [];
    await assets.loadGroup(stage, (...entry) => progress.push(entry), 'lite');
    assert.equal(requests.filter(url => url === compact).length, 1, 'Lite stage requests the compact reaction strip');
    assert.equal(requests.filter(url => url === original).length, Number(missing), 'Original strip only follows a failed compact load');
    assert.equal(notices.at(-1).urls.includes(compact), !missing);
    assert.equal(notices.at(-1).urls.includes(original), missing, 'Service worker must not refetch originals on success');
    assert(assets.hasGroup(stage, 'lite'));
    assert(!assets.hasGroup(stage));
    assert.deepEqual(progress.at(-1), [assetGroupLoadUrls(stage).length, assetGroupLoadUrls(stage).length]);
    assert(CAMPAIGN_OFFLINE_URLS.includes(original) && CAMPAIGN_OFFLINE_URLS.includes(compact));
    requests.length = 0;
    await assets.loadGroup(stage);
    assert(requests.includes(original), 'High quality can still prepare independently');
    assert(!requests.includes(compact));
    assert(assets.hasGroup(stage) && assets.hasGroup(stage, 'lite'));
    liteStageCases++;
  }
}
console.log(JSON.stringify({ passed: true, cacheFaultCases, sharedFailureRecoveryCases: recoveryCases, overlappingGroupCases, sharedCodeReuseCases, requestsAvoidedPerStage: sharedCode.length, liteStageCases }));
