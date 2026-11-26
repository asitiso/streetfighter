const CACHE_VERSION = 'game-cache-v821';
const GAME_CACHE_PREFIX = 'game-cache-v';
const UPDATE_META_CACHE = 'ssc-update-meta';
const ROLLBACK_MARKER = '/__ssc_rollback_target__';
const APP_SHELL = [
  "/audio/sfx-v2/block-0.ogg", "/audio/sfx-v2/block-1.ogg", "/audio/sfx-v2/hit-heavy-0.ogg", "/audio/sfx-v2/hit-heavy-1.ogg", "/audio/sfx-v2/hit-heavy-2.ogg", "/audio/sfx-v2/hit-light-0.ogg", "/audio/sfx-v2/hit-light-1.ogg", "/audio/sfx-v2/hit-light-2.ogg", "/audio/sfx-v2/ko.ogg", "/audio/sfx-v2/parry-0.ogg", "/audio/sfx-v2/parry-1.ogg", "/audio/sfx-v2/super-impact.ogg", "/audio/sfx-v2/super-start.ogg", "/audio/sfx-v2/ui.ogg", "/audio/sfx-v2/victory.ogg", "/audio/sfx-v2/whoosh.ogg",
  '/', '/index.html', '/manifest.webmanifest', '/release-integrity.json', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/styles.css', '/assets/main.js',
  '/assets/core/AssetManager.js', '/assets/core/SafeAreaProbe.js', '/assets/core/AudioManager.js', '/assets/core/SampledSfxBank.js', '/assets/core/AudioMixProfiles.js', '/assets/core/LoadingProfiles.js', '/assets/core/FixedStepLoop.js', '/assets/core/GameApp.js', '/assets/core/Scene.js', '/assets/core/SceneManager.js', '/assets/core/RuntimeQuality.js', '/assets/core/ReleaseProfiles.js', '/assets/core/RuntimeTelemetry.js', '/assets/core/ReleaseGate.js', '/assets/core/ReleaseReport.js', '/assets/core/AcceptanceMatrix.js', '/assets/core/UpdatePolicy.js', '/assets/core/PwaInstallManager.js', '/assets/core/PwaUpdateManager.js', '/assets/core/DeviceCertification.js', '/assets/core/TouchLatencyProbe.js', '/assets/core/RuntimeErrorJournal.js', '/assets/core/SessionRecovery.js', '/assets/core/RecoveryHistory.js', '/assets/core/ReleaseSummary.js', '/assets/core/FinalCandidateDecision.js', '/assets/core/DeviceCertificationHistory.js', '/assets/core/ReproPackage.js', '/assets/core/ReleaseApproval.js', '/assets/core/ReleaseEvidenceFingerprint.js', '/assets/core/ReleaseIntegrity.js', '/assets/core/FinalProofBundle.js',
  '/assets/input/InputManager.js', '/assets/save/SaveManager.js', '/assets/ui/TouchControls.js', '/assets/render/SpecialKeyPoseLibrary.js',
  '/assets/game/characters.js', '/assets/game/StageResult.js', '/assets/render/Visuals.js', '/assets/render/ImageAssets.js', '/assets/render/CombatImpactAssets.js', '/assets/render/HqCharacterMasterRegistry.js', '/assets/render/CharacterTextureManager.js', '/assets/render/FinalVisualProfiles.js', '/assets/render/FinalPresentationProfiles.js', '/assets/render/CombatPresentationProfiles.js', '/assets/render/FinalPolishProfiles.js',
  '/assets/render/CombatSpriteProfiles.js', '/assets/render/AttackSpriteProfiles.js', '/assets/render/AnimationFrameProfiles.js', '/assets/render/MotionPolishProfiles.js', '/assets/render/LocomotionProfiles.js', '/assets/render/FighterReadabilityProfiles.js', '/assets/render/AnimationTransitionProfiles.js', '/assets/render/CinematicTimingProfiles.js', '/assets/render/SignatureMoveProfiles.js', '/assets/render/ContactVisualProfiles.js', '/assets/render/HeroContactProfiles.js', '/assets/render/VictimReactionProfiles.js', '/assets/render/AnimationPoseLibrary.js', '/assets/render/FighterVisualProfiles.js', '/assets/render/FighterKinematicsProfiles.js', '/assets/render/BossAnimationProfiles.js', '/assets/render/BossCinematicProfiles.js', '/assets/render/SuperCameraProfiles.js', '/assets/render/ThrowAnimationProfiles.js', '/assets/render/ThrowJointProfiles.js', '/assets/render/SuperVictimProfiles.js', '/assets/render/WallBounceProfiles.js',
  '/assets/render/GroundBounceProfiles.js',
  '/assets/render/AnimationTimingMapper.js',
  '/assets/render/AnimationSequenceLibrary.js',
  '/assets/render/AnimationTextureManager.js',
  '/assets/render/PoseBlendBuffer.js',
  '/assets/render/AirFallProfiles.js',
  '/assets/render/SuperHitProfiles.js',
  '/assets/render/ThrowAttackerProfiles.js',
  '/assets/render/ThrowVictimProfiles.js', '/assets/render/FinalSequenceProfiles.js',
  '/assets/combat/CombatTypes.js', '/assets/combat/CharacterCombatProfiles.js', '/assets/combat/TechniqueLibrary.js', '/assets/combat/EnemyArchetypes.js', '/assets/combat/GruntLibrary.js', '/assets/combat/BeltSystems.js', '/assets/render/GruntSprites.js', '/assets/combat/EnemyDirector.js', '/assets/combat/AiDifficulty.js', '/assets/training/TrainingSession.js', '/assets/scenes/TrainingSelectScene.js', '/assets/scenes/VersusSelectScene.js', '/assets/versus/VersusSession.js', '/assets/combat/InputBuffer.js', '/assets/combat/MoveLibrary.js', '/assets/combat/Fighter.js', '/assets/combat/CombatWorld.js',
  '/assets/scenes/TitleScene.js', '/assets/scenes/CharacterSelectScene.js', '/assets/scenes/SuperArtSelectScene.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/StageSelectScene.js', '/assets/scenes/ResultsScene.js', '/assets/scenes/OptionsScene.js', '/assets/scenes/ReleaseCheckScene.js', '/assets/scenes/SaveToolsScene.js', '/assets/scenes/InstallScene.js', '/assets/scenes/DeviceCertificationScene.js', '/assets/scenes/PwaUpdateScene.js', '/assets/scenes/DiagnosticsScene.js',
  '/art/title-keyart.webp', '/art/roster-mural.webp', '/audio/score-v2/title-theme.ogg', '/audio/score-v2/select-theme.ogg',
  '/art/portraits/ryu.webp', '/art/portraits/ken.webp', '/art/portraits/chunli.webp', '/art/portraits/alex.webp', '/art/portraits/dudley.webp', '/art/portraits/makoto.webp', '/art/portraits/ibuki.webp', '/art/portraits/yun.webp',
  '/art/combat-sprites/ryu-authored-v1.png', '/art/combat-sprites/ken-authored-v1.png', '/art/combat-sprites/chunli-authored-v1.png', '/art/combat-sprites/alex-authored-v1.png', '/art/combat-sprites/dudley-authored-v1.png', '/art/combat-sprites/makoto-authored-v1.png', '/art/combat-sprites/ibuki-authored-v1.png', '/art/combat-sprites/yun-authored-v1.png',
  '/art/attack-atlases/ryu-authored-v1.webp', '/art/attack-atlases/ken-authored-v1.webp', '/art/attack-atlases/chunli-authored-v1.webp', '/art/attack-atlases/alex-authored-v1.webp', '/art/attack-atlases/dudley-authored-v1.webp', '/art/attack-atlases/makoto-authored-v1.webp', '/art/attack-atlases/ibuki-authored-v1.webp', '/art/attack-atlases/yun-authored-v1.webp',
  '/art/special-keyposes/ken/hadoken.webp', '/art/special-keyposes/ken/shoryuken.webp', '/art/special-keyposes/ken/tatsumaki.webp', '/art/special-keyposes/ken/super-rush.webp',
  '/art/special-keyposes/chunli/kikoken.webp', '/art/special-keyposes/chunli/spinning-bird-kick.webp',
];

