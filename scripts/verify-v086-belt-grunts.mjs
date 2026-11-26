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
  const step = (each, inRewardWindow = false) => { each?.(); input.prepareTick(); w.update(input, tick++, inRewardWindow); for (const e of w.events) if (!events.includes(e)) events.push(e); input.endTick(); };
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
      const expected = wave === 0 ? 3 : wave === 2 ? 2 : stage < 3 ? 5 : 4;
      ok(s.world.enemies.length === expected, `stage ${stage} wave ${wave} retains its enemy count`);
      const { arenaLeft, arenaRight, arenaTop, arenaBottom } = s.world.rules;
      const entryX = wave === 0 ? 360 : s.areaStarts[wave] + 170;
      for (const e of s.world.enemies) {
        const label = `stage ${stage} wave ${wave} ${e.character.id}`;
        ok(isGruntId(e.character.id), label + ' is a grunt');
        ok(e.x >= entryX + 120 && e.x >= arenaLeft && e.x <= arenaRight, label + ' leaves room at entry');
        ok(e.y >= arenaTop + 8 && e.y <= arenaBottom - 8, label + ' spawns inside the lane');
        ok(!s.world.props.some(p => p.solid && Math.abs(e.x - p.x) < p.width / 2 + 28
          && Math.abs(e.y - p.y) < p.depth / 2 + 16), label + ' starts clear of solid props');
        kinds.add(e.character.id); seen.add(e.character.id);
      }
    }
    ok(kinds.size >= 2, `stage ${stage} mixes grunt types`);
    perStage[stage] = [...kinds].map(id => id.replace('GRUNT_', '').toLowerCase());
  }
  ok(seen.size === GRUNT_KINDS.length, 'all grunt types appear across the campaign');
  report.stageRosters = perStage;
}

// A clear bottle lane keeps one of the two pressure slots when the crowd is active.
{
  const t = beltWorld([spawn('knife', 760), spawn('kicker', 840, 565), spawn('bruiser', 875, 435), spawn('thrower', 1100)]);
  const [knife, kicker, bruiser, thrower] = t.w.enemies;
  thrower.aiCooldown = 1;
  t.step();
  const role = enemy => t.w.director.roleFor(enemy);
  ok(role(thrower) === 'ranged' && role(knife) === 'attack', 'aligned thrower supports a frontline enemy in a full wave');
  ok([kicker, bruiser].every(e => role(e) !== 'attack' && role(e) !== 'ranged'), 'still at most two simultaneous threats');
  t.run(15);
  ok(t.w.projectiles.some(p => p.owner === thrower), 'support role launches a bottle through the normal startup');
  t.close();
}
{
  const t = beltWorld([spawn('knife', 760), spawn('kicker', 840, 565), spawn('bruiser', 875, 435), spawn('thrower', 1100, 570)]);
  t.w.enemies[3].aiCooldown = 1;
  t.step();
  ok(t.w.director.activeAttackers(t.w.enemies) === 2, 'an off-lane thrower leaves both melee slots available');
  t.close();
}

// The market keeps two kinds of pressure without overlapping melee startups.
{
  const c = getCharacter('RYU');
  const s = new Stage1Scene({ held: () => false, pressed: () => false }, {}, c, c.superArts[0], 2);
  s.spawnBeltWave(1);
  const w = s.world;
  const thrower = w.enemies.find(e => e.character.id === 'GRUNT_THROWER');
  const knife = w.enemies.find(e => e.character.id === 'GRUNT_KNIFE');
  for (const [index, enemy] of w.enemies.entries()) {
    enemy.x = w.player.x + 90 + 25 * index;
    enemy.y = w.player.y;
    enemy.aiCooldown = 0;
  }
  thrower.x = w.player.x + 360;
  thrower.y = w.player.y + 80;
  const update = () => w.director.update(w.player, w.enemies, w.rules);
  update();
  ok(w.director.activeAttackers(w.enemies) === 1, 'market ambush allows only one melee attacker even without a bottle threat');
  thrower.y = w.player.y;
  const supported = update();
  ok(supported.get(thrower.uid).rangedAllowed && supported.get(knife.uid).attackAllowed, 'market ambush retains one melee fighter and a supporting thrower');
  knife.startMove(GRUNTS.knife.heavy);
  const committed = update();
  ok(![...committed.values()].some(d => d.attackAllowed) && committed.get(thrower.uid).rangedAllowed, 'an ongoing melee move excludes another melee startup while the bottle remains available');
  s.spawnBeltWave(2);
  ok(!w.rules.beltSingleMelee, 'market-only melee pacing resets at the next wave');
}

