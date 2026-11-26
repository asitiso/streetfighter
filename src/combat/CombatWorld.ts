import type { InputManager } from '../input/InputManager.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { CombatEvent, EnvironmentProp, ModeRules, MoveData } from './CombatTypes.js';
import type { EnemyArchetypeId } from './EnemyArchetypes.js';
import { EnemyDirector } from './EnemyDirector.js';
import { Fighter, TECH_ROLL_SPEED } from './Fighter.js';
import { BeltSystems } from './BeltSystems.js';
import { gruntById } from './GruntLibrary.js';
import { normalFor } from './MoveLibrary.js';

export interface ProjectileInstance {
  owner: Fighter;
  move: MoveData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  piercing: boolean;
  burstIndex: number;
  burstTotal: number;
  readonly hitVictims: Set<number>;
}

export interface BeltEnemySpawn {
  character: CharacterDef;
  x: number;
  y: number;
  hp?: number;
  archetype?: EnemyArchetypeId;
  lateElite?: boolean;
}

interface DuelTradeIntent {
  attacker: Fighter;
  defender: Fighter;
  move: MoveData;
  hitMove: MoveData;
  hitNumber: number;
  impactX: number;
  impactY: number;
}

const PLAYER_ENEMY_BODY_GAP = 58;
const PROP_BODY_MARGIN_X = 28;
const PROP_BODY_MARGIN_Y = 16;
const STANDING_KICK_REACH = normalFor('hk').hitbox.forward;
const PROJECTILE_BODY_MARGIN = 34;
// Kept outside the instance so serialised world fixtures are unchanged.
const beltSystems = new WeakMap<CombatWorld, BeltSystems>();
const PLAYER_COMBO_LINK_FRAMES = 82;

export function meleeForwardReach(attacker: Fighter, move: MoveData): number {
  const authored = move.hitbox.forward * attacker.character.reach;
  // Short grounded jabs must reach the closest position body separation permits.
  // Keep a tiny tolerance for floating-point separation; all other ranges stay authored.
  if (!attacker.airborne && move.kind === 'melee' && (move.id === '5LP' || move.id === '2LP')) {
    return Math.max(authored, PLAYER_ENEMY_BODY_GAP + 1e-6);
  }
  return authored;
}

function meleeImpactY(attacker: Fighter, defender: Fighter): number {
  return Math.min(attacker.y, defender.y) - 92 - defender.jumpHeight;
}

function withinProjectileLane(projectile: ProjectileInstance, fighter: Fighter, shotY = projectile.y): boolean {
  const centerY = fighter.y - 88 - fighter.jumpHeight * .9;
  return Math.abs(centerY - shotY) <= Math.max(55, projectile.move.hitbox.lane);
}

export class CombatWorld {
  readonly player: Fighter;
  readonly enemies: Fighter[] = [];
  readonly events: CombatEvent[] = [];
  readonly projectiles: ProjectileInstance[] = [];
  projectilesClashed = 0;
  /** Training mode: drives living enemies instead of the AI when set. */
  dummyController: ((enemy: Fighter, player: Fighter, rules: ModeRules) => void) | null = null;
  /** Training mode: forced enemy guard decision (null = normal AI decision). */
  defenseOverride: ((defender: Fighter, attacker: Fighter, move: MoveData) => boolean | null) | null = null;
  /** VERSUS: a second human drives the duel opponent with the same controls (motions, parry, throws, guard) as P1. */
  enemyInput: InputManager | null = null;
  readonly props: EnvironmentProp[] = [];
  readonly rules: ModeRules;
  readonly director = new EnemyDirector();
  time = 0;
  superFreezeFrames = 0;
  playerComboHits = 0;
  playerComboDamage = 0;
  playerComboTimer = 0;
  enemyComboHits = 0;
  enemyComboDamage = 0;
  enemyComboTimer = 0;
  lastPlayerHitDamage = 0;
  lastPlayerHitTimer = 0;
  lastPlayerTargetUid: number | null = null;
  totalPlayerDamage = 0;
  totalEnemyDamage = 0;
  maxPlayerComboHits = 0;
  maxPlayerComboDamage = 0;
  playerParries = 0;
  playerRedParries = 0;
  playerSupersUsed = 0;
  playerThrowsLanded = 0;

  constructor(playerDef: CharacterDef, enemyDef: CharacterDef, mode: 'belt' | 'duel' = 'belt', playerSuperArt?: SuperArtDef, enemySuperArt?: SuperArtDef) {
    this.rules = mode === 'belt'
      ? { mode, depthMovement: true, laneTolerance: 54, arenaLeft: 128, arenaRight: 1152, arenaTop: 394, arenaBottom: 580 }
      : { mode, depthMovement: false, laneTolerance: 22, arenaLeft: 120, arenaRight: 1160, arenaTop: 500, arenaBottom: 500 };
    this.player = new Fighter(playerDef, 'player', 360, mode === 'belt' ? 495 : 500, 1, playerSuperArt);
    // Mob pressure in belt sections would chain-stun the hero; the stun gauge is a 1 VS 1 duel mechanic for the player.
    this.player.setStunEnabled(mode === 'duel');
    if (mode === 'belt') this.player.enableCrowdRecovery();
    this.enemies.push(new Fighter(enemyDef, 'enemy', 880, mode === 'belt' ? 490 : 500, -1, enemySuperArt));
  }

  /** Beat 'em up layer (grabs, thrown bodies, pickups, weapons, score); belt mode only. */
  get latestSuperFlash(): CombatEvent | undefined {
    for (let i = this.events.length - 1; i >= 0; i -= 1) {
      const event = this.events[i]!;
      if (event.type === 'super-flash') return event;
    }
    return undefined;
  }

  get belt(): BeltSystems {
    let systems = beltSystems.get(this);
    if (!systems) { systems = new BeltSystems(); beltSystems.set(this, systems); }
    return systems;
  }

  get enemy(): Fighter {
    return this.enemies.find((enemy) => enemy.hp > 0) ?? this.enemies[0]!;
  }

  // Presentation focus never changes attack targeting or facing.
  get focusedEnemy(): Fighter | null {
    const recent = this.enemies.find(enemy => enemy.uid === this.lastPlayerTargetUid && enemy.hp > 0);
    if (recent && (this.playerComboTimer > 0 || this.lastPlayerHitTimer > 0)) return recent;
    return this.closestEnemyToPlayer();
  }

  get comboLinkProgress(): number { return Math.max(0, Math.min(1, this.playerComboTimer / PLAYER_COMBO_LINK_FRAMES)); }

  get livingEnemies(): Fighter[] {
    return this.enemies.filter((enemy) => enemy.hp > 0);
  }

  /** Check the current position through the supplied future tick, inclusive. */
  projectileThreatDuring(fighter: Fighter, ticks: number): ProjectileInstance | undefined {
    return this.projectiles.find(shot => this.projectileCanReach(fighter, shot, ticks));
  }

