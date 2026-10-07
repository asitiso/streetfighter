const CACHE_VERSION = 'game-cache-v087';
const GAME_CACHE_PREFIX = 'game-cache-v';
const UPDATE_META_CACHE = 'ssc-update-meta';
const ROLLBACK_MARKER = '/__ssc_rollback_target__';
const APP_SHELL = [
  '/', '/index.html', '/manifest.webmanifest', '/release-integrity.json', '/icons/icon-192.png', '/icons/icon-512.png', '/assets/styles.css', '/assets/main.js',
  '/assets/core/AssetManager.js', '/assets/core/SafeAreaProbe.js', '/assets/core/AudioManager.js', '/assets/core/AudioMixProfiles.js', '/assets/core/LoadingProfiles.js', '/assets/core/FixedStepLoop.js', '/assets/core/GameApp.js', '/assets/core/Scene.js', '/assets/core/SceneManager.js', '/assets/core/RuntimeQuality.js', '/assets/core/ReleaseProfiles.js', '/assets/core/RuntimeTelemetry.js', '/assets/core/ReleaseGate.js', '/assets/core/ReleaseReport.js', '/assets/core/AcceptanceMatrix.js', '/assets/core/UpdatePolicy.js', '/assets/core/PwaInstallManager.js', '/assets/core/PwaUpdateManager.js', '/assets/core/DeviceCertification.js', '/assets/core/TouchLatencyProbe.js', '/assets/core/RuntimeErrorJournal.js', '/assets/core/SessionRecovery.js', '/assets/core/RecoveryHistory.js', '/assets/core/ReleaseSummary.js', '/assets/core/FinalCandidateDecision.js', '/assets/core/DeviceCertificationHistory.js', '/assets/core/ReproPackage.js', '/assets/core/ReleaseApproval.js', '/assets/core/ReleaseEvidenceFingerprint.js', '/assets/core/ReleaseIntegrity.js', '/assets/core/FinalProofBundle.js',
  '/assets/input/InputManager.js', '/assets/save/SaveManager.js', '/assets/ui/TouchControls.js', '/assets/render/SpecialKeyPoseLibrary.js',
  '/assets/game/characters.js', '/assets/game/StageResult.js', '/assets/render/Visuals.js', '/assets/render/ImageAssets.js', '/assets/render/HqCharacterMasterRegistry.js', '/assets/render/CharacterTextureManager.js', '/assets/render/FinalVisualProfiles.js', '/assets/render/FinalPresentationProfiles.js', '/assets/render/CombatPresentationProfiles.js', '/assets/render/FinalPolishProfiles.js',
  '/assets/render/CombatSpriteProfiles.js', '/assets/render/AttackSpriteProfiles.js', '/assets/render/AnimationFrameProfiles.js', '/assets/render/MotionPolishProfiles.js', '/assets/render/LocomotionProfiles.js', '/assets/render/FighterReadabilityProfiles.js', '/assets/render/AnimationTransitionProfiles.js', '/assets/render/CinematicTimingProfiles.js', '/assets/render/SignatureMoveProfiles.js', '/assets/render/ContactVisualProfiles.js', '/assets/render/HeroContactProfiles.js', '/assets/render/VictimReactionProfiles.js', '/assets/render/AnimationPoseLibrary.js', '/assets/render/FighterVisualProfiles.js', '/assets/render/FighterKinematicsProfiles.js', '/assets/render/BossAnimationProfiles.js', '/assets/render/BossCinematicProfiles.js', '/assets/render/SuperCameraProfiles.js', '/assets/render/ThrowAnimationProfiles.js', '/assets/render/ThrowJointProfiles.js', '/assets/render/SuperVictimProfiles.js', '/assets/render/FinalSequenceProfiles.js',
  '/assets/combat/CombatTypes.js', '/assets/combat/CharacterCombatProfiles.js', '/assets/combat/TechniqueLibrary.js', '/assets/combat/EnemyArchetypes.js', '/assets/combat/EnemyDirector.js', '/assets/combat/InputBuffer.js', '/assets/combat/MoveLibrary.js', '/assets/combat/Fighter.js', '/assets/combat/CombatWorld.js',
  '/assets/scenes/TitleScene.js', '/assets/scenes/CharacterSelectScene.js', '/assets/scenes/SuperArtSelectScene.js', '/assets/scenes/Stage1Scene.js', '/assets/scenes/StageSelectScene.js', '/assets/scenes/ResultsScene.js', '/assets/scenes/OptionsScene.js', '/assets/scenes/ReleaseCheckScene.js', '/assets/scenes/SaveToolsScene.js', '/assets/scenes/InstallScene.js', '/assets/scenes/DeviceCertificationScene.js', '/assets/scenes/PwaUpdateScene.js', '/assets/scenes/DiagnosticsScene.js',
  '/art/title-keyart.png', '/art/roster-mural.png', '/audio/title-theme.ogg', '/audio/select-theme.ogg',
  '/art/portraits/ryu.webp', '/art/portraits/ken.webp', '/art/portraits/chunli.webp', '/art/portraits/alex.webp', '/art/portraits/dudley.webp', '/art/portraits/makoto.webp', '/art/portraits/ibuki.webp', '/art/portraits/yun.webp',
  '/art/combat-sprites/ryu.webp', '/art/combat-sprites/ken.webp', '/art/combat-sprites/chunli.webp', '/art/combat-sprites/alex.webp', '/art/combat-sprites/dudley.webp', '/art/combat-sprites/makoto.webp', '/art/combat-sprites/ibuki.webp', '/art/combat-sprites/yun.webp',
  '/art/attack-atlases/ryu.webp', '/art/attack-atlases/ken.webp', '/art/attack-atlases/chunli.webp', '/art/attack-atlases/alex.webp', '/art/attack-atlases/dudley.webp', '/art/attack-atlases/makoto.webp', '/art/attack-atlases/ibuki.webp', '/art/attack-atlases/yun.webp',
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
    if (target && !keys.includes(target)) await setRollbackTarget(null);
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
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => Promise.all(event.data.urls.map(async (url) => {
    try { const response = await fetch(url); if (response.ok) await cache.put(url, response); } catch { /* next online pass retries */ }
  }))));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return fetch(event.request);

    const rollback = await rollbackTarget();
    if (rollback) {
      const rollbackCache = await caches.open(rollback);
      const rollbackHit = await rollbackCache.match(event.request);
      if (rollbackHit) return rollbackHit;
    }

    const current = await caches.open(CACHE_VERSION);
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200 && response.type !== 'opaque') {
        await current.put(event.request, response.clone());
      }
      return response;
    } catch {
      const currentHit = await current.match(event.request);
      if (currentHit) return currentHit;
      const previous = await previousGameCache();
      if (previous && previous !== rollback) {
        const fallback = await (await caches.open(previous)).match(event.request);
        if (fallback) return fallback;
      }
      return event.request.mode === 'navigate' ? (await current.match('/index.html') || Response.error()) : Response.error();
    }
  })());
});