function cacheVersion(name) {
  const match = /^game-cache-v(\d+)$/.exec(name);
  return match ? Number(match[1]) : -1;
}

async function previousGameCache() {
  const keys = await caches.keys();
  return keys.filter((key) => key.startsWith(GAME_CACHE_PREFIX) && key !== CACHE_VERSION)
    .sort((a, b) => cacheVersion(b) - cacheVersion(a))[0] || null;
}

async function rollbackTarget() {
  const meta = await caches.open(UPDATE_META_CACHE);
  const response = await meta.match(ROLLBACK_MARKER);
  return response ? (await response.text()) || null : null;
}

async function setRollbackTarget(target) {
  const meta = await caches.open(UPDATE_META_CACHE);
  if (!target) { await meta.delete(ROLLBACK_MARKER); return; }
  await meta.put(ROLLBACK_MARKER, new Response(target, { headers: { 'content-type': 'text/plain' } }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previous = keys.filter((key) => key.startsWith(GAME_CACHE_PREFIX) && key !== CACHE_VERSION)
      .sort((a, b) => cacheVersion(b) - cacheVersion(a))[0] || null;
    await Promise.all(keys.filter((key) => key.startsWith(GAME_CACHE_PREFIX) && key !== CACHE_VERSION && key !== previous).map((key) => caches.delete(key)));
    const target = await rollbackTarget();
    if (target && !(await caches.keys()).includes(target)) await setRollbackTarget(null);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (type === 'GET_VERSION') { event.source?.postMessage?.({ type: 'CACHE_VERSION', version: CACHE_VERSION }); return; }
  if (type === 'GET_UPDATE_STATUS') {
    event.waitUntil(Promise.all([previousGameCache(), rollbackTarget()]).then(([previous, rollbackActive]) => event.ports?.[0]?.postMessage({ ok: true, current: CACHE_VERSION, previous, rollbackActive })));
    return;
  }
  if (type === 'ROLLBACK_PREVIOUS') {
    event.waitUntil((async () => {
      const previous = await previousGameCache();
      if (!previous) { event.ports?.[0]?.postMessage({ ok: false, error: 'NO PREVIOUS CACHE' }); return; }
      await setRollbackTarget(previous);
      event.ports?.[0]?.postMessage({ ok: true, current: CACHE_VERSION, previous, rollbackActive: previous });
    })());
    return;
  }
  if (type === 'RESTORE_CURRENT') {
    event.waitUntil(setRollbackTarget(null).then(() => event.ports?.[0]?.postMessage({ ok: true, current: CACHE_VERSION, rollbackActive: null })));
    return;
  }
  if (type !== 'CACHE_URLS' || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await openCacheIfAvailable(CACHE_VERSION);
    if (!cache) return;
    await Promise.all([...new Set(event.data.urls)].map(async (url) => {
      if (await matchCacheIfAvailable(cache, url)) return;
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch { /* next online pass retries */ }
    }));
  })());
});

