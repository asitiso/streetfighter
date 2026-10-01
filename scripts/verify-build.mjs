import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const required = [
  'index.html', 'manifest.webmanifest', 'sw.js', 'icons/icon-192.png', 'icons/icon-512.png',
  'assets/styles.css', 'assets/main.js', 'assets/core/GameApp.js', 'assets/core/SafeAreaProbe.js', 'assets/core/FixedStepLoop.js', 'assets/core/RuntimeQuality.js', 'assets/core/ReleaseProfiles.js', 'assets/core/RuntimeTelemetry.js', 'assets/core/ReleaseGate.js', 'assets/core/PwaInstallManager.js', 'assets/core/AssetManager.js', 'assets/core/ReleaseEvidenceFingerprint.js', 'assets/core/FinalProofBundle.js',
  'assets/render/FinalVisualProfiles.js', 'assets/render/FinalPresentationProfiles.js', 'assets/render/CombatPresentationProfiles.js', 'assets/render/FinalPolishProfiles.js',
  'assets/input/InputManager.js', 'assets/save/SaveManager.js', 'assets/ui/TouchControls.js',
  'assets/game/characters.js', 'assets/game/StageResult.js', 'assets/game/EndingProfiles.js', 'assets/render/Visuals.js', 'assets/render/FinalVisualProfiles.js', 'assets/render/FinalPresentationProfiles.js', 'assets/render/CombatPresentationProfiles.js', 'assets/render/FinalPolishProfiles.js', 'assets/render/AnimationPoseLibrary.js', 'assets/render/FighterVisualProfiles.js', 'assets/render/FighterKinematicsProfiles.js', 'assets/render/BossAnimationProfiles.js', 'assets/render/BossCinematicProfiles.js', 'assets/render/SuperCameraProfiles.js', 'assets/render/ThrowAnimationProfiles.js', 'assets/render/ThrowJointProfiles.js', 'assets/render/SuperVictimProfiles.js', 'assets/render/FinalSequenceProfiles.js',
  'assets/combat/CombatTypes.js', 'assets/combat/CharacterCombatProfiles.js', 'assets/combat/TechniqueLibrary.js', 'assets/combat/EnemyArchetypes.js', 'assets/combat/EnemyDirector.js', 'assets/combat/InputBuffer.js', 'assets/combat/MoveLibrary.js', 'assets/combat/Fighter.js', 'assets/combat/CombatWorld.js',
  'assets/scenes/TitleScene.js', 'assets/scenes/CharacterSelectScene.js', 'assets/scenes/SuperArtSelectScene.js', 'assets/scenes/Stage1Scene.js', 'assets/scenes/Stage2Scene.js', 'assets/scenes/Stage3Scene.js', 'assets/scenes/Stage4Scene.js', 'assets/scenes/Stage5Scene.js', 'assets/scenes/EndingScene.js', 'assets/scenes/StageSelectScene.js', 'assets/scenes/ResultsScene.js', 'assets/scenes/OptionsScene.js', 'assets/scenes/ReleaseCheckScene.js', 'assets/scenes/InstallScene.js',
];
const initialShell = [
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'assets/styles.css', 'assets/main.js',
  'assets/core/GameApp.js', 'assets/core/SafeAreaProbe.js', 'assets/core/FixedStepLoop.js', 'assets/core/RuntimeQuality.js', 'assets/core/ReleaseProfiles.js', 'assets/core/RuntimeTelemetry.js', 'assets/core/ReleaseGate.js', 'assets/core/PwaInstallManager.js', 'assets/core/AssetManager.js', 'assets/core/ReleaseEvidenceFingerprint.js', 'assets/core/FinalProofBundle.js',
  'assets/render/FinalVisualProfiles.js', 'assets/render/FinalPresentationProfiles.js', 'assets/render/CombatPresentationProfiles.js', 'assets/render/FinalPolishProfiles.js',
  'assets/scenes/TitleScene.js', 'assets/scenes/CharacterSelectScene.js', 'assets/scenes/SuperArtSelectScene.js', 'assets/scenes/Stage1Scene.js', 'assets/scenes/ReleaseCheckScene.js', 'assets/scenes/InstallScene.js',
];
let failed = false;
for (const rel of required) {
  const path = join(root, rel);
  if (!existsSync(path)) { console.error('MISSING', rel); failed = true; }
}
const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone' || manifest.orientation !== 'landscape') { console.error('PWA manifest settings invalid'); failed = true; }
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
for (const rel of initialShell) {
  const url = `/${rel}`;
  if (!sw.includes(url)) { console.error('SW INITIAL SHELL MISS', url); failed = true; }
}
for (const deferred of ['Stage2Scene.js','Stage3Scene.js','Stage4Scene.js','Stage5Scene.js','EndingScene.js']) {
  const url = `/assets/scenes/${deferred}`;
  const appShellSlice = sw.slice(sw.indexOf('const APP_SHELL'), sw.indexOf('self.addEventListener(\'install\''));
  if (appShellSlice.includes(url)) { console.error('DEFERRED MODULE CACHED TOO EARLY', url); failed = true; }
}
if (failed) process.exit(1);
const sceneManagerSource = readFileSync(join(dist, 'assets/core/SceneManager.js'), 'utf8');
if (!sceneManagerSource.includes('transitionTail') || !sceneManagerSource.includes('this.current = null')) {
  throw new Error('BUILD VERIFY FAIL: scene transitions are not serialized');
}

console.log('BUILD_VERIFY_PASS', { requiredFiles: required.length, initialShell: initialShell.length, deferredStages: 5 });
