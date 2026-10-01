import { characterPreviewPose } from '../dist/assets/render/Visuals.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';
import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';

const fail = (message) => { console.error('V012_PRESENTATION_FAIL', message); process.exit(1); };
class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio {
  playStagePulse() {} playHit() {} playParry() {} startStageSoundscape() {} setStageIntensity() {} playStageBeat() {}
  playAirHit() {} playCommandHit() {} playTargetHit() {} playBlock() {} playThrowEscape() {} playSuperStart() {}
  playSuperImpact() {} playBossCue() {} playKo() {} stopSoundscape() {}
}

const poses = [0.1, 1.5, 2.9, 4.1, 5.3].map(characterPreviewPose);
for (const expected of ['idle', 'walk', 'signature', 'parry', 'victory']) {
  if (!poses.includes(expected)) fail(`character preview missing ${expected}: ${poses.join(',')}`);
}

const ryu = getCharacter('RYU');
const scene = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], 1);
scene.introFrames = 0;
scene.triggerCameraForEvent({ type: 'red-parry', x: 640, y: 390, power: 0, ttl: 24 });
if (scene.cameraFocusZoom < 1.13) fail('red parry zoom not strong enough');
if (scene.cameraSlowFrames < 15) fail('red parry presentation slow window missing');
if (scene.cameraLetterboxFrames < 20) fail('red parry letterbox missing');

scene.triggerCameraForEvent({ type: 'super-impact', x: 760, y: 360, power: 260, ttl: 34 });
if (scene.cameraKickFrames < 10 || scene.cameraKickPower < 6) fail('super impact camera kick missing');
const camera = scene.cameraPresentation(0);
if (camera.zoom < 1.1) fail(`camera focus zoom too low: ${camera.zoom}`);
if (Math.abs(camera.panX) < 5) fail('camera focus pan missing');

scene.prepareDuel();
if (scene.cameraFocusFrames < 50 || scene.cameraFocusZoom < 1.08) fail('duel entrance camera not primed');

const stage5 = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0]);
stage5.prepareFinalDuel();
if (stage5.cameraFocusFrames < 70 || stage5.cameraFocusZoom < 1.15) fail('final boss camera not primed');
if (stage5.cameraSlowFrames < 15 || stage5.cameraLetterboxFrames < 80) fail('final boss cinematic timing missing');

console.log('V012_PRESENTATION_VERIFY_PASS', {
  poses,
  redParryZoom: scene.cameraFocusZoom,
  impactKick: scene.cameraKickPower,
  finalBossZoom: stage5.cameraFocusZoom,
  finalBossLetterbox: stage5.cameraLetterboxFrames,
});