async function openCacheIfAvailable(name) {
  try { return await caches.open(name); } catch { return null; }
}

async function matchCacheIfAvailable(cache, request) {
  if (!cache) return undefined;
  try { return await cache.match(request); } catch { return undefined; }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return fetch(event.request);

    const rollback = await rollbackTarget().catch(() => null);
    if (rollback) {
      const rollbackCache = await openCacheIfAvailable(rollback);
      const rollbackHit = await matchCacheIfAvailable(rollbackCache, event.request);
      if (rollbackHit) return rollbackHit;
    }

    const current = await openCacheIfAvailable(CACHE_VERSION);
    try {
      const response = await fetch(event.request);
      if (current && response && response.status === 200 && response.type !== 'opaque') {
        try { await current.put(event.request, response.clone()); }
        catch { /* Cache storage failure must not discard a successful network response. */ }
      }
      return response;
    } catch {
      const currentHit = await matchCacheIfAvailable(current, event.request);
      if (currentHit) return currentHit;
      const previous = await previousGameCache().catch(() => null);
      if (previous && previous !== rollback) {
        const fallback = await matchCacheIfAvailable(await openCacheIfAvailable(previous), event.request);
        if (fallback) return fallback;
      }
      return event.request.mode === 'navigate' ? (await matchCacheIfAvailable(current, '/index.html') || Response.error()) : Response.error();
    }
  })());
});
