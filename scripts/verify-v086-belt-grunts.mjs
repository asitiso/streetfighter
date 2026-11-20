// V086: beat 'em up belt layer — dedicated grunt roster (own art + moves, spread over the 5 stages),
// walk-in grab system (knees, front/back throws, thrown bodies bowl over the crowd, break-free, enemy grabs + mash escape),
// breakable drops (food, score, weapons) with swing/toss/durability/drop-on-hit, light-hit armor, and proximity guard.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
globalThis.window = new EventTarget(); globalThis.document = new EventTarget();
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [] } });
const DIMS = { '/art/grunts-v1/pickups.webp': [2240, 160] };
for (const k of ['punk', 'knife', 'bruiser', 'kicker', 'soldier', 'thrower']) DIMS[`/art/grunts-v1/${k}.webp`] = [2688, 448];
globalThis.Image = class { complete = false; naturalWidth = 0; naturalHeight = 0; set src(v) { this.url = v; const d = DIMS[v]; if (d) { this.complete = true; [this.naturalWidth, this.naturalHeight] = d; queueMicrotask(() => this.onload?.()); } } get src() { return this.url; } };
const { InputManager, DEFAULT_KEY_BINDINGS, keysForAction } = await import('../dist/assets/input/InputManager.js');
const { CombatWorld } = await import('../dist/assets/combat/CombatWorld.js');
const { getCharacter, CHARACTERS, BOSS_CHARACTERS } = await import('../dist/assets/game/characters.js');
const { GRUNTS, GRUNT_KINDS, gruntCharacter, isGruntId } = await import('../dist/assets/combat/GruntLibrary.js');
const { specialsFor, specialMovesFor, normalFor } = await import('../dist/assets/combat/MoveLibrary.js').then(m => ({ ...m, specialsFor: m.specialMovesFor }));
const Belt = await import('../dist/assets/combat/BeltSystems.js');
const { heldWeaponOf, propDropFor, PLAYER_ESCAPE_MASH } = Belt;
const { Stage1Scene } = await import('../dist/assets/scenes/Stage1Scene.js');
const Sprites = await import('../dist/assets/render/GruntSprites.js');
const { artImage } = await import('../dist/assets/render/ImageAssets.js');
const { ASSET_GROUPS } = await import('../dist/assets/core/AssetManager.js');

let checks = 0; const report = {};
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };
const code = (action) => DEFAULT_KEY_BINDINGS.find(([, a]) => a === action)[0];
const key = (type, action) => { const e = new Event(type, { cancelable: true }); Object.defineProperties(e, { code: { value: code(action) }, repeat: { value: false } }); window.dispatchEvent(e); };
for (const k of Object.keys(DIMS)) artImage(k.includes('pickups') ? 'pickups-v1' : `grunt-${k.split('/').pop().replace('.webp', '')}`);
await new Promise(r => setTimeout(r, 0));

function beltWorld(spawns, playerId = 'RYU') {
  const input = new InputManager();
  const c = getCharacter(playerId);
  const w = new CombatWorld(c, c, 'belt', c.superArts[0]);
  w.replaceEnemies(spawns);
  w.player.x = w.player.previousX = 600; w.player.y = w.player.previousY = 495;
  let tick = 1; const events = []; const held = new Set();
  const step = (each) => { each?.(); input.prepareTick(); w.update(input, tick++); for (const e of w.events) if (!events.includes(e)) events.push(e); input.endTick(); };
  const hold = (a) => { if (!held.has(a)) { held.add(a); key('keydown', a); } };
  const release = (a) => { if (held.has(a)) { held.delete(a); key('keyup', a); } };
  const releaseAll = () => { for (const a of [...held]) release(a); };
  const tap = (a, each) => { key('keydown', a); step(each); key('keyup', a); step(each); };
  return { w, P: w.player, input, step, hold, release, releaseAll, tap, events, run(n, each) { for (let i = 0; i < n; i += 1) step(each); }, close() { releaseAll(); input.destroy(); } };
}
const spawn = (kind, x, y = 495, hp) => ({ character: gruntCharacter(kind), archetype: GRUNTS[kind].archetype, x, y, hp: hp ?? GRUNTS[kind].hp });
const freeze = (w) => () => { for (const e of w.enemies) e.aiCooldown = 9999; };

