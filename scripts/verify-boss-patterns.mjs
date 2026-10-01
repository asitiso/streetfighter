import { Stage5Scene } from '../dist/assets/scenes/Stage5Scene.js';
import { getCharacter } from '../dist/assets/game/characters.js';

class StubInput { held() { return false; } pressed() { return false; } released() { return false; } }
class StubAudio { playStagePulse() {} playHit() {} playParry() {} }
const fail = (message) => { console.error('BOSS_PATTERN_FAIL', message); process.exit(1); };

const ryu = getCharacter('RYU');
const scene = new Stage5Scene(new StubInput(), new StubAudio(), ryu, ryu.superArts[0]);
scene.introFrames = 0;
scene.prepareDuel();
scene.phase = 'duel';
scene.bossPatternCooldown = 1;
scene.world.player.hp = 9999;
scene.fixedUpdate(1 / 60, 1);
const aegis = scene.world.projectiles.find((p) => p.owner.character.id === 'URIEN' && p.piercing);
if (!aegis || Math.abs(aegis.vx) >= 1) fail('Urien Aegis persistent wall did not spawn');
if (!scene.world.events.some((e) => e.type === 'boss-warning' && e.label?.includes('AEGIS'))) fail('Urien telegraph event missing');

scene.prepareFinalDuel();
scene.phase = 'final-duel';
scene.gillPhase = 2;
scene.bossPatternCooldown = 1;
scene.world.player.hp = 9999;
scene.fixedUpdate(1 / 60, 2);
const phase2Count = scene.world.projectiles.filter((p) => p.owner.character.id === 'GILL').length;
if (phase2Count < 2) fail(`Gill phase 2 volley expected >=2, got ${phase2Count}`);

scene.world.projectiles.length = 0;
scene.gillPhase = 3;
scene.bossPatternCooldown = 1;
scene.fixedUpdate(1 / 60, 3);
const phase3 = scene.world.projectiles.filter((p) => p.owner.character.id === 'GILL');
if (phase3.length < 3 || !phase3.every((p) => p.piercing)) fail('Gill phase 3 Seraphic volley missing');
if (!scene.world.events.some((e) => e.type === 'boss-warning' && e.label?.includes('SERAPHIC'))) fail('Gill final telegraph missing');

console.log('BOSS_PATTERN_VERIFY_PASS', {
  urienAegisLife: aegis.life,
  urienAegisSpeed: aegis.vx,
  gillPhase2Volley: phase2Count,
  gillPhase3Volley: phase3.length,
  piercing: phase3.every((p) => p.piercing),
});