// The market and security ambushes telegraph their knife fighters' three-hit flurry.
{
  const c = getCharacter('RYU');
  const flurry = GRUNTS.knife.specials.primary;
  for (const [stage, wave] of [[1, 1], [2, 0], [2, 1], [5, 1]]) {
    const s = new Stage1Scene({}, {}, c, c.superArts[0], stage);
    s.spawnBeltWave(wave);
    const knives = s.world.enemies.filter(e => e.character.id === GRUNTS.knife.id);
    const telegraphed = stage === 5 || (stage === 2 && wave === 1);
    if (stage === 2 && wave === 1) ok(knives.length === 2, 'market keeps both knife fighters');
    for (const knife of knives) {
      knife.startMove(flurry);
      const move = knife.currentMove;
      const ctx = new Proxy({}, { get: () => () => {} });
      ok(move.startup === (telegraphed ? 13 : 7) && move.recovery === (telegraphed ? 28 : 18), 'authored flurry has a stage-specific opening');
      ok(move.active === flurry.active && move.damage === flurry.damage && move.multiHit.hits === 3, 'all three flurry hits are preserved');
      ok(knife.maxHp === Math.round(GRUNTS.knife.hp * (1 + (stage - 1) * .12)), 'knife HP keeps the standard wave scale');
      ok(Sprites.drawGruntAttackWarning(ctx, knife, 1) === telegraphed, 'the flurry shows its authored windup warning');
      knife.moveFrame = move.startup + move.active - 1;
      ok(!knife.eliteRecoveryOpen, 'the last active frame is not an opening');
      knife.moveFrame++;
      ok(Sprites.drawGruntRecoveryOpening(ctx, knife, 1) === telegraphed, 'OPEN appears after the final active frame');
      knife.startMove(GRUNTS.knife.light);
      ok(knife.currentMove.startup === GRUNTS.knife.light.startup && !knife.eliteRecoveryOpen, 'quick knife pokes keep their timing');
    }
  }
}

// Late elites expose authored strong attacks after the final active frame.
{
  const c = getCharacter('RYU');
  for (const [stage, kind, move, bonus] of [
    [4, 'soldier', GRUNTS.soldier.heavy, 12],
    [4, 'bruiser', GRUNTS.bruiser.specials.primary, 14],
    [5, 'bruiser', GRUNTS.bruiser.heavy, 12],
    [5, 'thrower', GRUNTS.thrower.specials.primary, 12],
  ]) {
    const authored = new Stage1Scene({}, {}, c, c.superArts[0], stage);
    authored.spawnBeltWave(2);
    const foe = authored.world.enemies.find(e => e.character.id === GRUNTS[kind].id);
    foe.startMove(move);
    ok(foe.currentMove.recovery === move.recovery + bonus, `stage ${stage} ${move.label} adds recovery`);
    ok(foe.currentMove.startup === move.startup && foe.currentMove.active === move.active
      && foe.currentMove.damage === move.damage, 'attack timing and damage up to the recovery are unchanged');
    ok(foe.maxHp === Math.round(GRUNTS[kind].hp * (1 + (stage - 1) * .12) * 1.65), 'elite HP stays unchanged');
    const painted = [];
    const ctx = new Proxy({}, { get: (_, key) => (...args) => painted.push([key, args]) });
    foe.moveFrame = move.startup + move.active - 1;
    ok(!foe.eliteRecoveryOpen && !Sprites.drawGruntRecoveryOpening(ctx, foe, 1), 'last active frame is still dangerous');
    foe.moveFrame++;
    ok(foe.eliteRecoveryOpen && Sprites.drawGruntRecoveryOpening(ctx, foe, 1), 'opening starts on the first recovery frame');
    ok(painted.some(([key, args]) => key === 'fillText' && args[0] === 'OPEN'), 'recovery has a distinct on-screen cue');
    foe.moveFrame += foe.currentMove.recovery;
    ok(!foe.eliteRecoveryOpen && !Sprites.drawGruntRecoveryOpening(ctx, foe, 1), 'cue never outlives the recovery');
    foe.startMove(GRUNTS[kind].light);
    ok(foe.currentMove.recovery === GRUNTS[kind].light.recovery && !foe.eliteRecoveryOpen, 'light attack recovery stays unchanged');
  }
  for (const [stage, elite, recover, shouldOpen] of [[3, true, true, false], [4, false, true, false], [4, true, false, false], [4, true, true, true]]) {
    const authored = new Stage1Scene({}, {}, c, c.superArts[0], stage);
    const t = beltWorld([authored.gruntSpawn('soldier', 658, 495, elite)]);
    const foe = t.w.enemies[0], heavy = GRUNTS.soldier.heavy;
    foe.startMove(heavy);
    foe.moveFrame = recover ? heavy.startup + heavy.active : 0;
    const before = foe.hp;
    t.tap('lp');
    t.run(8);
    const fullDamage = normalFor('lp', false, c.id).damage;
    ok(shouldOpen ? foe.hp === before - fullDamage && foe.state === 'hit'
      : t.events.some(e => e.label === 'ARMOR') && foe.state === 'attack', 'only a late elite strong recovery loses light armor');
    t.close();
  }
}