// 1) Dedicated roster: 6 grunt types with their own ids, moves and atlases; never the playable roster.
{
  ok(GRUNT_KINDS.length >= 5 && GRUNT_KINDS.length <= 8, 'five to eight grunt types');
  const roster = new Set([...CHARACTERS, ...BOSS_CHARACTERS].map(c => c.id));
  const moveIds = new Set();
  for (const kind of GRUNT_KINDS) {
    const g = GRUNTS[kind];
    ok(isGruntId(g.id) && !roster.has(g.id), `${kind} is not a playable/boss id`);
    const sp = specialMovesFor(g.id);
    for (const m of [g.light, g.heavy, sp.primary, sp.mobility, sp.antiAir]) { ok(m.id.startsWith(g.id), `${kind} owns ${m.id}`); moveIds.add(m.id); }
    ok(normalFor('mp', false, g.id) === g.light && normalFor('hk', false, g.id) === g.heavy, `${kind} normals are its own`);
    ok(!/HADOKEN|SHORYU|TATSU/.test(sp.primary.label + sp.antiAir.label + sp.mobility.label), `${kind} has no borrowed specials`);
    const manifest = JSON.parse(readFileSync(new URL('../public/art/grunts-v1/manifest.json', import.meta.url)));
    ok(manifest.grunts[kind].poses.length === 7 && manifest.cell[0] === 384 && manifest.baseline === 423, `${kind} atlas manifest`);
  }
  // Art pipeline provenance: atlases are built from the art-source sheets by scripts/build-grunt-sprites-v1.py.
  const manifest = JSON.parse(readFileSync(new URL('../public/art/grunts-v1/manifest.json', import.meta.url)));
  const srcDir = new URL('../art-source/grunts-v1/', import.meta.url);
  const sheets = readdirSync(srcDir).filter(f => f.endsWith('.jpg')).sort();
  ok(sheets.length === 7 && sheets.every(f => manifest.sources[f] === createHash('sha256').update(readFileSync(new URL(f, srcDir))).digest('hex').slice(0, 16)), 'atlases match their source sheets');
  for (const f of ['punk', 'knife', 'bruiser', 'kicker', 'soldier', 'thrower', 'pickups']) ok(readFileSync(new URL(`../public/art/grunts-v1/${f}.webp`, import.meta.url)).length < 400000, `${f}.webp stays lean`);
  ok(specialMovesFor('GRUNT_THROWER').primary.projectile, 'thrower throws bottles');
  ok(GRUNTS.bruiser.grabsPlayer && GRUNTS.soldier.armor > 0 && GRUNTS.knife.carries === 'knife', 'type flags');
  for (const stage of [1, 2, 3, 4, 5]) ok(ASSET_GROUPS[`stage-${stage}`].includes('/art/grunts-v1/punk.webp') && ASSET_GROUPS[`stage-${stage}`].includes('/art/grunts-v1/pickups.webp'), `stage-${stage} preloads grunt art`);
  report.gruntKinds = GRUNT_KINDS.length; report.gruntMoves = moveIds.size;
}

// 2) Stage distribution: every belt wave is grunts only; each stage mixes 2+ types; all 6 appear.
{
  const quiet = { held: () => false, pressed: () => false }, audio = new Proxy({}, { get: () => () => {} }), c = getCharacter('RYU');
  const seen = new Set(); const perStage = {};
  for (const stage of [1, 2, 3, 4, 5]) {
    const s = new Stage1Scene(quiet, audio, c, c.superArts[0], stage);
    const kinds = new Set();
    for (const wave of [0, 1, 2]) {
      s.spawnBeltWave(wave);
      ok(s.world.enemies.length >= 2, `stage ${stage} wave ${wave} has enemies`);
      for (const e of s.world.enemies) { ok(isGruntId(e.character.id), `stage ${stage} wave ${wave}: ${e.character.id} is a grunt`); kinds.add(e.character.id); seen.add(e.character.id); }
    }
    ok(kinds.size >= 2, `stage ${stage} mixes grunt types`);
    perStage[stage] = [...kinds].map(id => id.replace('GRUNT_', '').toLowerCase());
  }
  ok(seen.size === GRUNT_KINDS.length, 'all grunt types appear across the campaign');
  report.stageRosters = perStage;
}

// 3) Grunt AI fights with its own move set (thrower bottles, knife slashes) and hurts the player.
{
  for (const kind of ['punk', 'thrower', 'knife', 'kicker']) {
    const t = beltWorld([spawn(kind, 760)]);
    const used = new Set(); const hp0 = t.P.hp; let bottles = 0;
    t.run(900, () => { const e = t.w.enemies[0]; if (e.currentMove) used.add(e.currentMove.id); bottles += t.w.projectiles.filter(p => p.move.id === 'GRUNT_THROWER_BOTTLE').length ? 1 : 0; });
    ok(used.size > 0 && [...used].every(id => id.startsWith(GRUNTS[kind].id) || id === 'BELT_KNEE'), `${kind} uses only its own moves (${[...used].join(',')})`);
    ok(t.P.hp < hp0, `${kind} damages the player`);
    if (kind === 'thrower') ok(bottles > 0, 'thrower tosses bottles');
    report[`ai_${kind}`] = [...used].length;
    t.close();
  }
}

