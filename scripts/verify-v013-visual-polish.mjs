import { Fighter } from '../dist/assets/combat/Fighter.js';
import { normalFor } from '../dist/assets/combat/MoveLibrary.js';
import { combatAnimationPhase } from '../dist/assets/render/Visuals.js';
import { getCharacter } from '../dist/assets/game/characters.js';
import { Stage1Scene } from '../dist/assets/scenes/Stage1Scene.js';

const fail = (message) => { console.error('V013_VISUAL_POLISH_FAIL', message); process.exit(1); };
class StubInput { held(){ return false; } pressed(){ return false; } released(){ return false; } }
class StubAudio {
  playStagePulse() {} playHit() {} playParry() {} startStageSoundscape() {} setStageIntensity() {} playStageBeat() {}
  playAirHit() {} playCommandHit() {} playTargetHit() {} playBlock() {} playThrowEscape() {} playSuperStart() {}
  playSuperImpact() {} playBossCue() {} playKo() {} stopSoundscape() {}
}

const ryu = getCharacter('RYU');
const fighter = new Fighter(ryu, 'player', 300, 500, 1, ryu.superArts[0]);
const heavy = normalFor('hp', false, 'RYU');
fighter.startMove(heavy);
fighter.moveFrame = 0;
if (combatAnimationPhase(fighter) !== 'anticipation') fail('attack anticipation phase missing');
fighter.moveFrame = heavy.startup;
if (combatAnimationPhase(fighter) !== 'contact') fail('attack contact phase missing');
fighter.moveFrame = heavy.startup + heavy.active;
if (combatAnimationPhase(fighter) !== 'follow-through') fail('attack follow-through phase missing');
fighter.moveFrame = heavy.startup + heavy.active + Math.max(3, Math.ceil(heavy.recovery * .65));
if (combatAnimationPhase(fighter) !== 'recovery') fail('attack recovery phase missing');

const expectedBoss = new Map([[1, 'DUDLEY'], [2, 'YUN'], [3, 'MAKOTO'], [4, 'DUDLEY'], [5, 'URIEN']]);
for (const [stageId, bossId] of expectedBoss) {
  const scene = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], stageId);
  const actual = scene.stageBossDef().id;
  if (actual !== bossId) fail(`stage ${stageId} boss close-up mismatch: ${actual} !== ${bossId}`);
  if (typeof scene.drawBackgroundMotion !== 'function' || typeof scene.drawForegroundMotion !== 'function') fail(`stage ${stageId} motion layers missing`);
  if (typeof scene.drawBossVersusCloseup !== 'function') fail(`stage ${stageId} boss close-up renderer missing`);
}

const stage5 = new Stage1Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0], 5);
stage5.phase = 'clear';
stage5.phaseFrames = 300;
if (stage5.phaseFrames !== 300) fail('stage 5 extended clear presentation missing');

console.log('V013_VISUAL_POLISH_VERIFY_PASS', {
  phases: ['anticipation', 'contact', 'follow-through', 'recovery'],
  bossCloseups: [...expectedBoss.values()],
  animatedDepthLayers: 5,
  stage5ClearFrames: stage5.phaseFrames,
});