  /** Predict contact along the shot's remaining path at the fighter's current position. */
  projectileCanReach(fighter: Fighter, shot: ProjectileInstance, horizon = shot.life): boolean {
    return this.projectileContactTick(fighter, shot, horizon) !== undefined;
  }

  projectileContactTick(fighter: Fighter, shot: ProjectileInstance, horizon = shot.life): number | undefined {
    if (shot.owner.side === fighter.side || shot.hitVictims.has(fighter.uid)) return undefined;
    const contactRange = shot.radius + PROJECTILE_BODY_MARGIN;
    const frames = Math.min(shot.life, horizon);
    const endX = shot.x + shot.vx * frames;
    if (fighter.x < Math.min(shot.x, endX) - contactRange || fighter.x > Math.max(shot.x, endX) + contactRange) return undefined;
    for (let frame = 1; frame <= frames; frame += 1) {
      if (Math.abs(fighter.x - (shot.x + shot.vx * frame)) <= contactRange
        && withinProjectileLane(shot, fighter, shot.y + shot.vy * frame)) return frame;
    }
    return undefined;
  }

  replaceEnemies(spawns: readonly BeltEnemySpawn[]): void {
    this.enemies.length = 0;
    this.lastPlayerTargetUid = null;
    this.belt.reset();
    for (const spawn of spawns) {
      const facing: 1 | -1 = spawn.x >= this.player.x ? -1 : 1;
      const fighter = new Fighter(spawn.character, 'enemy', spawn.x, spawn.y, facing, undefined, spawn.archetype ?? 'brawler');
      fighter.hp = spawn.hp ?? 420;
      fighter.maxHp = fighter.hp;
      fighter.lateElite = spawn.lateElite ?? false;
      fighter.aiCooldown = 12 + (fighter.uid * 11) % 35;
      this.enemies.push(fighter);
    }
  }

  addProp(prop: Omit<EnvironmentProp, 'maxHp' | 'broken'> & { maxHp?: number; broken?: boolean }): void {
    this.props.push({ ...prop, maxHp: prop.maxHp ?? prop.hp, broken: prop.broken ?? false });
  }

  /** Reposition during a wave announcement while the enemy and combat clocks wait. */
  updateWaveArrival(input: InputManager, tick: number, reserveCombat: boolean): void {
    const wasAttacking = this.player.state === 'attack';
    if (!wasAttacking) this.facePlayerToward(this.closestEnemyToPlayer());
    this.player.setProximityGuard(0);
    this.player.updatePlayer(input, this.rules, true);
    for (const enemy of this.livingEnemies) this.separatePair(this.player, enemy, PLAYER_ENEMY_BODY_GAP, 38, true);
    this.resolvePropCollisions(this.player);
    if (wasAttacking && !this.player.currentMove) this.facePlayerToward(this.closestEnemyToPlayer());
    // Keep motion history through the card; reserve combat only once the wave is close.
    this.capturePausedInput(input, tick, reserveCombat, true);
  }

  capturePausedInput(input: InputManager, tick: number, reserveCombat: boolean, movementLive = false): void {
    this.player.captureInput(input, tick, reserveCombat, this.rules, movementLive);
    if (this.enemyInput) this.enemies[0]?.captureInput(this.enemyInput, tick, reserveCombat, this.rules);
  }

  update(input: InputManager, tick: number, preservePickupLife = false): void {
    if (this.superFreezeFrames > 0) {
      this.capturePausedInput(input, tick, true);
      this.superFreezeFrames -= 1;
      this.ageEvents();
      return;
    }
    this.time += 1 / 60;
    this.tickComboFeedback();
    // Keep both the swing direction and lane assistance on the committed side.
    const committedSide = this.rules.mode === 'belt' && this.player.state === 'attack' ? this.player.facing : undefined;
    const target = this.closestEnemyToPlayer(committedSide);
    if (committedSide === undefined) this.facePlayerToward(target);
    for (const enemy of this.livingEnemies) enemy.facing = this.player.x >= enemy.x ? 1 : -1;

    const playerWasInHitStop = this.player.hitStop > 0;
    const belt = this.rules.mode === 'belt' && !this.dummyController ? this.belt : null;
    // During travel and loot, a buffered basic attack can claim a nearby reward.
    const bufferedPickup = !!belt && preservePickupLife && this.player.hasBufferedBasicAttack(input, tick);
    const playerInput = belt ? belt.collectPickups(this, input, bufferedPickup) : input;
    this.player.captureInput(playerInput, tick);
    if (!belt?.tickPlayerSide(this, playerInput)) {
      this.player.setProximityGuard(this.proximityGuardDirection(this.player, playerInput));
      this.player.updatePlayer(playerInput, this.rules);
      if (!playerWasInHitStop) this.applySoftLaneAlignment(target);
      belt?.detectPlayerGrab(this, playerInput);
    }

    const directives = this.director.update(this.player, this.enemies, this.rules);
    if (this.rules.mode === 'duel') {
      for (const enemy of this.enemies) {
        if (enemy.aiLevel <= 0) continue;
        let nearest: ProjectileInstance | null = null;
        for (const projectile of this.projectiles) {
          if (projectile.owner === enemy || projectile.vx === 0 || Math.sign(projectile.vx) !== Math.sign(enemy.x - projectile.x)) continue;
          if (!nearest || Math.abs(projectile.x - enemy.x) < Math.abs(nearest.x - enemy.x)) nearest = projectile;
        }
        enemy.observeProjectileThreat(nearest ? { key: nearest, x: nearest.x, y: nearest.y, vx: nearest.vx } : null);
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        if (enemy.state === 'ko') enemy.updateAi(this.player, this.rules);
        continue;
      }
      if (this.enemyInput && enemy === this.enemies[0]) { enemy.captureInput(this.enemyInput, tick); enemy.setProximityGuard(this.proximityGuardDirection(enemy, this.enemyInput)); enemy.updatePlayer(this.enemyInput, this.rules); continue; }
      if (this.dummyController) { this.dummyController(enemy, this.player, this.rules); continue; }
      const directive = directives.get(enemy.uid);
      if (belt?.tickEnemySide(this, enemy, directive)) continue;
      if (directive) {
        // Check after hold processing: a grab can start or end during this tick.
        const playerHeld = belt?.hold?.victim === this.player;
        const next = playerHeld && (directive.attackAllowed || directive.rangedAllowed)
          ? { ...directive, attackAllowed: false, rangedAllowed: false }
          : directive;
        enemy.updateAiDirected(this.player, this.rules, next);
      }
      else enemy.updateAi(this.player, this.rules);
    }

    this.emitMoveStartFx(this.player);
    for (const enemy of this.livingEnemies) this.emitMoveStartFx(enemy);

    this.spawnProjectileIfNeeded(this.player);
    for (const enemy of this.livingEnemies) this.spawnProjectileIfNeeded(enemy);

    const duelEnemy = this.rules.mode === 'duel' ? (this.livingEnemies[0] ?? null) : null;
    const playerTradeIntent = duelEnemy ? this.captureDuelTradeIntent(this.player, duelEnemy) : null;
    const enemyTradeIntent = playerTradeIntent && duelEnemy ? this.captureDuelTradeIntent(duelEnemy, this.player) : null;

    for (const enemy of this.livingEnemies) this.resolveAttack(this.player, enemy, input);
    if (enemyTradeIntent && enemyTradeIntent.attacker.currentMove === null && enemyTradeIntent.attacker.state !== 'attack') {
      this.resolveDuelTradeIntent(enemyTradeIntent);
    }
    for (const enemy of this.livingEnemies) this.resolveAttack(enemy, this.player, input);
    this.resolveEnvironmentAttack(this.player);
    for (const enemy of this.livingEnemies) this.resolveEnvironmentAttack(enemy);
    this.updateProjectiles(input);
    this.resolveBodyCollisions();
    belt?.afterUpdate(this, preservePickupLife);

    this.ageEvents();
  }

