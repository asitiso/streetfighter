import assert from 'node:assert/strict';
import { AssetManager, ASSET_GROUPS } from '../dist/assets/core/AssetManager.js';
import { GameApp } from '../dist/assets/core/GameApp.js';
const flush = () => new Promise(setImmediate);
const ok = { ok: true, status: 200, clone() { return this; } };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
globalThis.window = { setTimeout() {} };
delete globalThis.caches;
function fixture() {
  const classes = new Set(['hidden']);
  const elements = new Map();
  const app = Object.create(GameApp.prototype);
  const pending = [];
  globalThis.fetch = url => new Promise(resolve => pending.push({ url, resolve }));
  app.loadingVersion = 0;
  app.loadingOverlay = {
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
    },
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, { textContent: '', style: {}, onclick: null });
      return elements.get(selector);
    },
  };
  app.assets = new AssetManager();
  app.errors = { record() {} };
  app.recoveryHistory = { record() {} };
  return { app, classes, elements, pending };
}
let cases = 0;
for (const group of ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'ending']) {
  for (const action of ['back', 'retry']) {
    const f = fixture();
    let imports = 0;
    const module = {};
    const route = f.app.loadStageModule(group, async () => { imports++; return module; });
    await flush();
    assert.equal(f.pending.length, ASSET_GROUPS[group].length);
    const original = f.pending.splice(0);
    original[0].resolve({ ok: false, status: 503 });
    await flush();
    assert(f.classes.has('failed'), 'Initial asset failure must show recovery actions');
    const failureText = f.elements.get('em').textContent;
    // Other requests from the same Promise.all can finish AFTER the error overlay.
    for (const request of original.slice(1)) request.resolve(ok);
    await flush();
    try {
      assert(f.classes.has('failed'), 'Late asset progress must not hide RETRY/BACK: ' + group);
      assert.equal(f.elements.get('strong').textContent, 'LOAD FAILED');
      assert.equal(f.elements.get('em').textContent, failureText);
      assert.equal(imports, 0);
    } finally {
      f.elements.get('[data-action="' + action + '"]').onclick();
      await flush();
      if (action === 'retry') for (const request of f.pending.splice(0)) request.resolve(ok);
    }
    assert.equal(await route, action === 'back' ? null : module);
    assert.equal(imports, action === 'back' ? 0 : 1);
    if (action === 'back') assert(f.classes.has('hidden'));
    else assert.equal(f.elements.get('strong').textContent, 'READY');
    cases++;
  }
}
// A retired attempt cannot repaint a newer retry, or reopen an overlay after BACK.
for (const group of ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'ending']) {
  for (const action of ['back', 'retry']) {
    const f = fixture();
    const module = {};
    const route = f.app.loadStageModule(group, async () => module);
    await flush();
    const original = f.pending.splice(0);
    original[0].resolve({ ok: false, status: 503 });
    await flush();
    f.elements.get('[data-action="' + action + '"]').onclick();
    await flush();
    const bar = f.elements.get('.loading-track i');
    const retryWidth = bar.style.width;
    if (action === 'back') assert.equal(await route, null);
    else assert.equal(retryWidth, '4%');
    for (const request of original.slice(1)) request.resolve(ok);
    await flush();
    try {
      if (action === 'back') assert(f.classes.has('hidden'), 'Old progress cannot reopen a cancelled load');
      else {
        assert.equal(bar.style.width, retryWidth, 'Old progress cannot advance the new attempt');
        assert.equal(f.elements.get('strong').textContent, 'LOADING');
      }
    } finally {
      for (const request of f.pending.splice(0)) request.resolve(ok);
      await route;
    }
    if (action === 'retry') assert.equal(await route, module);
    cases++;
  }
}
console.log(JSON.stringify({ passed: true, cases, lateProgressPreservesFailure: true, retryAndBack: true, retiredAttemptIsolation: true }));