// 4) Walk-in grab: holding toward an enemy grabs it; attack = knees (3rd knocks down).
{
  const t = beltWorld([spawn('punk', 662)]);
  const fz = freeze(t.w);
  t.hold('right'); t.run(8, fz);
  const belt = t.w.belt;
  ok(belt.hold?.byPlayer && belt.hold.victim === t.w.enemies[0], 'walking into an enemy grabs it');
  t.release('right'); t.step(fz);
  const victim = t.w.enemies[0]; const hp0 = victim.hp;
  ok(Sprites.gruntPoseFor(victim) === 'grabbed', 'victim shows the grabbed pose');
  t.tap('lp', fz); t.run(16, fz); t.tap('lp', fz); t.run(16, fz);
  ok(belt.stats.knees === 2 && victim.hp < hp0 && belt.hold, 'two knees damage and keep the hold');
  let downed = false;
  t.tap('lp', () => { fz(); downed ||= victim.state === 'knockdown'; }); t.run(40, () => { fz(); downed ||= victim.state === 'knockdown'; });
  ok(downed && belt.stats.knees === 3 && belt.hold === null , `third knee knocks down and releases (${belt.stats.knees} ${!!belt.hold} ${victim.state})`);
  report.kneeDamage = hp0 - victim.hp;
  t.close();
}

// 5) Front throw into the crowd: the thrown body damages and floors the enemy it hits.
{
  const t = beltWorld([spawn('punk', 662), spawn('thrower', 830)]);
  const fz = freeze(t.w);
  t.hold('right'); t.run(8, fz);
  const [victim, other] = t.w.enemies; const otherHp = other.hp;
  ok(t.w.belt.hold?.victim === victim, 'grabbed the front enemy');
  t.tap('lp', fz); t.release('right'); t.run(30, fz);
  ok(t.w.belt.stats.frontThrows === 1, 'forward+attack = front throw');
  ok(t.w.belt.stats.crowdHits >= 1 && other.hp < otherHp && (other.state === 'knockdown' || other.hp <= 0), 'thrown body bowls over the crowd');
  ok(t.events.some(e => e.type === 'enemy-collision'), 'enemy-collision event');
  report.crowdDamage = otherHp - other.hp;
  t.close();
}

// 6) Back throw lands the victim behind the player; idle hold ends in a break-free.
{
  const t = beltWorld([spawn('kicker', 662)]);
  const fz = freeze(t.w);
  t.hold('right'); t.run(8, fz); t.release('right'); t.step(fz);
  const victim = t.w.enemies[0];
  t.hold('left'); t.tap('hp', fz); t.release('left'); t.run(34, fz);
  ok(t.w.belt.stats.backThrows === 1 && victim.x < t.P.x - 40, 'back+attack = back drop behind the player');
  t.close();
  const u = beltWorld([spawn('punk', 662)]);
  const fz2 = freeze(u.w);
  u.hold('right'); u.run(8, fz2); u.release('right');
  u.run(120, fz2);
  ok(u.w.belt.stats.breakFrees === 1 && u.w.belt.hold === null && u.events.some(e => e.label === 'BREAK FREE'), 'held enemy breaks free over time');
  u.close();
}

// 7) Grappler grunt grabs the player: knees + throw unless the player mashes out.
{
  const t = beltWorld([spawn('bruiser', 662)]);
  const fz = freeze(t.w);
  let frames = 0; while (!t.w.belt.hold && frames++ < 400) t.step(fz);
  ok(t.w.belt.hold && !t.w.belt.hold.byPlayer, 'bruiser grabs the player');
  for (let i = 0; i < PLAYER_ESCAPE_MASH && t.w.belt.hold; i += 1) t.tap(i % 2 ? 'lp' : 'left', fz);
  ok(t.w.belt.stats.playerEscapes === 1 && !t.w.belt.hold, 'mashing escapes the grab');
  t.close();
  const u = beltWorld([spawn('bruiser', 662)]);
  const fz2 = freeze(u.w); const hp0 = u.P.hp;
  frames = 0; while (!u.w.belt.hold && frames++ < 400) u.step(fz2);
  u.run(110, fz2);
  ok(u.w.belt.stats.enemyKnees >= 1 && u.w.belt.stats.enemyThrows === 1 && u.P.hp < hp0, 'unescaped: knees then a throw');
  report.bruiserGrabDamage = hp0 - u.P.hp;
  u.close();
}