  /** An opponent's attack (or a projectile) is coming at this fighter, so holding back guards in place. */
  private proximityGuardDirection(fighter: Fighter, input: InputManager): -1 | 0 | 1 {
    const back: -1 | 1 = fighter.facing === 1 ? -1 : 1;
    for (const projectile of this.projectiles) {
      if (projectile.owner.side === fighter.side) continue;
      if (projectile.move.guardBreak || projectile.hitVictims.has(fighter.uid)) continue;
      const distance = (fighter.x - projectile.x) * Math.sign(projectile.vx);
      if (distance <= 0 || distance >= 220) continue;
      const remainingReach = projectile.radius + PROJECTILE_BODY_MARGIN + Math.abs(projectile.vx) * projectile.life;
      if (distance > remainingReach) continue;
      if (this.rules.mode !== 'belt') {
        if (Math.abs(projectile.y - (fighter.y - 92)) < 80) return back;
        continue;
      }
      const away = projectile.vx > 0 ? 1 : -1;
      if (withinProjectileLane(projectile, fighter, projectile.y + projectile.vy) && this.holdingGuard(input, away)) return away;
    }
    const opponents = fighter.side === 'player' ? this.livingEnemies : [this.player];
    const inBelt = this.rules.mode === 'belt';
    for (const other of opponents) {
      const move = other.currentMove;
      if (other.hp <= 0 || other.state !== 'attack' || !move || move.kind === 'projectile' || other.moveFrame >= move.startup + move.active) continue;
      // Throws cannot be guarded. Holding away must still let the fighter retreat.
      if (move.kind === 'throw' || move.level === 'throw') continue;
      const laneGap = Math.abs(other.y - fighter.y);
      const laneReach = Math.max(this.rules.laneTolerance, move.hitbox.lane);
      if (inBelt) {
        if (move.guardBreak || laneGap > laneReach) continue;
        const forward = (fighter.x - other.x) * other.facing;
        if (forward < -move.hitbox.back || forward > meleeForwardReach(other, move) + 70) continue;
        const away = this.meleeGuardDirection(fighter, other);
        if (this.holdingGuard(input, away)) return away;
      } else if (Math.abs(other.x - fighter.x) <= move.hitbox.forward * other.character.reach + 70 && laneGap <= laneReach + 12) {
        return back;
      }
    }
    return 0;
  }

  private tickComboFeedback(): void {
    if (this.playerComboTimer > 0) this.playerComboTimer -= 1;
    else if (this.playerComboHits > 0) { this.playerComboHits = 0; this.playerComboDamage = 0; }
    if (this.enemyComboTimer > 0) this.enemyComboTimer -= 1;
    else if (this.enemyComboHits > 0) { this.enemyComboHits = 0; this.enemyComboDamage = 0; }
    if (this.lastPlayerHitTimer > 0) this.lastPlayerHitTimer -= 1;
  }

  registerComboHit(attacker: Fighter, damage: number, defender?: Fighter): void {
    const actual = Math.max(0, Math.round(damage));
    if (actual <= 0) return;
    if (attacker === this.player) {
      if (this.playerComboTimer <= 0) { this.playerComboHits = 0; this.playerComboDamage = 0; }
      this.playerComboHits += 1;
      this.playerComboDamage += actual;
      this.totalPlayerDamage += actual;
      this.maxPlayerComboHits = Math.max(this.maxPlayerComboHits, this.playerComboHits);
      this.maxPlayerComboDamage = Math.max(this.maxPlayerComboDamage, this.playerComboDamage);
      this.playerComboTimer = PLAYER_COMBO_LINK_FRAMES;
      if (defender) this.lastPlayerTargetUid = defender.uid;
      this.lastPlayerHitDamage = actual;
      this.lastPlayerHitTimer = 42;
      this.enemyComboHits = 0;
      this.enemyComboDamage = 0;
      this.enemyComboTimer = 0;
    } else {
      if (this.enemyComboTimer <= 0) { this.enemyComboHits = 0; this.enemyComboDamage = 0; }
      this.enemyComboHits += 1;
      this.enemyComboDamage += actual;
      this.totalEnemyDamage += actual;
      this.enemyComboTimer = 72;
      this.playerComboHits = 0;
      this.playerComboDamage = 0;
      this.playerComboTimer = 0;
    }
  }

  // Expire screen effects without advancing combat, actors, or projectiles.
  advanceEffects(): void { this.ageEvents(); }

  private ageEvents(): void {
    let alive = 0;
    for (const event of this.events) {
      event.ttl -= 1;
      if (event.ttl > 0) this.events[alive++] = event;
    }
    this.events.length = alive;
  }

  private emitMoveStartFx(fighter: Fighter): void {
    const move = fighter.currentMove;
    if (!move || fighter.moveStartAnnounced) return;
    fighter.moveStartAnnounced = true;
    if (this.rules.mode === 'belt') this.belt.onMoveStarted(fighter);
    if (move.superCost) {
      if (fighter === this.player) this.playerSupersUsed += 1;
      this.events.push({ type: 'super-flash', x: fighter.x, y: fighter.y - fighter.jumpHeight - 108, power: move.damage, ttl: 36, label: move.label, color: move.color, style: move.superPresentation?.motif, accent: move.superPresentation?.accent });
      this.superFreezeFrames = Math.max(this.superFreezeFrames, move.superPresentation?.freezeFrames ?? (move.install ? 7 : 9));
    }
  }

  private impactType(move: MoveData): 'hit' | 'air-hit' | 'command-hit' | 'target-hit' {
    if (move.technique === 'air') return 'air-hit';
    if (move.technique === 'command') return 'command-hit';
    if (move.technique === 'target') return 'target-hit';
    return 'hit';
  }

  private facePlayerToward(target: Fighter | null): void {
    if (target) this.player.facing = target.x >= this.player.x ? 1 : -1;
  }

