import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

// Execute production event handlers with browser-like, response-cloning caches.
export async function verifyServiceWorker(source, currentName) {
  const origin = 'https://streetfighter.test';
  const stores = new Map();
  const handlers = new Map();
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  let online = true;
  let requests = 0;
  let skips = 0;
  let claims = 0;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        match: async (request) => entries.get(key(request))?.clone(),
        put: async (request, response) => { entries.set(key(request), response.clone()); },
        delete: async (request) => entries.delete(key(request)),
        addAll: async (urls) => { for (const url of urls) entries.set(key(url), new Response(`installed:${url}`)); },
      };
    },
  };
  runInNewContext(source, {
    URL, Response, caches,
    fetch: async (request) => {
      requests += 1;
      if (!online) throw new TypeError('network cut');
      return new Response(`network:${key(request)}`);
    },
    self: {
      location: { origin },
      addEventListener: (type, handler) => handlers.set(type, handler),
      skipWaiting: async () => { skips += 1; },
      clients: { claim: async () => { claims += 1; } },
    },
  });
  async function dispatch(type, details = {}) {
    const pending = [];
    let response;
    let reply;
    handlers.get(type)({
      ...details,
      ports: [{ postMessage: (value) => { reply = value; } }],
      waitUntil: (promise) => pending.push(promise),
      respondWith: (promise) => { response = promise; },
    });
    await Promise.all(pending);
    return response ? await response : reply;
  }
  const message = (type) => dispatch('message', { data: { type } });
  const get = (path, mode = 'cors') => dispatch('fetch', { request: { url: new URL(path, origin).href, method: 'GET', mode } });
  const version = Number(currentName.match(/\d+$/)[0]);
  const previous = `game-cache-v${version - 1}`;
  const obsolete = `game-cache-v${version - 2}`;
  await (await caches.open(previous)).put('/assets/probe.js', new Response('previous-code'));
  await (await caches.open(previous)).put('/previous-only', new Response('previous-fallback'));
  await caches.open(obsolete);
  await (await caches.open('unrelated-cache')).put('/saved', new Response('preserved'));
  await (await caches.open('ssc-update-meta')).put('/__ssc_rollback_target__', new Response(obsolete));
  await dispatch('install');
  assert.equal(skips, 1, 'fresh-code worker activates automatically after shell install');
  await dispatch('activate');
  assert.equal(claims, 1);
  assert.equal(stores.has(obsolete), false, 'only current and most recent game caches survive');
  assert.equal(await (await (await caches.open('unrelated-cache')).match('/saved')).text(), 'preserved');
  let status = await message('GET_UPDATE_STATUS');
  assert.equal(status.current, currentName);
  assert.equal(status.previous, previous);
  assert.equal(status.rollbackActive, null, 'activation must clear a rollback target deleted during cleanup');

  const current = await caches.open(currentName);
  await current.put('/assets/probe.js', new Response('stale-code'));
  assert.equal(await (await get('/assets/probe.js')).text(), `${'network:'}${origin}/assets/probe.js`, 'online code must prefer network');
  online = false;
  assert.equal(await (await get('/assets/probe.js')).text(), `network:${origin}/assets/probe.js`, 'network success must refresh current cache');
  assert.equal(await (await get('/previous-only')).text(), 'previous-fallback');
  assert.equal(await (await get('/unknown-route', 'navigate')).text(), 'installed:/index.html');
  assert.equal((await get('/missing-asset')).type, 'error', 'missing assets must not receive HTML');

  online = true;
  status = await message('ROLLBACK_PREVIOUS');
  assert.equal(status.rollbackActive, previous);
  const beforeRollback = requests;
  assert.equal(await (await get('/assets/probe.js')).text(), 'previous-code');
  assert.equal(requests, beforeRollback, 'explicit rollback must use the previous cached version');
  status = await message('RESTORE_CURRENT');
  assert.equal(status.rollbackActive, null);
  assert.equal(await (await get('/assets/probe.js')).text(), `network:${origin}/assets/probe.js`);
  assert.equal(await dispatch('fetch', { request: { method: 'POST', url: `${origin}/save` } }), undefined, 'POST requests stay outside the cache handler');
  await caches.delete(previous);
  assert.equal((await message('ROLLBACK_PREVIOUS')).error, 'NO PREVIOUS CACHE');
  return { onlineFreshCode: true, offlineFallback: true, rollbackRestore: true, deletedTargetCleared: true };
}