// 8) Breakables drop items; food heals instead of attacking; coins score.
{
  const quiet = { held: () => false, pressed: () => false }, audio = new Proxy({}, { get: () => () => {} }), c = getCharacter('RYU');
  const drops = {};
  for (const stage of [1, 2, 3, 4, 5]) {
    const s = new Stage1Scene(quiet, audio, c, c.superArts[0], stage);
    const kinds = s.world.props.map(propDropFor);
    ok(kinds.some(k => k === 'apple' || k === 'chicken'), `stage ${stage} breakables include food`);
    ok(kinds.some(k => k === 'pipe' || k === 'knife' || k === 'sword'), `stage ${stage} breakables include a weapon`);
    ok(kinds.includes('coins'), `stage ${stage} breakables include score items`);
    drops[stage] = kinds;
  }
  report.propDrops = drops;
  const t = beltWorld([spawn('punk', 1000)]);
  const fz = freeze(t.w);
  t.w.addProp({ id: 'crate-test-z', label: 'CRATE', x: 680, y: 495, width: 60, depth: 40, hp: 1, solid: true });
  t.run(4, fz); t.tap('mp', fz); t.run(40, fz);
  ok(t.w.props.at(-1).broken && t.w.belt.pickups.length === 1, 'broken prop drops an item');
  t.w.belt.pickups.length = 0;
  t.P.hp = 400; t.w.belt.spawnPickup('chicken', t.P.x + 10, t.P.y).z = 0;
  t.w.belt.pickups[0].vz = 0;
  t.tap('lp', fz);
  ok(t.P.hp > 400 && t.w.belt.pickups.length === 0 && t.w.belt.stats.foodEaten === 1, 'chicken heals');
  ok(!t.P.currentMove, 'picking up does not throw an attack');
  const s0 = t.w.belt.score; const coin = t.w.belt.spawnPickup('coins', t.P.x, t.P.y); coin.z = 0; coin.vz = 0;
  t.run(2, fz); t.tap('lp', fz);
  ok(t.w.belt.score >= s0 + 1000, 'coins add score');
  t.close();
}

// 9) Weapons: swing replaces punches, wears down and breaks; HK tosses; heavy hits knock it loose; KO drops carried weapons.
{
  const t = beltWorld([spawn('soldier', 700, 495, 5000)]);
  const fz = freeze(t.w);
  const pipe = t.w.belt.spawnPickup('pipe', t.P.x, t.P.y); pipe.z = 0; pipe.vz = 0;
  t.tap('lp', fz);
  ok(heldWeaponOf(t.P)?.kind === 'pipe', 'picked up the pipe');
  t.run(20, fz); t.tap('lp', fz);
  ok(t.P.currentMove?.id === 'WEAPON_PIPE_LIGHT' || t.w.belt.stats.weaponHits > 0, 'punch becomes a pipe swing');
  let swings = 0; while (heldWeaponOf(t.P) && swings++ < 40) { t.P.x = t.w.enemies[0].x - 80; t.tap(swings % 2 ? 'lp' : 'hp', fz); t.run(28, fz); }
  ok(!heldWeaponOf(t.P) && t.w.belt.stats.weaponBreaks === 1 && t.w.belt.stats.weaponHits === 8, 'pipe breaks after its durability');
  t.w.belt.giveWeapon(t.P, 'knife'); t.run(30, fz); t.tap('hk', fz); t.run(10, fz);
  ok(!heldWeaponOf(t.P) && t.w.belt.stats.weaponTosses === 1, 'HK tosses the weapon');
  t.close();
  const u = beltWorld([spawn('soldier', 700)]);
  u.w.belt.giveWeapon(u.P, 'sword');
  const smash = GRUNTS.soldier.heavy;
  u.P.receiveHit(smash, u.w.enemies[0], false); u.w.belt.onPlayerHit(u.w, smash);
  ok(!heldWeaponOf(u.P) && u.w.belt.pickups.some(p => p.kind === 'sword'), 'heavy hit knocks the weapon loose');
  u.close();
  const v = beltWorld([spawn('knife', 655, 495, 1)]);
  const pinKnife = freeze(v.w); const fz3 = () => { pinKnife(); const e = v.w.enemies[0]; if (e.hp > 0) { e.x = e.previousX = 655; } }; const score0 = v.w.belt.score;
  v.run(3, fz3); v.tap('mp', fz3); v.run(30, fz3);
  ok(v.w.enemies[0].hp <= 0 && v.w.belt.pickups.some(p => p.kind === 'knife') && v.w.belt.score >= score0 + GRUNTS.knife.score, 'knife thug KO drops a knife and scores');
  v.close();
}