  closestEnemyToPlayer(side?: 1 | -1): Fighter | null {
    let best: Fighter | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestInMeleeRange = false;
    const preferMeleeRange = this.rules.mode === 'belt' && !this.player.airborne;
    const move = this.player.currentMove;
    const meleeReach = move?.kind === 'melee' ? meleeForwardReach(this.player, move)
      : STANDING_KICK_REACH * this.player.combatProfile.normalReach * this.player.character.reach;
    const laneReach = Math.max(this.rules.laneTolerance, move?.kind === 'melee' ? move.hitbox.lane : 0);
    for (const enemy of this.livingEnemies) {
      const dx = enemy.x - this.player.x;
      if (side !== undefined && dx * side < 0) continue;
      const distance = Math.abs(dx);
      const laneGap = Math.abs(enemy.y - this.player.y);
      const inMeleeRange = preferMeleeRange && distance <= meleeReach && laneGap <= laneReach
        && !enemy.airborne && !enemy.isInvulnerable();
      if (bestInMeleeRange && !inMeleeRange) continue;
      const score = distance + laneGap * 1.4;
      if (inMeleeRange !== bestInMeleeRange || score < bestScore) {
        best = enemy;
        bestScore = score;
        bestInMeleeRange = inMeleeRange;
      }
    }
    return best;
  }

  private applySoftLaneAlignment(target: Fighter | null): void {
    if (!target || this.rules.mode !== 'belt' || this.player.state !== 'attack' || !this.player.currentMove || this.player.currentMove.kind === 'projectile') return;
    const move = this.player.currentMove;
    const dx = Math.abs(target.x - this.player.x);
    const dy = Math.abs(target.y - this.player.y);
    const timing = this.player.moveFrame >= Math.max(0, move.startup - 3) && this.player.moveFrame < move.startup + move.active;
    if (timing && dx < move.hitbox.forward * this.player.character.reach + 44 && dy > move.hitbox.lane * .45 && dy <= 72) {
      this.player.nudgeTowardLane(target.y, 2.25);
      this.player.y = Math.max(this.rules.arenaTop, Math.min(this.rules.arenaBottom, this.player.y));
    }
  }

  private spawnProjectileIfNeeded(fighter: Fighter): void {
    const move = fighter.currentMove;
    if (!move?.projectile || fighter.moveEffectTriggered || !fighter.isMoveActive()) return;
    fighter.moveEffectTriggered = true;
    const count = Math.max(1, move.projectile.count ?? 1);
    const spread = move.projectile.verticalSpread ?? 0;
    const bossBurst = move.projectile.bossBurst;
    if (bossBurst) {
      this.spawnProjectileBurst(fighter, move, count, spread, bossBurst.speedScale);
      this.events.push({ type: 'boss-burst', x: fighter.x, y: fighter.y - 100, power: move.damage, ttl: 34, label: bossBurst.label });
      return;
    }
    for (let index = 0; index < count; index += 1) {
      const offset = index - (count - 1) * .5;
      this.spawnScriptedProjectile(fighter, move, offset * spread, offset * .16, 1, index + 1, count);
    }
  }

  spawnScriptedProjectile(fighter: Fighter, move: MoveData, yOffset = 0, vy = 0, speedScale = 1, burstIndex = 1, burstTotal = 1): void {
    if (!move.projectile) return;
    this.projectiles.push({
      owner: fighter,
      move,
      x: fighter.x + fighter.facing * 54,
      y: fighter.y - 92 + yOffset,
      vx: fighter.facing * move.projectile.speed * speedScale,
      vy,
      life: move.projectile.life,
      radius: move.projectile.radius,
      piercing: !!move.projectile.piercing,
      burstIndex: Math.max(1, burstIndex),
      burstTotal: Math.max(1, burstTotal),
      hitVictims: new Set<number>(),
    });
  }

  spawnProjectileBurst(fighter: Fighter, move: MoveData, count: number, verticalSpread: number, speedScale = 1): void {
    if (!move.projectile) return;
    const actual = Math.max(1, count);
    for (let index = 0; index < actual; index += 1) {
      const offset = index - (actual - 1) * .5;
      this.spawnScriptedProjectile(fighter, move, offset * verticalSpread, offset * .2, speedScale, index + 1, actual);
    }
  }

  private captureDuelTradeIntent(attacker: Fighter, defender: Fighter): DuelTradeIntent | null {
    const move = attacker.currentMove;
    if (!move || move.kind === 'projectile' || move.kind === 'throw' || move.level === 'throw' || !!move.install || !attacker.isMoveActive() || attacker.hasHitTarget(defender) || attacker.hp <= 0 || defender.hp <= 0 || defender.isInvulnerable()) return null;

    const dx = (defender.x - attacker.x) * attacker.facing;
    const dy = Math.abs(defender.y - attacker.y);
    const withinX = dx >= -move.hitbox.back && dx <= meleeForwardReach(attacker, move);
    const withinY = dy <= Math.max(this.rules.laneTolerance, move.hitbox.lane);
    const verticalDelta = Math.abs(attacker.jumpHeight - defender.jumpHeight);
    const verticalTolerance = move.launch
      ? Math.max(135, move.hitbox.height + 36)
      : move.technique === 'air'
        ? (move.damage >= 70 ? 96 : 82)
        : move.level === 'low'
          ? 34
          : Math.max(62, move.hitbox.height * .72);
    if (!withinX || !withinY || verticalDelta > verticalTolerance) return null;
    if (move.juggleLimit !== undefined && defender.airborne && defender.juggleHits >= move.juggleLimit) return null;

    const hitNumber = attacker.hitNumberFor(defender);
    const hitMove = move.multiHit ? {
      ...move,
      damage: Math.max(1, Math.round(move.damage * move.multiHit.perHitScale)),
      hitStop: hitNumber >= move.multiHit.hits ? move.hitStop : Math.min(5, move.hitStop),
      hitStun: hitNumber >= move.multiHit.hits ? move.hitStun : Math.max(8, Math.round(move.hitStun * .55)),
      pushback: hitNumber >= move.multiHit.hits ? move.pushback : Math.min(10, move.pushback * .14),
      knockdown: hitNumber >= move.multiHit.hits ? move.knockdown : false,
      launch: hitNumber >= move.multiHit.hits ? move.launch : undefined,
    } : move;

    return {
      attacker,
      defender,
      move,
      hitMove,
      hitNumber,
      impactX: (attacker.x + defender.x) * .5,
      impactY: meleeImpactY(attacker, defender),
    };
  }

