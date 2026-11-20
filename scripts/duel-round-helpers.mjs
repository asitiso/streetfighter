// Shared helpers for driving best-of-3 duel rounds in scene-level verification scripts.
export const ROUND_STEP_LIMIT = 600;

/** Step the scene until the current round break and the next round's announcer have finished. */
export function advanceThroughRoundBreak(scene, tick) {
  for (let t = 0; t < ROUND_STEP_LIMIT && (scene.roundBreakFrames > 0 || scene.roundAnnounceFrames > 0); t += 1) scene.fixedUpdate(1 / 60, tick++);
  return tick;
}

/** KO the duel opponent until the match is decided; returns the next free tick. */
export function winDuelMatch(scene, tick) {
  const startPhase = scene.phase;
  for (let round = 0; round < 3 && scene.phase === startPhase; round += 1) {
    scene.world.enemy.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (scene.phase !== startPhase) break;
    tick = advanceThroughRoundBreak(scene, tick);
  }
  return tick;
}

/** KO the player until the opponent takes the match; returns the next free tick. */
export function loseDuelMatch(scene, tick) {
  const startPhase = scene.phase;
  for (let round = 0; round < 3 && scene.phase === startPhase; round += 1) {
    scene.world.player.hp = 0;
    scene.fixedUpdate(1 / 60, tick++);
    if (scene.phase !== startPhase) break;
    tick = advanceThroughRoundBreak(scene, tick);
  }
  return tick;
}
