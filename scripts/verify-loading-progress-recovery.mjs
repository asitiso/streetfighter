import assert from 'node:assert/strict';
import { AssetManager, ASSET_GROUPS, CAMPAIGN_OFFLINE_URLS, assetGroupLoadUrls } from '../dist/assets/core/AssetManager.js';
import { GameApp } from '../dist/assets/core/GameApp.js';
import { getCharacter } from '../dist/assets/game/characters.js';
const flush = () => new Promise(setImmediate);
const ok = { ok: true, status: 200, clone() { return this; } };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
globalThis.window = { setTimeout() {} };
delete globalThis.caches;
function fixture() {
  const classes = new Set(['hidden']);
  const elements = new Map();
  let focused;
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
      if (!elements.has(selector)) elements.set(selector, { textContent: '', style: {}, onclick: null, focus() { focused = selector; } });
      return elements.get(selector);
    },
  };
  app.assets = new AssetManager();
  app.errors = { record() {} };
  app.recoveryHistory = { record() {} };
  return { app, classes, elements, pending, get focused() { return focused; } };
}
let cases = 0;
for (const group of ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'ending']) {
  for (const action of ['back', 'retry']) {
    const f = fixture();
    let imports = 0;
    const module = {};
    const route = f.app.loadStageModule(group, async () => { imports++; return module; });
    await flush();
    assert.equal(f.pending.length, assetGroupLoadUrls(group).length);
    const original = f.pending.splice(0);
    original[0].resolve({ ok: false, status: 503 });
    await flush();
    assert(f.classes.has('failed'), 'Initial asset failure must show recovery actions');
    assert.equal(f.focused, '[data-action="retry"]', 'A keyboard player can retry immediately');
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
let selectedArenaCases = 0;
const ken = getCharacter('KEN');
const ryu = getCharacter('RYU');
for (const mode of ['versus', 'training']) {
  for (const [index, arena] of ['newyork', 'hongkong', 'japan', 'london', 'society'].entries()) {
    const stageId = index + 1;
    const f = fixture();
    const input = { held: () => false, pressed: () => false, released: () => false };
    let enteredScene;
    f.app.input = input;
    f.app.audio = {};
    f.app.enterVersusInput = () => input;
    f.app.scenes = { setScene: async scene => { enteredScene = scene; } };
    const route = mode === 'versus'
      ? f.app.startVersus({ p1: ken, p1Art: ken.superArts[0], p2: ryu, p2Art: ryu.superArts[0], stageId })
      : f.app.startTraining({ player: ken, dummy: ryu, stageId });
    await flush();
    const background = f.pending.find(request => request.url === `/art/stage-backgrounds-v2/${arena}.webp`);
    assert.ok(background, mode + ' must load the selected arena ' + arena);
    assert.equal(f.pending.filter(request => request.url.includes('/stage-backgrounds-v2/')).length, 1);
    for (const request of f.pending) if (request !== background) request.resolve(ok);
    await flush();
    assert.equal(enteredScene, undefined, 'Route must keep loading until the selected background is available');
    background.resolve(ok);
    await route;
    assert.equal(enteredScene.stageId, stageId);
    selectedArenaCases++;
  }
}
{
  const f = fixture();
  const group = 'stage-2';
  const prefetch = f.app.assets.loadGroup(group);
  await flush();
  const requests = [...f.pending];
  const first = Math.floor(requests.length / 3);
  const second = first * 2;
  for (const request of requests.slice(0, first)) request.resolve(ok);
  await flush();

  const module = {};
  const route = f.app.loadStageModule(group, async () => module);
  await flush();
  const bar = f.elements.get('.loading-track i');
  assert.equal(bar.style.width, `${first / requests.length * 100}%`, 'Joining a prefetch displays progress already made');
  assert.equal(f.pending.length, requests.length, 'Joining must reuse the same requests');
  for (const request of requests.slice(first, second)) request.resolve(ok);
  await flush();
  assert.equal(bar.style.width, `${second / requests.length * 100}%`, 'The same prefetch keeps advancing the visible progress');
  for (const request of requests.slice(second)) request.resolve(ok);
  assert.equal(await route, module);
  await prefetch;
  assert.equal(bar.style.width, '100%');
}
let preparationCases = 0;
for (const outcome of ['loaded', 'failed']) {
  const f = fixture();
  const module = {};
  let resolveImport, rejectImport;
  const imported = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
  const route = f.app.loadStageModule('stage-4', () => imported);
  await flush();
  const title = f.elements.get('span').textContent;
  for (const request of f.pending) request.resolve(ok);
  await flush();
  assert.equal(f.elements.get('strong').textContent, 'PREPARING', 'Downloaded data alone cannot make the arena ready');
  assert.equal(f.elements.get('span').textContent, title);
  assert(!f.classes.has('hidden'));

  if (outcome === 'loaded') {
    resolveImport(module);
    assert.equal(await route, module);
    assert.equal(f.elements.get('strong').textContent, 'READY');
    assert.equal(f.elements.get('span').textContent, title, 'The final status keeps the current arena name');
  } else {
    rejectImport(new Error('Arena code unavailable'));
    await flush();
    assert(f.classes.has('failed'));
    assert.equal(f.elements.get('strong').textContent, 'LOAD FAILED');
    f.elements.get('[data-action="back"]').onclick();
    assert.equal(await route, null);
    assert(f.classes.has('hidden'));
  }
  preparationCases++;
}
let sceneEntryCases = 0;
for (const outcome of ['entered', 'failed', 'newer-load']) {
  const f = fixture();
  const timers = [];
  window.setTimeout = callback => { timers.push(callback); };
  let beginScene, finishScene, failScene;
  const started = new Promise(resolve => { beginScene = resolve; });
  const entry = new Promise((resolve, reject) => { finishScene = resolve; failScene = reject; });
  f.app.audio = {};
  f.app.scenes = { setScene: () => { beginScene(); return entry; } };
  const route = f.app.startTraining({ player: ken, dummy: ryu, stageId: 4 });
  await flush();
  for (const request of f.pending) request.resolve(ok);
  await started;
  for (const callback of timers) callback();
  assert(!f.classes.has('hidden'), 'Overlay must remain visible while the new scene is entering');

  if (outcome === 'failed') {
    failScene(new Error('Scene entry failed'));
    await assert.rejects(route, /Scene entry failed/);
  } else {
    if (outcome === 'newer-load') f.app.showLoading('ANOTHER ARENA', 0);
    finishScene();
    await route;
  }
  assert.equal(f.classes.has('hidden'), outcome !== 'newer-load', 'Scene entry owns only its own loading screen');
  sceneEntryCases++;
}
let warmRouteCases = 0;
for (const outcome of ['fast', 'slow', 'failed', 'newer-load']) {
  const f = fixture();
  const group = 'stage-2';
  const prepared = f.app.assets.loadGroup(group);
  await flush();
  for (const request of f.pending.splice(0)) request.resolve(ok);
  await prepared;

  const schedule = globalThis.setTimeout;
  const cancel = globalThis.clearTimeout;
  const timers = new Map();
  let timerId = 0;
  globalThis.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
  globalThis.clearTimeout = id => timers.delete(id);
  try {
    let resolveImport, rejectImport;
    const imported = new Promise((resolve, reject) => { resolveImport = resolve; rejectImport = reject; });
    const module = {};
    const route = f.app.loadStageModule(group, () => imported);
    assert(f.classes.has('hidden'), 'Already loaded assets must not flash a loading screen');
    assert.equal(f.pending.length, 0, 'Warm routes reuse their asset group');
    if (outcome === 'newer-load') f.app.showLoading('NEW ARENA', 0);
    if (outcome === 'slow' || outcome === 'newer-load') {
      for (const callback of timers.values()) callback();
      assert.equal(f.elements.get('strong').textContent, outcome === 'slow' ? 'PREPARING' : 'LOADING');
      assert(!f.classes.has('hidden'));
    }
    if (outcome === 'failed') {
      rejectImport(new Error('Warm module failed'));
      await flush();
      assert(f.classes.has('failed'));
      f.elements.get('[data-action="back"]').onclick();
      assert.equal(await route, null);
      assert(!f.app.assets.hasGroup(group));
    } else {
      resolveImport(module);
      assert.equal(await route, module);
      if (outcome === 'slow') assert.equal(f.elements.get('strong').textContent, 'READY');
      if (outcome === 'newer-load') assert.equal(f.elements.get('span').textContent, 'NEW ARENA');
    }
    assert.equal(timers.size, 0, 'Completed or failed warm routes must cancel their pending timer');
    if (outcome === 'fast' || outcome === 'failed') assert(f.classes.has('hidden'));
    warmRouteCases++;
  } finally {
    globalThis.setTimeout = schedule;
    globalThis.clearTimeout = cancel;
  }
}
{
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousFrame = globalThis.requestAnimationFrame;
  const frames = [];
  globalThis.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  globalThis.window = Object.assign(new EventTarget(), { location: { search: '' }, innerWidth: 1280, innerHeight: 720 });
  globalThis.document = new EventTarget();
  try {
    const order = [];
    const app = Object.create(GameApp.prototype);
    Object.assign(app, {
      errors: { install() {} },
      recovery: { begin() {}, reconcileCampaign() {} },
      canvas: new EventTarget(),
      loadingOverlay: new EventTarget(),
      touch: { element: {}, setSettings() {} },
      saves: { async init() {}, async load() { return { audioEnabled: false }; } },
      audio: { setEnabled() {} },
      assets: {
        loadGroup() { assert.fail('Optional app-shell group must not block the title'); },
        prefetchGroup(name) { order.push('prefetch:' + name); },
      },
      async showTitle() { order.push('title'); },
      resize() {},
      syncPlayback() { assert(app.loop); order.push('playback'); },
      onVisibilityChange() {},
      onPageHide() {},
      onPageShow() {},
      updates: { markBootHealthy() { order.push('healthy'); } },
    });
    await app.init({ append() {} });
    for (const type of ['keydown', 'keyup']) {
      for (const key of ['Enter', ' ', 'Tab']) {
        const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { key });
        app.loadingOverlay.dispatchEvent(event);
        assert.equal(event.cancelBubble, key !== 'Tab');
        assert.equal(event.defaultPrevented, false, 'Keep native button activation and focus navigation');
      }
    }
    assert.deepEqual(order, ['title', 'playback', 'healthy']);
    assert.equal(frames.length, 1);
    frames[0]();
    assert.deepEqual(order, ['title', 'playback', 'healthy', 'prefetch:app-shell']);
  } finally {
    globalThis.window = previousWindow;
    if (previousFrame === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = previousFrame;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}
console.log(JSON.stringify({ passed: true, cases, selectedArenaCases, preparationCases, sceneEntryCases, warmRouteCases, nonBlockingBoot: true, sharedPrefetchProgress: true, lateProgressPreservesFailure: true, retryAndBack: true, retiredAttemptIsolation: true }));


let independentScoreCases = 0;
for (const group of ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'ending']) {
  const f = fixture();
  const score = ASSET_GROUPS[group].filter(url => url.startsWith('/audio/score-v2/'));
  assert(score.length && score.every(url => CAMPAIGN_OFFLINE_URLS.includes(url)));
  const module = {};
  let imported = false;
  const route = f.app.loadStageModule(group, async () => { imported = true; return module; });
  await flush();
  for (const request of f.pending) {
    if (!score.includes(request.url)) request.resolve(ok);
  }
  await flush();
  assert(imported, group + ' must enter even if the music never responds');
  assert.equal(await route, module);
  assert(!f.pending.some(request => score.includes(request.url)), 'The scene audio manager owns the score request');
  assert.equal(f.elements.get('strong').textContent, 'READY');
  independentScoreCases++;
}
console.log('STAGE_ENTRY_WITHOUT_SCORE_PASS', { independentScoreCases });


const { ART_ASSET_PATHS, isArtAssetReady, preloadArtAssets, unloadArtAsset } = await import('../dist/assets/render/ImageAssets.js');
let backdropWarmCases = 0;
for (const failure of ['none', 'body', 'decode']) {
  const f = fixture();
  const requests = [];
  globalThis.Image = class {
    complete = false;
    naturalWidth = 0;
    set src(url) {
      if (!url) return;
      requests.push(url);
      if (failure === 'decode' && url.startsWith('blob:')) { this.onerror?.(); return; }
      this.complete = true;
      this.naturalWidth = 2160;
      this.onload?.();
    }
  };
  const key = 'stage-1', url = '/art/stage-backgrounds-v2/newyork.webp';
  unloadArtAsset(key);
  let entered = false;
  const route = f.app.loadStageModule(key, async () => { entered = true; return {}; });
  await flush();
  const backdrop = f.pending.find(request => request.url === url);
  assert(backdrop);
  backdrop.resolve({ ...ok, blob: () => failure === 'body' ? Promise.reject(new Error('Unable to read image body'))
    : Promise.resolve(new Blob(['fixture'], { type:'image/webp' })) });
  await flush();
  assert(isArtAssetReady(key), 'Decode the chosen backdrop while other stage files are still pending');
  assert.equal(entered, false, 'Required group files still own the scene entry gate');
  preloadArtAssets([key]);
  assert.equal(requests.length, failure === 'decode' ? 2 : 1, 'Scene entry reuses the prepared image');
  assert(failure === 'none' ? requests[0].startsWith('blob:') : requests.at(-1) === url,
    'Read or decode failures use the original URL');
  for (const request of f.pending) if (request !== backdrop) request.resolve(ok);
  await route;
  unloadArtAsset(key);
  delete globalThis.Image;
  backdropWarmCases++;
}
console.log('STAGE_BACKDROP_WARM_PASS', {backdropWarmCases});


let sceneArtWarmCases = 0;
for (const stage of [1, 2, 3, 4, 5, 'ending']) {
  const group = stage === 'ending' ? 'ending' : 'stage-' + stage;
  const key = stage === 'ending' ? 'ending-keyart' : 'foreground-' + stage;
  const url = ART_ASSET_PATHS[key];
  const sources = [];
  globalThis.Image = class {
    complete = true;
    naturalWidth = 1280;
    set src(value) {
      if (value) { sources.push(value); this.onload?.(); }
    }
  };
  const f = fixture();
  let entered = false;
  const route = f.app.loadStageModule(group, async () => { entered = true; return {}; });
  await flush();
  const art = f.pending.find(request => request.url === url);
  assert(art, group + ' owns its scene artwork');
  art.resolve({ ...ok, blob: async () => new Blob(['fixture'], { type:'image/webp' }) });
  await flush();
  assert(isArtAssetReady(key), key + ' should decode as soon as its response arrives');
  assert(!entered, 'Required stage files still control scene entry');
  preloadArtAssets([key]);
  assert.equal(sources.length, 1);
  assert(sources[0].startsWith('blob:'), 'The renderer should reuse response bytes');
  for (const request of f.pending) if (request !== art) request.resolve(ok);
  await route;
  assert(entered);
  unloadArtAsset(key);
  delete globalThis.Image;
  sceneArtWarmCases++;
}
console.log('SCENE_ART_WARM_PASS', { sceneArtWarmCases });

const { characterTextureManager } = await import('../dist/assets/render/CharacterTextureManager.js');
const wantsHd = characterTextureManager.wantsHd;
let stageOnePrefetchCases = 0;
try {
  for (const quality of ['full', 'lite']) {
    characterTextureManager.wantsHd = () => quality === 'full';
    for (const failed of [false, true]) {
      const calls = [];
      const app = {
        save: { selectedCharacter: 'KEN', selectedSuperArt: 2 },
        assets: { prefetchGroup: (group, tier) => calls.push([group, tier]) },
        scenes: {
          async setScene(scene) {
            assert.equal(scene.constructor.name, 'CharacterSelectScene');
            assert.equal(scene.index, 1);
            assert.deepEqual(calls, [], 'Do not prefetch until the selection opens');
            if (failed) throw new Error('Selection failed to open');
            calls.push('selection open');
          },
        },
      };
      const selection = GameApp.prototype.showCharacterSelect.call(app);
      if (failed) {
        await assert.rejects(selection, /Selection failed to open/);
        assert.deepEqual(calls, []);
      } else {
        await selection;
        assert.deepEqual(calls, ['selection open', ['stage-1', quality]]);
        app.scenes.setScene = async (scene) => assert.equal(scene.constructor.name, 'SuperArtSelectScene');
        await GameApp.prototype.showSuperArtSelect.call(app, getCharacter('KEN'));
        assert.deepEqual(calls, ['selection open', ['stage-1', quality]], 'The next selection reuses the existing request');
      }
      stageOnePrefetchCases++;
    }
  }
} finally {
  characterTextureManager.wantsHd = wantsHd;
}
console.log('FIRST_STAGE_SELECTION_PREFETCH_PASS', { stageOnePrefetchCases });