  private resolveDuelTradeIntent(intent: DuelTradeIntent): void {
    const { attacker, defender, move, hitMove, hitNumber, impactX, impactY } = intent;
    const hpBefore = defender.hp;
    const outcome = defender.receiveHit(hitMove, attacker, false, false);
    attacker.markHitTarget(defender);

    if (outcome === 'hit') {
      defender.syncVisualHitSequence(hitNumber, move.multiHit?.hits ?? 1);
      attacker.addAttackReward(hitMove);
      this.registerComboHit(attacker, hpBefore - defender.hp, defender);
      if (hitMove.superCost) defender.syncSuperVictimHit(hitNumber, move.multiHit?.hits ?? 1);
    }

    const type = outcome === 'hit' ? this.impactType(move) : outcome;
    this.events.push({
      type,
      x: impactX,
      y: impactY,
      power: hitMove.damage,
      ttl: type.includes('parry') ? 24 : 16,
      label: move.multiHit ? `${move.label} ${hitNumber}/${move.multiHit.hits}` : move.technique ? move.label : undefined,
      color: hitMove.color,
      hitIndex: hitNumber,
      hitTotal: move.multiHit?.hits ?? 1,
      attackerSide: attacker.side,
      moveId: move.id,
      superContact: outcome === 'hit' && move.superCost ? true : undefined,
    });
    if (outcome === 'hit' && defender.airborne) this.events.push({ type: 'juggle', x: impactX, y: impactY - Math.min(60, defender.jumpHeight * .35), power: defender.juggleHits, ttl: 20, label: `${defender.juggleHits} JUGGLE`, superContact: move.superCost ? true : undefined });
    if (outcome === 'hit' && move.superCost) this.events.push({ type: 'super-impact', x: impactX, y: impactY, power: hitMove.damage, ttl: 34, label: move.label, color: hitMove.color, style: move.superPresentation?.motif, accent: move.superPresentation?.accent, hitIndex: hitNumber, hitTotal: move.multiHit?.hits ?? 1, attackerSide: attacker.side, moveId: move.id });
    if (outcome === 'hit') this.resolveWallImpact(defender, hitMove);
    if (defender.hp <= 0) this.events.push({ type: 'ko', x: defender.x, y: defender.y - 130, power: 999, ttl: 90 });
  }

  private resolveAttack(attacker: Fighter, defender: Fighter, input: InputManager): void {
    const move = attacker.currentMove;
    if (!move || move.kind === 'projectile' || !!move.install || !attacker.isMoveActive() || attacker.hasHitTarget(defender) || defender.hp <= 0 || defender.isInvulnerable()) return;
    // A grab owns one primary victim; thrown-body collateral is resolved separately.
    if ((move.kind === 'throw' || move.level === 'throw') && attacker.attackVictims.size > 0
      && !attacker.attackVictims.has(defender.uid)) return;
    const direction = attacker.facing;
    const dx = (defender.x - attacker.x) * direction;
    const dy = Math.abs(defender.y - attacker.y);
    const withinX = dx >= -move.hitbox.back && dx <= meleeForwardReach(attacker, move);
    const withinY = dy <= Math.max(this.rules.laneTolerance, move.hitbox.lane);
    const verticalDelta = Math.abs(attacker.jumpHeight - defender.jumpHeight);
    const verticalTolerance = move.launch
      ? Math.max(135, move.hitbox.height + 36)
      : move.technique === 'air'
        ? (move.damage >= 70 ? 96 : 82)
        : move.level === 'low'
          ? 34
          : Math.max(62, move.hitbox.height * .72);
    if (!withinX || !withinY || verticalDelta > verticalTolerance) return;
    if (move.juggleLimit !== undefined && defender.airborne && defender.juggleHits >= move.juggleLimit) return;
    const hitNumber = attacker.hitNumberFor(defender);
    const hitMove = move.multiHit ? { ...move, damage: Math.max(1, Math.round(move.damage * move.multiHit.perHitScale)), hitStop: hitNumber >= move.multiHit.hits ? move.hitStop : Math.min(5, move.hitStop), hitStun: hitNumber >= move.multiHit.hits ? move.hitStun : Math.max(8, Math.round(move.hitStun * .55)), pushback: hitNumber >= move.multiHit.hits ? move.pushback : Math.min(10, move.pushback * .14), knockdown: hitNumber >= move.multiHit.hits ? move.knockdown : false, launch: hitNumber >= move.multiHit.hits ? move.launch : undefined } : move;

    if (hitMove.level === 'throw' && !defender.canBeThrown()) return;
    if (hitMove.level === 'throw' && this.throwEscape(defender)) {
      attacker.markHitTarget(defender);
      attacker.throwEscaped(attacker.facing === 1 ? -1 : 1);
      defender.throwEscaped(attacker.facing);
      this.events.push({ type: 'throw-escape', x: (attacker.x + defender.x) * .5, y: defender.y - 95, power: 0, ttl: 20 });
      return;
    }

    const humanInput = this.humanInputFor(defender, input);
    const guardDirection = this.rules.mode === 'belt' ? this.meleeGuardDirection(defender, attacker) : -defender.facing;
    const guarding = defender.canDefend() && (humanInput ? this.holdingGuard(humanInput, guardDirection) : this.enemyDefenseDecision(defender, attacker, move));
    // Away from a rear attack may also be forward relative to the current target.
    const rearGuard = !!humanInput && guarding && !move.guardBreak && guardDirection === defender.facing;
    const counter = defender.state === 'attack' && !!defender.currentMove && defender.moveFrame < defender.currentMove.startup;
    const hpBefore = defender.hp;
    // Capture the victim's contact height before launching/bouncing can change it.
    const midY = meleeImpactY(attacker, defender);
    const armor = this.rules.mode === 'belt' ? gruntById(defender.character.id)?.armor ?? 0 : 0;
    if (armor > 0 && !guarding && defender.state === 'attack' && !defender.eliteRecoveryOpen && !hitMove.knockdown && !hitMove.launch && hitMove.level !== 'throw' && hitMove.damage < 50) {
      // Armored grunts (bruiser, riot soldier) shrug off light hits mid-swing: chip damage, no flinch.
      const damage = Math.max(1, Math.round(hitMove.damage * (1 - armor)));
      if (defender.hp > damage) {
        defender.hp -= damage;
        defender.hitFlash = Math.max(defender.hitFlash, 4);
        attacker.markHitTarget(defender);
        attacker.hitStop = Math.max(attacker.hitStop, 5);
        this.registerComboHit(attacker, damage, defender);
        this.belt.onAttackerContact(this, attacker, move);
        this.events.push({ type: 'block', x: (attacker.x + defender.x) * .5, y: midY, power: damage, ttl: 16, label: 'ARMOR', color: '#9fb3c8', attackerSide: attacker.side, moveId: move.id });
        return;
      }
    }
    const outcome = defender.receiveHit(hitMove, attacker, guarding, counter, direction, !rearGuard);
    attacker.markHitTarget(defender);
    if (this.rules.mode === 'belt' && !this.dummyController) {
      if (outcome === 'hit' || outcome === 'block') this.belt.onAttackerContact(this, attacker, move);
      if (defender === this.player && outcome === 'hit') this.belt.onPlayerHit(this, hitMove, attacker);
    }
    // A blocked melee contact freezes both bodies on the same impact tick.
    if (outcome === 'block') attacker.hitStop = Math.max(attacker.hitStop, Math.round(hitMove.hitStop * .55));
    if (outcome === 'hit') {
      defender.syncVisualHitSequence(hitNumber, move.multiHit?.hits ?? 1);
      attacker.addAttackReward(hitMove);
      if (attacker === this.player && (hitMove.level === 'throw' || hitMove.kind === 'throw')) this.playerThrowsLanded += 1;
      this.registerComboHit(attacker, hpBefore - defender.hp, defender);
      if (hitMove.superCost) defender.syncSuperVictimHit(hitNumber, move.multiHit?.hits ?? 1);
      if (hitMove.level === 'throw' || hitMove.kind === 'throw') {
        attacker.beginThrowSync('attacker', defender.uid, attacker.facing, 24, attacker.character.id);
        defender.beginThrowSync('victim', attacker.uid, attacker.facing, 24, attacker.character.id);
      }
    }
    if ((outcome === 'parry' || outcome === 'red-parry') && defender === this.player) {
      this.playerParries += 1;
      if (outcome === 'red-parry') this.playerRedParries += 1;
    }
    if (outcome === 'parry' || outcome === 'red-parry') attacker.hitStop = Math.max(attacker.hitStop, outcome === 'red-parry' ? 8 : 6);
    const midX = (attacker.x + defender.x) * .5;
    const type = outcome === 'hit' && counter ? 'counter' : outcome === 'hit' ? this.impactType(move) : outcome;
    this.events.push({ type, x: midX, y: midY, power: hitMove.damage, ttl: type.includes('parry') ? 24 : type === 'target-hit' ? 22 : 16, label: move.multiHit ? `${move.label} ${hitNumber}/${move.multiHit.hits}` : move.technique ? move.label : undefined, color: hitMove.color, hitIndex: hitNumber, hitTotal: move.multiHit?.hits ?? 1, attackerSide: attacker.side, moveId: move.id, superContact: outcome === 'hit' && move.superCost ? true : undefined });
    if (outcome === 'hit' && defender.airborne) this.events.push({ type: 'juggle', x: midX, y: midY - Math.min(60, defender.jumpHeight * .35), power: defender.juggleHits, ttl: 20, label: `${defender.juggleHits} JUGGLE`, superContact: move.superCost ? true : undefined });
    if (outcome === 'hit' && move.superCost) this.events.push({ type: 'super-impact', x: midX, y: midY, power: hitMove.damage, ttl: 34, label: move.label, color: hitMove.color, style: move.superPresentation?.motif, accent: move.superPresentation?.accent, hitIndex: hitNumber, hitTotal: move.multiHit?.hits ?? 1, attackerSide: attacker.side, moveId: move.id });

    if (outcome === 'hit' && hitMove.level === 'throw' && this.rules.mode === 'belt') this.resolveThrownEnemyCollision(attacker, defender, hitMove);
    if (outcome === 'hit') this.resolveWallImpact(defender, hitMove);
    if (defender.hp <= 0) this.events.push({ type: 'ko', x: defender.x, y: defender.y - 130, power: 999, ttl: 90 });
  }