// An enemy on the same lane as a solid prop must be able to walk around it.
{
  const t = beltWorld([spawn('punk', 400)]);
  t.w.addProp({ id: 'crate-route', label: 'CRATE', x: 500, y: 495, width: 70, depth: 60, hp: 9999, solid: true });
  t.run(210);
  const enemy = t.w.enemies[0];
  ok(enemy.x > 500, `enemy must route around the solid crate (x=${enemy.x}, y=${enemy.y})`);
  ok(t.P.hp < t.P.maxHp, 'enemy can resume attacking after the detour');
  t.close();
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

// A supporting bottle thrower attacks from a valid distant lane instead of walking first.
for (const [distance, depthOffset, shouldThrow] of [[470, 0, true], [470, 90, false], [840, 0, false]]) {
  const t = beltWorld([spawn('punk', 680), spawn('thrower', 600 + distance, 495 + depthOffset)]);
  const [front, thrower] = t.w.enemies;
  const x = thrower.x;
  const holdFront = () => { front.aiCooldown = 9999; };
  thrower.aiCooldown = 0;
  t.step(holdFront);
  ok(t.w.director.roleFor(thrower) === 'ranged', 'director grants the bottle thrower its support role');
  if (shouldThrow) {
    ok(thrower.currentMove?.id === 'GRUNT_THROWER_BOTTLE' && thrower.x === x, 'aligned thrower starts the windup before walking');
    t.run(GRUNTS.thrower.specials.primary.startup, holdFront);
    ok(t.w.projectiles.some(shot => shot.owner === thrower), 'windup releases a real bottle into the lane');
  } else {
    ok(!thrower.currentMove && thrower.x < x, 'out-of-range or misaligned thrower repositions before tossing');
  }
  t.close();
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

// A new grappler hold uses the same melee opening as other belt attacks.
{
  const t = beltWorld([spawn('bruiser', 662), spawn('punk', 930)]);
  const [bruiser, committed] = t.w.enemies;
  committed.startMove(GRUNTS.punk.heavy);
  const keepPositions = () => {
    bruiser.x = 662;
    bruiser.y = 495;
    for (const enemy of t.w.enemies) enemy.aiCooldown = 9999;
  };
  t.run(240, () => {
    keepPositions();
    committed.moveFrame = GRUNTS.punk.heavy.startup - 2;
  });
  ok(!t.w.belt.hold && t.w.belt.stats.enemyGrabs === 0, 'bruiser cannot start a hold through a committed melee slot');
  committed.moveFrame = GRUNTS.punk.heavy.startup + GRUNTS.punk.heavy.active;
  for (let frame = 0; frame < 120 && !t.w.belt.hold; frame += 1) t.step(keepPositions);
  ok(t.w.belt.hold?.holder === bruiser && t.w.belt.stats.enemyGrabs === 1, 'bruiser can use the next free melee opening');
  committed.interruptMove();
  committed.state = 'idle';
  t.step(() => {
    keepPositions();
    bruiser.hitStop = 1;
    committed.x = t.P.x - 68;
    committed.y = t.P.y;
    committed.aiCooldown = 0;
  });
  ok(t.w.belt.hold?.holder === bruiser && !committed.currentMove, 'nearby grunt may not start a new attack on a held player');
  const hp = t.P.hp;
  committed.interruptMove();
  committed.startMove(GRUNTS.punk.light);
  committed.moveFrame = GRUNTS.punk.light.startup - 1;
  committed.x = t.P.x - 68;
  committed.y = t.P.y;
  t.step(keepPositions);
  ok(t.P.hp < hp, 'separate enemy hits the grabbed player');
  ok(!t.w.belt.hold && !Belt.isHeldByGrab(t.P), 'outside hit releases the hold immediately');
  ok(t.P.state === 'hit' && t.P.stateFrame < 0 && t.P.hitStop > 0, 'outside hit retains its reaction');
  t.close();
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
  t.step(fz);
  ok(t.w.belt.score === s0 + 1000 && t.w.belt.pickups.length === 0, 'grounded coin collects without an input');
  t.step(fz);
  ok(t.w.belt.score === s0 + 1000, 'collected coin scores only once');
  t.close();
}

// An incidental pickup must not consume an attack or use food at full health.
{
  const t = beltWorld([spawn('punk', 1000)]);
  const fz = freeze(t.w);
  const food = t.w.belt.spawnPickup('chicken', t.P.x, t.P.y);
  const coin = t.w.belt.spawnPickup('coins', t.P.x + 10, t.P.y);
  food.z = food.vz = coin.z = coin.vz = 0;
  t.P.hitStop = 1;
  t.step(fz);
  ok(t.w.belt.pickups.includes(coin), 'hitstop does not collect coins');
  t.tap('lp', fz);
  ok(t.P.currentMove?.id === '5LP', 'attack still starts over coins and full-health food');
  ok(t.w.belt.score === 1000 && !t.w.belt.pickups.includes(coin), 'coin collects alongside the attack');
  ok(t.w.belt.pickups.includes(food) && t.w.belt.stats.foodEaten === 0, 'full-health food is preserved');
  t.close();
}

// Two items in range can share a horizontal position but occupy different lanes.
for (const startWithWeapon of [false, true]) {
  const t = beltWorld([spawn('punk', 1000)]);
  t.P.hp = 500;
  const { belt } = t.w;
  const spawnFood = () => belt.spawnPickup('apple', t.P.x + 8, t.P.y + 4);
  const spawnWeapon = () => belt.spawnPickup('pipe', t.P.x + 1, t.P.y + 26, 3);
  const [food, weapon] = startWithWeapon ? [spawnWeapon(), spawnFood()].reverse() : [spawnFood(), spawnWeapon()];
  food.z = food.vz = weapon.z = weapon.vz = 0;
  ok(belt.nearbyManualPickup(t.P) === food, 'Nearest usable item accounts for depth as well as horizontal distance');
  t.tap('lp', freeze(t.w));
  ok(t.P.hp === 660 && belt.score === 100 && belt.pickups.includes(weapon) && !heldWeaponOf(t.P),
    'The indicated food is collected without swapping the weapon');
  t.tap('lp', freeze(t.w));
  ok(heldWeaponOf(t.P)?.durability === 3 && belt.pickups.length === 0, 'The remaining weapon stays available on the next press');
  t.close();
}

// Actual touch attack ordering must respect the consumed pickup press.
for (const [kind, button] of [['chicken', 'lp'], ['pipe', 'hk']]) {
  const t = beltWorld([spawn('punk', 1000)]);
  t.P.hp = 400;
  const item = t.w.belt.spawnPickup(kind, t.P.x, t.P.y);
  item.z = item.vz = 0;
  t.input.setTouch(button, true);
  t.input.setTouch(button, false);
  t.step(freeze(t.w));
  ok(!t.w.belt.pickups.includes(item), `touch ${button} collects ${kind}`);
  ok(!t.P.currentMove, `touch pickup must not start ${t.P.currentMove?.id}`);
  ok(!t.P.buffer.latest().pressed.has(button), 'the consumed press is absent from combat history');
  if (kind === 'pipe') ok(heldWeaponOf(t.P)?.kind === 'pipe', 'freshly picked up weapon must stay equipped');
  t.close();
}

for (const [buttons, move] of [[['jump', 'lp'], /_AIR_LP$/], [['lp', 'lk'], /THROW/]]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const item = t.w.belt.spawnPickup('pipe', t.P.x, t.P.y);
  item.z = item.vz = 0;
  for (const button of buttons) t.input.setTouch(button, true);
  for (const button of buttons) t.input.setTouch(button, false);
  t.step(freeze(t.w));
  assert.match(t.P.currentMove?.id ?? '', move, 'A deliberate combat chord takes priority over a pickup');
  ok(t.w.belt.pickups.includes(item), 'The higher priority action leaves the item available');
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
  u.P.receiveHit(smash, u.w.enemies[0], false); u.w.belt.onPlayerHit(u.w, smash, u.w.enemies[0]);
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

// A belt guard must not pin retreat for an unblockable or an attack in another lane.
for (const side of [-1, 1]) for (const [test, laneOffset] of [['guardable', 0], ['off-lane', 60], ['body-press', 0], ['shield-charge', 0]]) {
  const kind = test === 'shield-charge' ? 'soldier' : 'bruiser';
  const t = beltWorld([spawn(kind, 600 + side * 90, 495 + laneOffset)]);
  const enemy = t.w.enemy;
  const move = test === 'body-press' ? GRUNTS.bruiser.specials.primary
    : test === 'shield-charge' ? GRUNTS.soldier.specials.mobility : GRUNTS.bruiser.heavy;
  enemy.facing = side === 1 ? -1 : 1;
  enemy.startMove(move);
  t.hold(side === 1 ? 'left' : 'right');
  const x = t.P.x;
  t.step(freeze(t.w));
  if (test === 'guardable') ok(t.P.x === x && t.P.proximityGuarding, 'Same-lane guardable melee holds position');
  else ok((t.P.x - x) * side < 0 && !t.P.proximityGuarding, test + ' must allow walking out');
  t.close();
}

// A closer enemy on the opposite side must not choose the guard direction for a rear attack.
for (const side of [-1, 1]) for (const [correct, fresh] of [[true, true], [true, false], [false, false]]) {
  const t = beltWorld([spawn('punk', 600 + side * 62), spawn('bruiser', 600 - side * 74)]);
  const attacker = t.w.enemies[1];
  const move = GRUNTS.bruiser.light;
  attacker.startMove(move);
  attacker.moveFrame = move.startup - 1;
  const x = t.P.x;
  t.hold(side * (correct ? 1 : -1) > 0 ? 'right' : 'left');
  if (!fresh) { t.input.prepareTick(); t.input.endTick(); }
  t.step(freeze(t.w));
  ok(t.P.facing === side && t.P.state === (correct ? 'block' : 'hit'), 'Rear melee uses the direction away from the attacker');
  if (correct) ok(t.P.previousX === x && t.P.walkDirection === 0, 'Rear melee guard does not walk before contact');
  else ok(!t.P.proximityGuarding && t.P.walkDirection === -side, 'Walking toward the rear attacker must not engage guard');
  t.close();
}

// Holding a rear guard is stationary even when the input points toward a closer enemy.
{
  const t = beltWorld([spawn('punk', 538), spawn('bruiser', 674)]);
  const attacker = t.w.enemies[1];
  attacker.startMove(GRUNTS.bruiser.light);
  t.hold('left');
  t.run(GRUNTS.bruiser.light.startup, freeze(t.w));
  ok(!t.w.belt.hold && t.P.state === 'block', 'A rear guard must reach contact without grabbing the closer opposite enemy');
  t.close();
}

// Reapplying guard inside the double-tap window keeps the brace through contact.
for (const side of [-1, 1]) for (const threatened of [true, false]) {
  const t = beltWorld([spawn('punk', 600 + side * 62), spawn('bruiser', 600 - side * 74)]);
  const away = side === 1 ? 'right' : 'left';
  const attacker = t.w.enemies[1];
  const move = GRUNTS.bruiser.light;
  if (threatened) attacker.startMove(move);
  t.hold(away); t.step(freeze(t.w));
  t.release(away); t.step(freeze(t.w));
  if (threatened) attacker.moveFrame = move.startup - 1;
  t.hold(away); t.step(freeze(t.w));
  if (threatened) {
    ok(t.P.state === 'block' && t.P.dashFrames === 0 && t.P.walkDirection === 0, 'A double tap away from a current threat stays on guard');
  } else {
    ok(t.P.dashFrames > 0 && t.P.walkDirection === side, 'The same double tap still dashes without a threat');
  }
  t.close();
}

// Reversing into a valid guard brakes an approach dash before contact.
for (const side of [-1, 1]) for (const threatened of [true, false]) {
  const t = beltWorld([spawn('bruiser', 600 + side * 120)]);
  const toward = side === 1 ? 'right' : 'left';
  const away = side === 1 ? 'left' : 'right';
  const pin = () => { t.w.enemy.x = t.w.enemy.previousX = 600 + side * 120; freeze(t.w)(); };
  t.tap(toward, pin);
  t.hold(toward); t.step(pin); t.release(toward);
  ok(t.P.dashFrames === 8, 'Approach dash starts before the threat');
  if (threatened) t.w.enemy.startMove(GRUNTS.bruiser.light);
  const x = t.P.x;
  t.hold(away); t.step(pin);
  if (threatened) {
    ok(t.P.x === x && t.P.dashFrames === 0 && t.P.state === 'idle' && t.P.proximityGuarding, 'Emergency guard brakes an approach dash immediately');
  } else {
    ok((t.P.x - x) * side > 0 && t.P.dashFrames === 7, 'The ordinary dash keeps its existing travel');
  }
  t.close();
}

// Nearby enemies may change during startup, but a committed kick keeps its direction.
for (const side of [-1, 1]) {
  const t = beltWorld([spawn('punk', 600 + side * 85), spawn('knife', 600 - side * 62, 555)]);
  const [front, rear] = t.w.enemies;
  t.w.defenseOverride = () => false;
  let rearLane = 555;
  const pin = () => {
    freeze(t.w)();
    front.x = front.previousX = 600 + side * 85;
    rear.x = rear.previousX = 600 - side * 62;
    rear.y = rear.previousY = rearLane;
  };
  t.hold('hk'); t.step(pin); t.release('hk');
  const move = t.P.currentMove;
  ok(move?.id === '5HK' && t.P.facing === side, 'Kick starts toward the initial target');
  rearLane = 507;
  pin();
  ok(t.w.closestEnemyToPlayer() === rear, 'The opposite enemy is now the closest');
  t.step(pin);
  ok(t.P.facing === side, 'Nearest enemy change during startup does not turn the kick');
  t.run(move.startup - 1, pin);
  ok(t.P.facing === side && front.hp < front.maxHp && rear.hp === rear.maxHp, 'Kick lands in its original direction');
  t.run(move.active + move.recovery + 20, pin);
  ok(t.P.state === 'idle' && t.P.facing === -side, 'Automatic targeting resumes after recovery');
  t.close();
}

// A fireball also travels in the direction chosen when its startup began.
for (const side of [-1, 1]) {
  const t = beltWorld([spawn('punk', 600 + side * 240), spawn('knife', 600 - side * 170)]);
  const move = specialsFor('RYU').primary;
  t.P.facing = side;
  t.P.startMove(move);
  t.run(move.startup, freeze(t.w));
  ok(t.w.projectiles.some(shot => shot.owner === t.P && Math.sign(shot.vx) === side), 'Fireball launches toward its committed side');
  t.close();
}

// A near enemy outside the attack lane must not pull the aim off a reachable one.
for (const side of [-1, 1]) for (const reachable of [true, false]) {
  const distance = reachable ? 114 : 190;
  const t = beltWorld([spawn('punk', 600 + side * distance), spawn('knife', 600 - side, 575)]);
  const [aligned, offLane] = t.w.enemies;
  t.w.defenseOverride = () => false;
  const pin = () => {
    freeze(t.w)();
    aligned.x = aligned.previousX = 600 + side * distance;
    aligned.hitStop = 1;
    offLane.x = offLane.previousX = 600 - side;
    offLane.y = offLane.previousY = 575;
  };
  t.hold('hk'); t.step(pin); t.release('hk');
  ok(t.P.facing === (reachable ? side : -side), 'Aim prefers a reachable same-lane enemy and otherwise keeps the distance fallback');
  if (reachable) {
    t.run(t.P.currentMove.startup, pin);
    ok(aligned.hp < aligned.maxHp && offLane.hp === offLane.maxHp, 'Aim puts the kick into the reachable lane');
  }
  t.close();
}

// A brief jump press in the final recovery frames launches on the first free frame.
for (const framesLeft of [4, 5]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  const end = move.startup + move.active + move.recovery;
  t.P.startMove(move);
  t.P.moveFrame = end - framesLeft;
  t.hold('jump'); t.step(freeze(t.w)); t.release('jump');
  ok(t.P.state === 'attack' && !t.P.airborne, 'The input cannot skip recovery');
  t.run(framesLeft - 1, freeze(t.w));
  ok(t.P.state === 'idle' && !t.P.airborne, 'The final recovery tick is still grounded');
  t.step(freeze(t.w));
  ok(t.P.airborne === (framesLeft === 4), 'Only a late jump press survives recovery');
  t.close();
}

// A fresh action or lost focus invalidates a remembered recovery jump.
for (const next of ['attack', 'blur']) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  t.P.startMove(move);
  t.P.moveFrame = move.startup + move.active + move.recovery - 1;
  t.hold('jump'); t.step(freeze(t.w)); t.release('jump');
  if (next === 'attack') t.hold('lp');
  else window.dispatchEvent(new Event('blur'));
  t.step(freeze(t.w));
  ok(!t.P.airborne && (next === 'attack' ? t.P.currentMove?.id === '5LP' : t.P.state === 'idle'), 'Recovery jump yields to a fresh action or loses focus');
  t.close();
}

// A direction tapped just before recovery ends is a single step on the first free tick.
for (const [framesLeft, heldRight] of [[4, false], [4, true], [5, false]]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  t.P.startMove(move);
  t.P.moveFrame = move.startup + move.active + move.recovery - framesLeft;
  const x = t.P.x, y = t.P.y;
  t.hold('right'); t.hold('down'); t.step(freeze(t.w));
  t.release('down');
  if (!heldRight) t.release('right');
  t.run(framesLeft - 1, freeze(t.w));
  ok(t.P.x === x && t.P.y === y, 'A recovery direction does not move before recovery ends');
  t.step(freeze(t.w));
  ok((t.P.x > x) === (framesLeft === 4) && (t.P.y > y) === (framesLeft === 4), 'Late direction is one step and merges with a held axis');
  const steppedX = t.P.x, steppedY = t.P.y;
  t.step(freeze(t.w));
  ok(t.P.y === steppedY && (heldRight ? t.P.x > steppedX : t.P.x === steppedX), 'Released axes stop after one step');
  t.close();
}

// Recovery movement must not replace a jump that belongs to the same window.
for (const [first, second] of [['down', 'jump'], ['jump', 'down']]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  t.P.startMove(move);
  t.P.moveFrame = move.startup + move.active + move.recovery - 4;
  t.tap(first, freeze(t.w)); t.tap(second, freeze(t.w));
  const y = t.P.y;
  t.step(freeze(t.w));
  ok(t.P.airborne && t.P.y === y, 'Recovery jump owns the first free tick over a remembered step');
  t.close();
}

// A basic attack tapped just before recovery ends starts on the first free tick.
for (const [framesLeft, fresh] of [[4, false], [5, false], [4, true]]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  t.P.startMove(move);
  t.P.moveFrame = move.startup + move.active + move.recovery - framesLeft;
  t.hold('lp'); t.step(freeze(t.w)); t.release('lp');
  ok(t.P.currentMove === move, 'A remembered jab does not cancel kick recovery');
  t.run(framesLeft - 1, freeze(t.w));
  ok(t.P.state === 'idle', 'The last recovery frame finishes before another move starts');
  if (fresh) t.hold('mp');
  t.step(freeze(t.w));
  const expected = fresh ? '5MP' : framesLeft === 4 ? '5LP' : undefined;
  ok(t.P.currentMove?.id === expected, 'A late jab executes once and yields to a fresh attack');
  if (fresh) t.release('mp');
  t.run(35, freeze(t.w));
  ok(t.P.state === 'idle', 'A remembered attack does not repeat without new input');
  t.close();
}

// An attack tapped late in recovery can claim a nearby reward on the first free tick.
for (const [kind, rewardWindow] of [['apple', true], ['pipe', true], ['apple', false]]) {
  const t = beltWorld([spawn('punk', 1000)]);
  const move = normalFor('hk', false, 'RYU');
  t.P.hp = 400;
  const item = t.w.belt.spawnPickup(kind, t.P.x, t.P.y);
  item.z = item.vz = 0;
  t.P.startMove(move);
  t.P.moveFrame = move.startup + move.active + move.recovery - 1;
  t.hold('lp'); t.step(freeze(t.w), rewardWindow); t.release('lp');
  t.step(freeze(t.w), rewardWindow);
  if (rewardWindow) {
    ok(!t.P.currentMove && !t.w.belt.pickups.includes(item), 'The nearby reward owns the buffered input');
    ok(kind === 'apple' ? t.P.hp > 400 : heldWeaponOf(t.P)?.kind === 'pipe', 'The reward is applied once without starting an attack');
  } else {
    ok(t.P.currentMove?.id === '5LP' && t.w.belt.pickups.includes(item), 'The same timing in combat starts a jab');
  }
  t.close();
}

// A guardable attack may call for a ground guard without locking air movement.
for (const side of [-1, 1]) for (const threat of ['melee', 'bottle']) {
  const t = beltWorld([spawn(threat === 'melee' ? 'bruiser' : 'thrower', 600 + side * 135)]);
  const enemy = t.w.enemy;
  enemy.facing = side === 1 ? -1 : 1;
  t.P.state = 'jump'; t.P.airborne = true; t.P.jumpHeight = 90; t.P.jumpVelocity = 3;
  if (threat === 'melee') enemy.startMove(GRUNTS.bruiser.heavy);
  else {
    t.w.spawnScriptedProjectile(enemy, GRUNTS.thrower.specials.primary);
    t.w.projectiles[0].y = t.P.y - 88 - t.P.jumpHeight * .9;
  }
  const x = t.P.x;
  t.hold(side === 1 ? 'left' : 'right');
  t.step(freeze(t.w));
  ok(t.P.airborne && (t.P.x - x) * side < 0 && !t.P.proximityGuarding, threat + ' must not stop air retreat');
  if (threat === 'melee') {
    const landingX = t.P.x;
    t.P.jumpHeight = 1; t.P.jumpVelocity = -3;
    t.step(freeze(t.w));
    ok(!t.P.airborne && t.P.x === landingX && t.P.proximityGuarding, 'The landing tick can guard on the ground');
  }
  t.close();
}

// Both a fresh press and a held guard use the incoming bottle's direction.
for (const side of [-1, 1]) for (const correct of [true, false]) for (const freshPress of [true, false]) {
  const t = beltWorld([spawn('punk', 600 + side * 100), spawn('thrower', 600 - side * 370)]);
  const thrower = t.w.enemies[1];
  thrower.facing = side;
  t.w.spawnScriptedProjectile(thrower, GRUNTS.thrower.specials.primary);
  t.w.projectiles[0].x = t.P.x - side * 35;
  const x = t.P.x;
  t.hold(side * (correct ? 1 : -1) > 0 ? 'right' : 'left');
  if (!freshPress) {
    t.input.prepareTick();
    t.input.endTick();
  }
  t.step(freeze(t.w));
  ok(t.P.state === (correct ? 'block' : 'hit'), 'rear bottle tests the direction away from the incoming shot');
  if (correct) ok(t.P.previousX === x && t.P.walkDirection === 0, 'rear bottle guard does not walk forward before impact');
  t.close();
}

// An off-lane bottle shouldn't stop walking, even within the horizontal guard range.
for (const side of [-1, 1]) {
  const t = beltWorld([spawn('punk', 600 + side * 134), spawn('thrower', 600 - side * 170, 425)]);
  const thrower = t.w.enemies[1];
  thrower.facing = side;
  t.w.spawnScriptedProjectile(thrower, GRUNTS.thrower.specials.primary);
  const x = t.P.x;
  t.hold(side > 0 ? 'right' : 'left');
  t.step(freeze(t.w));
  ok((t.P.x - x) * side > 0 && !t.P.proximityGuarding, 'an off-lane bottle leaves horizontal movement available');
  t.run(24, freeze(t.w));
  const bottle = t.w.projectiles[0];
  ok(bottle && Math.abs(bottle.x - t.P.x) <= bottle.radius + 34 && t.P.hp === t.P.maxHp
    && !t.events.some(event => event.type === 'block'), 'the bottle can overlap horizontally without making contact');
  t.close();
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

// Strong attacks warn during startup only. The cue follows the displayed body.
{
  const calls = [];
  const ctx = new Proxy({}, { get: (_, key) => (...args) => calls.push([key, args]) });
  const t = beltWorld([spawn('bruiser', 700), spawn('thrower', 780)]);
  for (const [index, def] of [GRUNTS.bruiser, GRUNTS.thrower].entries()) {
    const fighter = t.w.enemies[index];
    const move = def.specials.primary;
    fighter.startMove(move);
    fighter.moveFrame = move.startup - 1;
    fighter.previousX = fighter.x - 20;
    const before = JSON.stringify(fighter);
    ok(Sprites.drawGruntAttackWarning(ctx, fighter, .5), `${def.kind} shows a startup cue`);
    ok(calls.at(-1)[0] === 'restore', 'cue restores canvas state');
    ok(calls.filter(([key]) => key === 'translate').at(-1)[1][0] === fighter.x - 10, 'cue interpolates with fighter');
    ok(JSON.stringify(fighter) === before, 'cue leaves combat state untouched');
    fighter.moveFrame = move.startup;
    ok(!Sprites.drawGruntAttackWarning(ctx, fighter, 1), 'cue disappears on first active frame');
    fighter.startMove(def.light);
    ok(!Sprites.drawGruntAttackWarning(ctx, fighter, 1), 'light attacks do not add visual noise');
  }
  t.P.startMove(normalFor('hp', false, t.P.character.id));
  ok(!Sprites.drawGruntAttackWarning(ctx, t.P, 1), 'player attack has no enemy cue');
  t.close();
}

console.log(JSON.stringify({ passed: true, checks, ...report }));