// 10) Armor: an attacking riot soldier shrugs off a jab (no flinch, reduced damage).
{
  const t = beltWorld([spawn('soldier', 655, 495, 900)]);
  const s = t.w.enemies[0];
  s.facing = -1; s.startMove(GRUNTS.soldier.heavy);
  const hp0 = s.hp;
  t.tap('lp', () => { s.aiCooldown = 9999; });
  t.run(4, () => { s.aiCooldown = 9999; });
  ok(t.events.some(e => e.label === 'ARMOR') && s.state === 'attack' && s.hp < hp0, 'light hit vs armor: chip, no flinch');
  t.close();
}

// 11) Proximity guard: holding back while an attack is coming stands and guards instead of walking off.
{
  const input = new InputManager();
  const a = getCharacter('RYU'), b = getCharacter('KEN');
  const w = new CombatWorld(a, b, 'duel', a.superArts[0], b.superArts[0]);
  w.player.x = w.player.previousX = 500; w.enemy.x = w.enemy.previousX = 640; w.enemy.setAiLevel?.(0);
  let tick = 1; const step = () => { input.prepareTick(); w.update(input, tick++); input.endTick(); };
  key('keydown', 'left'); step(); step();
  const walked = w.player.x < 500;
  w.player.x = w.player.previousX = 500; w.enemy.x = w.enemy.previousX = 600; w.enemy.facing = -1;
  w.enemy.startMove(normalFor('hk', false, 'KEN'));
  const x0 = w.player.x; step();
  ok(walked && w.player.x === x0 && w.player.proximityGuarding, 'back near an attack holds position');
  let blocked = false; for (let i = 0; i < 20; i += 1) { step(); if (w.player.state === 'block') blocked = true; }
  ok(blocked, 'and blocks it');
  key('keyup', 'left'); input.destroy();
}

// 12) Rendering: grunt atlas frames per pose, pickups, held weapon and item projectiles; read-only.
{
  const calls = []; const ctx = new Proxy({ globalAlpha: 1 }, { get: (o, k) => k in o ? o[k] : (...args) => calls.push([k, args]), set: (o, k, v) => { o[k] = v; return true; } });
  const t = beltWorld([spawn('bruiser', 700)]);
  const e = t.w.enemies[0];
  const before = JSON.stringify({ x: e.x, y: e.y, state: e.state, hp: e.hp });
  for (const [state, pose] of [['idle', 'idle'], ['hit', 'hit'], ['knockdown', 'down']]) {
    e.state = state; calls.length = 0;
    ok(Sprites.drawGruntSprite(ctx, e, e.x, e.y), `draws ${state}`);
    const draw = calls.find(([k]) => k === 'drawImage');
    ok(draw && draw[1][1] === Sprites.GRUNT_POSES.indexOf(pose) * 384, `${state} uses the ${pose} cell`);
  }
  e.state = 'idle';
  ok(JSON.stringify({ x: e.x, y: e.y, state: e.state, hp: e.hp }) === before, 'drawing never mutates the fighter');
  const p = t.w.belt.spawnPickup('sword', 600, 495); p.z = 0;
  calls.length = 0; ok(Sprites.drawPickup(ctx, p, 1) && calls.some(([k, a]) => k === 'drawImage' && a[1] === 5 * 320), 'sword pickup sprite');
  t.w.belt.giveWeapon(t.P, 'pipe'); calls.length = 0;
  ok(Sprites.drawHeldWeapon(ctx, t.P, t.P.x, t.P.y) && calls.some(([k, a]) => k === 'drawImage' && a[1] === 3 * 320), 'held pipe sprite');
  calls.length = 0;
  ok(Sprites.drawItemProjectile(ctx, { move: { id: 'GRUNT_THROWER_BOTTLE' }, x: 1, y: 1, vx: 3 }, 1) && calls.some(([k, a]) => k === 'drawImage' && a[1] === 6 * 320), 'bottle projectile sprite');
  calls.length = 0;
  ok(Sprites.drawGruntPortrait(ctx, e.character, 0, 0, 34, '#fff'), 'grunt HUD portrait');
  t.close();
}

console.log(JSON.stringify({ passed: true, checks, ...report }));