  /** Opposing non-piercing fireballs that meet cancel each other out (SF projectile clash). */
  private resolveProjectileClashes(): void {
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const a = this.projectiles[i]!;
      if (a.piercing || a.move.superCost) continue;
      for (let j = i + 1; j < this.projectiles.length; j += 1) {
        const b = this.projectiles[j]!;
        if (b.piercing || b.move.superCost || b.owner.side === a.owner.side) continue;
        if (Math.abs(a.x - b.x) > a.radius + b.radius || Math.abs(a.y - b.y) > 48) continue;
        this.events.push({ type: 'block', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, power: Math.max(a.move.damage, b.move.damage), ttl: 18, color: a.move.color, label: 'CLASH' });
        this.projectilesClashed += 1;
        this.projectiles.splice(j, 1);
        this.projectiles.splice(i, 1);
        i -= 1;
        break;
      }
    }
  }

  private updateProjectiles(input: InputManager): void {
    this.resolveProjectileClashes();
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const projectile = this.projectiles[i]!;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.life -= 1;
      const defenders = projectile.owner === this.player ? this.livingEnemies : [this.player];
      if (!projectile.piercing && projectile.vx !== 0 && defenders.length > 1) {
        const direction = projectile.vx > 0 ? 1 : -1;
        defenders.sort((a, b) => (a.x - b.x) * direction);
      }
      let collided = false;
      for (const defender of defenders) {
        if (defender.hp <= 0 || projectile.hitVictims.has(defender.uid) || defender.isInvulnerable()) continue;
        const dx = Math.abs(defender.x - projectile.x);
        if (dx > projectile.radius + PROJECTILE_BODY_MARGIN || !withinProjectileLane(projectile, defender)) continue;
        const impactDirection: 1 | -1 = projectile.vx < 0 ? -1 : projectile.vx > 0 ? 1 : projectile.owner.facing;
        const humanInput = this.humanInputFor(defender, input);
        const guardDirection = this.rules.mode === 'belt' && projectile.vx !== 0 ? impactDirection : -defender.facing;
        const guarding = defender.canDefend() && (humanInput ? this.holdingGuard(humanInput, guardDirection) : this.enemyDefenseDecision(defender, projectile.owner, projectile.move, projectile.x));
        // The rear guard direction is also forward relative to the defender's current target.
        const rearGuard = !!humanInput && guarding && guardDirection === defender.facing;
        const counter = defender.state === 'attack' && !!defender.currentMove && defender.moveFrame < defender.currentMove.startup;
        const hpBefore = defender.hp;
        const outcome = defender.receiveHit(projectile.move, projectile.owner, guarding, counter, impactDirection, !rearGuard);
        if (this.rules.mode === 'belt' && defender === this.player && outcome === 'hit' && !this.dummyController) this.belt.onPlayerHit(this, projectile.move, projectile.owner);
        if (outcome === 'hit') {
          defender.syncVisualHitSequence(projectile.burstIndex, projectile.burstTotal);
          projectile.owner.addAttackReward(projectile.move);
          this.registerComboHit(projectile.owner, hpBefore - defender.hp, defender);
          if (projectile.move.superCost) defender.syncSuperVictimHit(projectile.burstIndex, projectile.burstTotal);
        }
        if ((outcome === 'parry' || outcome === 'red-parry') && defender === this.player) {
          this.playerParries += 1;
          if (outcome === 'red-parry') this.playerRedParries += 1;
        }
        const type = outcome === 'hit' && counter ? 'counter' : outcome === 'hit' ? this.impactType(projectile.move) : outcome;
        this.events.push({ type, x: projectile.x, y: projectile.y, power: projectile.move.damage, ttl: type.includes('parry') ? 24 : 16, color: projectile.move.color, hitIndex: projectile.burstIndex || 1, hitTotal: projectile.burstTotal || 1, attackerSide: projectile.owner.side, moveId: projectile.move.id, superContact: outcome === 'hit' && projectile.move.superCost ? true : undefined });
        if (outcome === 'hit' && projectile.move.superCost) this.events.push({ type: 'super-impact', x: projectile.x, y: projectile.y, power: projectile.move.damage, ttl: 34, label: projectile.move.label, color: projectile.move.color, style: projectile.move.superPresentation?.motif, accent: projectile.move.superPresentation?.accent, hitIndex: projectile.burstIndex || 1, hitTotal: projectile.burstTotal || 1, attackerSide: projectile.owner.side, moveId: projectile.move.id });
        if (outcome === 'hit') this.resolveWallImpact(defender, projectile.move);
        if (defender.hp <= 0) this.events.push({ type: 'ko', x: defender.x, y: defender.y - 130, power: 999, ttl: 90 });
        projectile.hitVictims.add(defender.uid);
        collided = true;
        if (!projectile.piercing) break;
      }
      if ((collided && !projectile.piercing) || projectile.life <= 0 || projectile.x < this.rules.arenaLeft - 120 || projectile.x > this.rules.arenaRight + 120) {
        this.projectiles.splice(i, 1);
        i -= 1;
      }
    }
  }

  private resolveEnvironmentAttack(attacker: Fighter): void {
    const move = attacker.currentMove;
    if (!move || move.kind === 'projectile' || !!move.install || !attacker.isMoveActive()) return;
    for (const prop of this.props) {
      if (prop.broken || attacker.attackPropVictims.has(prop.id)) continue;
      const dx = (prop.x - attacker.x) * attacker.facing;
      const dy = Math.abs(prop.y - attacker.y);
      if (dx < -24 || dx > move.hitbox.forward + prop.width * .5 || dy > move.hitbox.lane + prop.depth * .5) continue;
      attacker.attackPropVictims.add(prop.id);
      const damage = Math.max(28, Math.round(move.damage * .72));
      prop.hp = Math.max(0, prop.hp - damage);
      this.events.push({ type: 'prop-hit', x: prop.x, y: prop.y - 62, power: damage, ttl: 18, label: prop.label });
      if (prop.hp <= 0) {
        prop.broken = true;
        prop.solid = false;
        this.events.push({ type: 'prop-break', x: prop.x, y: prop.y - 68, power: 120, ttl: 42, label: prop.label });
      }
    }
  }

  private resolveThrownEnemyCollision(attacker: Fighter, defender: Fighter, move: MoveData): void {
    defender.x += attacker.facing * 72;
    const verticalTolerance = Math.max(62, move.hitbox.height * .72);
    for (const other of this.livingEnemies) {
      if (other === defender || other === attacker) continue;
      const dx = Math.abs(other.x - defender.x);
      const dy = Math.abs(other.y - defender.y);
      if (dx > 92 || dy > 52 || Math.abs(other.jumpHeight - defender.jumpHeight) > verticalTolerance) continue;
      const collisionDamage = Math.round(move.damage * .62);
      const hpBefore = other.hp;
      other.receiveThrownCollision(collisionDamage, attacker.facing);
      this.registerComboHit(attacker, hpBefore - other.hp, other);
      this.events.push({ type: 'enemy-collision', x: (other.x + defender.x) * .5, y: other.y - 84, power: collisionDamage, ttl: 24 });
      if (other.hp <= 0) this.events.push({ type: 'ko', x: other.x, y: other.y - 130, power: 999, ttl: 90 });
      break;
    }
  }

  private resolveWallImpact(defender: Fighter, move: MoveData): void {
    if (move.groundBounce && defender.hp > 0 && !defender.airborne) {
      defender.applyGroundBounce(move.superCost ? 9.6 : 8.2);
      this.events.push({ type: 'ground-bounce', x: defender.x, y: defender.y - 40, power: move.damage, ttl: 28, label: 'GROUND BOUNCE' });
    }
    const nearLeft = defender.x <= this.rules.arenaLeft + 5;
    const nearRight = defender.x >= this.rules.arenaRight - 5;
    if (!nearLeft && !nearRight) return;
    if (move.damage < 70 && !move.knockdown) return;
    defender.hitStop = Math.max(defender.hitStop, 8);
    if (move.wallBounce && defender.hp > 0) {
      const direction: 1 | -1 = nearLeft ? 1 : -1;
      defender.applyWallBounce(direction, move.superCost ? 13 : 10.5);
      this.events.push({ type: 'wall-bounce', x: defender.x, y: defender.y - 95, power: move.damage, ttl: 30, label: 'WALL BOUNCE' });
    } else {
      this.events.push({ type: 'wall-impact', x: defender.x, y: defender.y - 90, power: move.damage, ttl: 22 });
    }
  }

  isHumanEnemy(fighter: Fighter): boolean { return !!this.enemyInput && fighter === this.enemies[0]; }

  /** The human input that owns this defender (P1, or P2 in VERSUS); null for CPU fighters. */
  private humanInputFor(defender: Fighter, playerInput: InputManager): InputManager | null {
    if (defender.side === 'player') return playerInput;
    return this.isHumanEnemy(defender) ? this.enemyInput : null;
  }

  meleeGuardDirection(defender: Fighter, attacker: Fighter): -1 | 1 {
    if (defender.x === attacker.x) return attacker.facing;
    return defender.x < attacker.x ? -1 : 1;
  }

  private holdingGuard(input: InputManager, direction: number): boolean {
    const back = direction < 0 ? 'left' : 'right';
    return input.held(back) && !input.held(back === 'left' ? 'right' : 'left');
  }

  private throwEscape(defender: Fighter): boolean {
    if (defender.side === 'player' || this.isHumanEnemy(defender)) return defender.buffer.pressedWithin('lp', 5) && defender.buffer.pressedWithin('lk', 5);
    return defender.aiCooldown > 0 && defender.aiCooldown % 9 === 0;
  }

  private enemyDefenseDecision(defender: Fighter, attacker: Fighter, move: MoveData, threatX = attacker.x): boolean {
    const forced = this.defenseOverride?.(defender, attacker, move);
    if (forced !== null && forced !== undefined) return forced;
    if (defender.aiHoldingGuard && move.level !== 'throw') return true;
    const distance = Math.abs(threatX - defender.x);
    if (distance >= Math.max(150, defender.aiProfile.preferredDistance + 72)) return false;
    const profile = defender.aiProfile;
    const roll = ((defender.uid * 37 + defender.aiCooldown * 19 + attacker.moveFrame * 13 + Math.round(this.time * 60)) % 100) / 100;
    if (move.level !== 'throw' && roll < profile.parryChance) {
      if (move.level === 'low') defender.lowParryWindow = Math.max(defender.lowParryWindow, 2);
      else defender.parryWindow = Math.max(defender.parryWindow, 2);
      defender.aiCooldown = Math.min(defender.aiCooldown, Math.max(0, Math.round(8 - profile.counterBias * 7)));
      return false;
    }
    return roll < profile.parryChance + profile.guardChance + defender.aiGuardBonus;
  }

  private resolveBodyCollisions(): void {
    for (const fighter of [this.player, ...this.enemies]) {
      if (fighter.throwEscapeFrames > 0 || fighter.state === 'hit' || fighter.state === 'block' || fighter.state === 'knockdown' || fighter.state === 'ko') {
        fighter.x = Math.max(this.rules.arenaLeft, Math.min(this.rules.arenaRight, fighter.x));
      }
    }
    const livingEnemies = this.livingEnemies;
    for (const enemy of livingEnemies) this.separatePair(this.player, enemy, PLAYER_ENEMY_BODY_GAP, 38);
    for (let i = 0; i < livingEnemies.length; i += 1) {
      for (let j = i + 1; j < livingEnemies.length; j += 1) this.separatePair(livingEnemies[i]!, livingEnemies[j]!, 46, 32);
    }
    for (const fighter of [this.player, ...livingEnemies]) this.resolvePropCollisions(fighter);
  }

  hasPlayerRollRoom(direction: 1 | -1): boolean {
    const { x, y } = this.player;
    const nextX = x + direction * TECH_ROLL_SPEED;
    if (nextX < this.rules.arenaLeft || nextX > this.rules.arenaRight) return false;
    // A solid prop can immediately undo the first roll step.
    return !this.props.some(prop => prop.solid && !prop.broken
      && Math.abs(nextX - prop.x) < prop.width * .5 + PROP_BODY_MARGIN_X
      && Math.abs(y - prop.y) < prop.depth * .5 + PROP_BODY_MARGIN_Y);
  }

  private resolvePropCollisions(fighter: Fighter): void {
    for (const prop of this.props) {
      if (!prop.solid || prop.broken) continue;
      if (fighter.airborne && fighter.jumpHeight > 52) continue;
      const dx = fighter.x - prop.x;
      const dy = fighter.y - prop.y;
      const minX = prop.width * .5 + PROP_BODY_MARGIN_X;
      const minY = prop.depth * .5 + PROP_BODY_MARGIN_Y;
      if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
        const horizontal = Math.abs(dx) / minX > Math.abs(dy) / minY;
        const nextX = horizontal ? prop.x + Math.sign(dx || 1) * minX : fighter.x;
        const nextY = horizontal ? fighter.y : prop.y + Math.sign(dy || 1) * minY;
        if (horizontal && this.rules.mode === 'belt' && fighter !== this.player
          && fighter.state === 'walk' && !fighter.airborne && fighter.hitStop === 0
          && fighter.walkDirection === -Math.sign(dx) && this.stepAroundProp(fighter, prop, minX, minY)) continue;
        if (nextX >= this.rules.arenaLeft && nextX <= this.rules.arenaRight
          && nextY >= this.rules.arenaTop && nextY <= this.rules.arenaBottom) {
          fighter.x = nextX;
          fighter.y = nextY;
        } else {
          // A boundary can block the preferred face. Exit along the other axis.
          const alternatives = horizontal
            ? [1, -1].map(sign => ({ x: fighter.x, y: prop.y + Math.sign(dy || 1) * sign * minY }))
            : [1, -1].map(sign => ({ x: prop.x + Math.sign(dx || 1) * sign * minX, y: fighter.y }));
          const exit = alternatives.filter(point => point.x >= this.rules.arenaLeft && point.x <= this.rules.arenaRight
            && point.y >= this.rules.arenaTop && point.y <= this.rules.arenaBottom)
            .sort((a, b) => Math.hypot(a.x - fighter.x, a.y - fighter.y) - Math.hypot(b.x - fighter.x, b.y - fighter.y))[0];
          fighter.x = exit?.x ?? Math.max(this.rules.arenaLeft, Math.min(this.rules.arenaRight, nextX));
          fighter.y = exit?.y ?? Math.max(this.rules.arenaTop, Math.min(this.rules.arenaBottom, nextY));
        }
      }
    }
  }

  private stepAroundProp(fighter: Fighter, prop: EnvironmentProp, minX: number, minY: number): boolean {
    const edge = prop.x + Math.sign(fighter.x - prop.x) * minX;
    if (edge < this.rules.arenaLeft || edge > this.rules.arenaRight) return false;
    const upper = prop.y - minY;
    const lower = prop.y + minY;
    const canGoAbove = upper >= this.rules.arenaTop;
    const canGoBelow = lower <= this.rules.arenaBottom;
    if (!canGoAbove && !canGoBelow) return false;
    // Keep the cleared lane while taking the first step past the side of the prop.
    if (fighter.previousY <= upper || fighter.previousY >= lower) {
      fighter.y = Math.max(this.rules.arenaTop, Math.min(this.rules.arenaBottom, fighter.previousY));
      return true;
    }
    // Convert the blocked forward step into a depth step. Start from the previous
    // lane so steering back toward the player cannot undo the detour each tick.
    const goAbove = canGoAbove && (!canGoBelow || fighter.previousY < prop.y);
    const travel = Math.min(3, Math.abs(fighter.x - fighter.previousX));
    fighter.x = edge;
    fighter.y = goAbove ? Math.max(upper, fighter.previousY - travel) : Math.min(lower, fighter.previousY + travel);
    return true;
  }

  private separatePair(a: Fighter, b: Fighter, minX: number, minY: number, fixedB = false): void {
    if ((a.airborne || b.airborne) && Math.max(a.jumpHeight, b.jumpHeight) > 42) return;
    const dx = b.x - a.x;
    const dy = Math.abs(b.y - a.y);
    if (Math.abs(dx) >= minX || dy >= minY) return;

    const overlap = minX - Math.abs(dx);
    const sign: 1 | -1 = dx >= 0 ? 1 : -1;
    const availableA = sign === 1 ? a.x - this.rules.arenaLeft : this.rules.arenaRight - a.x;
    const availableB = fixedB ? 0 : sign === 1 ? this.rules.arenaRight - b.x : b.x - this.rules.arenaLeft;
    let shiftA = Math.min(overlap * .5, Math.max(0, availableA));
    let shiftB = Math.min(overlap * .5, Math.max(0, availableB));
    let remaining = Math.max(0, overlap - shiftA - shiftB);

    if (remaining > 0) {
      const extraA = Math.min(remaining, Math.max(0, availableA - shiftA));
      shiftA += extraA;
      remaining -= extraA;
    }
    if (remaining > 0) {
      const extraB = Math.min(remaining, Math.max(0, availableB - shiftB));
      shiftB += extraB;
    }

    a.x -= sign * shiftA;
    a.x = Math.max(this.rules.arenaLeft, Math.min(this.rules.arenaRight, a.x));
    if (!fixedB) b.x = Math.max(this.rules.arenaLeft, Math.min(this.rules.arenaRight, b.x + sign * shiftB));
  }
}
