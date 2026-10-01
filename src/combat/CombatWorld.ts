import type { InputManager } from '../input/InputManager.js';
import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { CombatEvent, EnvironmentProp, ModeRules, MoveData } from './CombatTypes.js';
import type { EnemyArchetypeId } from './EnemyArchetypes.js';
import { EnemyDirector } from './EnemyDirector.js';
import { Fighter } from './Fighter.js';

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
}

export class CombatWorld {
  readonly player: Fighter;
  readonly enemies: Fighter[] = [];
  readonly events: CombatEvent[] = [];
  readonly projectiles: ProjectileInstance[] = [];
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
  totalPlayerDamage = 0;
  totalEnemyDamage = 0;
  maxPlayerComboHits = 0;
  maxPlayerComboDamage = 0;
  playerParries = 0;
  playerRedParries = 0;
  playerSupersUsed = 0;
  playerThrowsLanded = 0;

  constructor(playerDef: CharacterDef, enemyDef: CharacterDef, mode: 'belt' | 'duel' = 'belt', playerSuperArt?: SuperArtDef) {
    this.rules = mode === 'belt'
      ? { mode, depthMovement: true, laneTolerance: 54, arenaLeft: 128, arenaRight: 1152, arenaTop: 394, arenaBottom: 580 }
      : { mode, depthMovement: false, laneTolerance: 22, arenaLeft: 120, arenaRight: 1160, arenaTop: 500, arenaBottom: 500 };
    this.player = new Fighter(playerDef, 'player', 360, mode === 'belt' ? 495 : 500, 1, playerSuperArt);
    this.enemies.push(new Fighter(enemyDef, 'enemy', 880, mode === 'belt' ? 490 : 500, -1));
  }

  get enemy(): Fighter {
    return this.enemies.find((enemy) => enemy.hp > 0) ?? this.enemies[0]!;
  }

  get livingEnemies(): Fighter[] {
    return this.enemies.filter((enemy) => enemy.hp > 0);
  }

  replaceEnemies(spawns: readonly BeltEnemySpawn[]): void {
    this.enemies.length = 0;
    for (const spawn of spawns) {
      const facing: 1 | -1 = spawn.x >= this.player.x ? -1 : 1;
      const fighter = new Fighter(spawn.character, 'enemy', spawn.x, spawn.y, facing, undefined, spawn.archetype ?? 'brawler');
      fighter.hp = spawn.hp ?? 420;
      fighter.maxHp = fighter.hp;
      fighter.aiCooldown = 12 + (fighter.uid * 11) % 35;
      this.enemies.push(fighter);
    }
  }

  addProp(prop: Omit<EnvironmentProp, 'maxHp' | 'broken'> & { maxHp?: number; broken?: boolean }): void {
    this.props.push({ ...prop, maxHp: prop.maxHp ?? prop.hp, broken: prop.broken ?? false });
  }

  update(input: InputManager, tick: number): void {
    this.time += 1 / 60;
    this.tickComboFeedback();
    if (this.superFreezeFrames > 0) {
      this.player.captureInput(input, tick);
      this.superFreezeFrames -= 1;
      this.ageEvents();
      return;
    }
    const target = this.closestEnemyToPlayer();
    if (target) this.player.facing = target.x >= this.player.x ? 1 : -1;
    for (const enemy of this.livingEnemies) enemy.facing = this.player.x >= enemy.x ? 1 : -1;

    this.player.captureInput(input, tick);
    this.player.updatePlayer(input, this.rules);
    this.applySoftLaneAlignment(target);

    const directives = this.director.update(this.player, this.enemies, this.rules);
    for (const enemy of this.livingEnemies) {
      const directive = directives.get(enemy.uid);
      if (directive) enemy.updateAiDirected(this.player, this.rules, directive);
      else enemy.updateAi(this.player, this.rules);
    }

    this.emitMoveStartFx(this.player);
    for (const enemy of this.livingEnemies) this.emitMoveStartFx(enemy);

    this.spawnProjectileIfNeeded(this.player);
    for (const enemy of this.livingEnemies) this.spawnProjectileIfNeeded(enemy);

    for (const enemy of this.livingEnemies) this.resolveAttack(this.player, enemy, input);
    for (const enemy of this.livingEnemies) this.resolveAttack(enemy, this.player, input);
    this.resolveEnvironmentAttack(this.player);
    for (const enemy of this.livingEnemies) this.resolveEnvironmentAttack(enemy);
    this.updateProjectiles(input);
    this.resolveBodyCollisions();

    this.ageEvents();
  }

  private tickComboFeedback(): void {
    if (this.playerComboTimer > 0) this.playerComboTimer -= 1;
    else if (this.playerComboHits > 0) { this.playerComboHits = 0; this.playerComboDamage = 0; }
    if (this.enemyComboTimer > 0) this.enemyComboTimer -= 1;
    else if (this.enemyComboHits > 0) { this.enemyComboHits = 0; this.enemyComboDamage = 0; }
    if (this.lastPlayerHitTimer > 0) this.lastPlayerHitTimer -= 1;
  }

  private registerComboHit(attacker: Fighter, damage: number): void {
    const actual = Math.max(0, Math.round(damage));
    if (actual <= 0) return;
    if (attacker === this.player) {
      if (this.playerComboTimer <= 0) { this.playerComboHits = 0; this.playerComboDamage = 0; }
      this.playerComboHits += 1;
      this.playerComboDamage += actual;
      this.totalPlayerDamage += actual;
      this.maxPlayerComboHits = Math.max(this.maxPlayerComboHits, this.playerComboHits);
      this.maxPlayerComboDamage = Math.max(this.maxPlayerComboDamage, this.playerComboDamage);
      this.playerComboTimer = 82;
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

  private ageEvents(): void {
    for (const event of this.events) event.ttl -= 1;
    while (this.events[0] && this.events[0].ttl <= 0) this.events.shift();
  }

  private emitMoveStartFx(fighter: Fighter): void {
    const move = fighter.currentMove;
    if (!move || fighter.moveStartAnnounced) return;
    fighter.moveStartAnnounced = true;
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

  private closestEnemyToPlayer(): Fighter | null {
    let best: Fighter | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const enemy of this.livingEnemies) {
      const score = Math.abs(enemy.x - this.player.x) + Math.abs(enemy.y - this.player.y) * 1.4;
      if (score < bestScore) { best = enemy; bestScore = score; }
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

  private resolveAttack(attacker: Fighter, defender: Fighter, input: InputManager): void {
    const move = attacker.currentMove;
    if (!move || move.kind === 'projectile' || !!move.install || !attacker.isMoveActive() || attacker.hasHitTarget(defender) || defender.hp <= 0) return;
    const direction = attacker.facing;
    const dx = (defender.x - attacker.x) * direction;
    const dy = Math.abs(defender.y - attacker.y);
    const withinX = dx >= -move.hitbox.back && dx <= move.hitbox.forward * attacker.character.reach;
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

    const defenderBack = defender.facing === 1 ? 'left' : 'right';
    const guarding = defender.canDefend() && (defender.side === 'player' ? input.held(defenderBack) : this.enemyDefenseDecision(defender, attacker, move));
    const counter = defender.state === 'attack' && !!defender.currentMove && defender.moveFrame < defender.currentMove.startup;
    const hpBefore = defender.hp;
    const outcome = defender.receiveHit(hitMove, attacker, guarding, counter);
    attacker.markHitTarget(defender);
    if (outcome === 'hit') {
      defender.syncVisualHitSequence(hitNumber, move.multiHit?.hits ?? 1);
      attacker.addAttackReward(hitMove);
      if (attacker === this.player && (hitMove.level === 'throw' || hitMove.kind === 'throw')) this.playerThrowsLanded += 1;
      this.registerComboHit(attacker, hpBefore - defender.hp);
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
    const midY = Math.min(attacker.y, defender.y) - 92;
    const type = outcome === 'hit' && counter ? 'counter' : outcome === 'hit' ? this.impactType(move) : outcome;
    this.events.push({ type, x: midX, y: midY, power: hitMove.damage, ttl: type.includes('parry') ? 24 : type === 'target-hit' ? 22 : 16, label: move.multiHit ? `${move.label} ${hitNumber}/${move.multiHit.hits}` : move.technique ? move.label : undefined, color: hitMove.color, hitIndex: hitNumber, hitTotal: move.multiHit?.hits ?? 1, attackerSide: attacker.side, moveId: move.id });
    if (outcome === 'hit' && defender.airborne) this.events.push({ type: 'juggle', x: midX, y: midY - Math.min(60, defender.jumpHeight * .35), power: defender.juggleHits, ttl: 20, label: `${defender.juggleHits} JUGGLE` });
    if (outcome === 'hit' && move.superCost) this.events.push({ type: 'super-impact', x: midX, y: midY, power: hitMove.damage, ttl: 34, label: move.label, color: hitMove.color, style: move.superPresentation?.motif, accent: move.superPresentation?.accent, hitIndex: hitNumber, hitTotal: move.multiHit?.hits ?? 1, attackerSide: attacker.side, moveId: move.id });

    if (outcome === 'hit' && hitMove.level === 'throw' && this.rules.mode === 'belt') this.resolveThrownEnemyCollision(attacker, defender, hitMove);
    if (outcome === 'hit') this.resolveWallImpact(defender, hitMove);
    if (defender.hp <= 0) this.events.push({ type: 'ko', x: defender.x, y: defender.y - 130, power: 999, ttl: 90 });
  }

  private updateProjectiles(input: InputManager): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i]!;
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      projectile.life -= 1;
      const defenders = projectile.owner === this.player ? this.livingEnemies : [this.player];
      let collided = false;
      for (const defender of defenders) {
        if (defender.hp <= 0 || projectile.hitVictims.has(defender.uid)) continue;
        const dx = Math.abs(defender.x - projectile.x);
        const defenderCenterY = defender.y - 88 - defender.jumpHeight * .9;
        const dy = Math.abs(defenderCenterY - projectile.y);
        if (dx > projectile.radius + 34 || dy > Math.max(55, projectile.move.hitbox.lane)) continue;
        const defenderBack = defender.facing === 1 ? 'left' : 'right';
        const guarding = defender.canDefend() && (defender.side === 'player' ? input.held(defenderBack) : this.enemyDefenseDecision(defender, projectile.owner, projectile.move));
        const counter = defender.state === 'attack' && !!defender.currentMove && defender.moveFrame < defender.currentMove.startup;
        const hpBefore = defender.hp;
        const outcome = defender.receiveHit(projectile.move, projectile.owner, guarding, counter);
        if (outcome === 'hit') {
          projectile.owner.addAttackReward(projectile.move);
          this.registerComboHit(projectile.owner, hpBefore - defender.hp);
          if (projectile.move.superCost) defender.syncSuperVictimHit(projectile.burstIndex, projectile.burstTotal);
        }
        if ((outcome === 'parry' || outcome === 'red-parry') && defender === this.player) {
          this.playerParries += 1;
          if (outcome === 'red-parry') this.playerRedParries += 1;
        }
        const type = outcome === 'hit' && counter ? 'counter' : outcome === 'hit' ? this.impactType(projectile.move) : outcome;
        this.events.push({ type, x: projectile.x, y: projectile.y, power: projectile.move.damage, ttl: type.includes('parry') ? 24 : 16, color: projectile.move.color, hitIndex: projectile.burstIndex || 1, hitTotal: projectile.burstTotal || 1, attackerSide: projectile.owner.side, moveId: projectile.move.id });
        if (outcome === 'hit' && projectile.move.superCost) this.events.push({ type: 'super-impact', x: projectile.x, y: projectile.y, power: projectile.move.damage, ttl: 34, label: projectile.move.label, color: projectile.move.color, style: projectile.move.superPresentation?.motif, accent: projectile.move.superPresentation?.accent, hitIndex: projectile.burstIndex || 1, hitTotal: projectile.burstTotal || 1, attackerSide: projectile.owner.side, moveId: projectile.move.id });
        this.resolveWallImpact(defender, projectile.move);
        if (defender.hp <= 0) this.events.push({ type: 'ko', x: defender.x, y: defender.y - 130, power: 999, ttl: 90 });
        projectile.hitVictims.add(defender.uid);
        collided = true;
        if (!projectile.piercing) break;
      }
      if (collided && !projectile.piercing) { this.projectiles.splice(i, 1); continue; }
      if (projectile.life <= 0 || projectile.x < this.rules.arenaLeft - 120 || projectile.x > this.rules.arenaRight + 120) this.projectiles.splice(i, 1);
    }
  }

  private resolveEnvironmentAttack(attacker: Fighter): void {
    const move = attacker.currentMove;
    if (!move || move.kind === 'projectile' || !!move.install || !attacker.isMoveActive() || attacker.moveFrame !== move.startup) return;
    for (const prop of this.props) {
      if (prop.broken) continue;
      const dx = (prop.x - attacker.x) * attacker.facing;
      const dy = Math.abs(prop.y - attacker.y);
      if (dx < -24 || dx > move.hitbox.forward + prop.width * .5 || dy > move.hitbox.lane + prop.depth * .5) continue;
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
    for (const other of this.livingEnemies) {
      if (other === defender) continue;
      const dx = Math.abs(other.x - defender.x);
      const dy = Math.abs(other.y - defender.y);
      if (dx > 92 || dy > 52) continue;
      const collisionDamage = Math.round(move.damage * .62);
      other.hp = Math.max(0, other.hp - collisionDamage);
      this.registerComboHit(attacker, collisionDamage);
      other.hitFlash = 7;
      other.hitStop = Math.max(other.hitStop, 8);
      other.x += attacker.facing * 38;
      other.state = other.hp <= 0 ? 'ko' : 'knockdown';
      other.stateFrame = other.hp <= 0 ? -90 : -30;
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

  private throwEscape(defender: Fighter): boolean {
    if (defender.side === 'player') return defender.buffer.pressedWithin('lp', 5) && defender.buffer.pressedWithin('lk', 5);
    return defender.aiCooldown > 0 && defender.aiCooldown % 9 === 0;
  }

  private enemyDefenseDecision(defender: Fighter, attacker: Fighter, move: MoveData): boolean {
    const distance = Math.abs(attacker.x - defender.x);
    if (distance >= Math.max(150, defender.aiProfile.preferredDistance + 72)) return false;
    const profile = defender.aiProfile;
    const roll = ((defender.uid * 37 + defender.aiCooldown * 19 + attacker.moveFrame * 13 + Math.round(this.time * 60)) % 100) / 100;
    if (move.level !== 'throw' && roll < profile.parryChance) {
      if (move.level === 'low') defender.lowParryWindow = Math.max(defender.lowParryWindow, 2);
      else defender.parryWindow = Math.max(defender.parryWindow, 2);
      defender.aiCooldown = Math.min(defender.aiCooldown, Math.max(0, Math.round(8 - profile.counterBias * 7)));
      return false;
    }
    return roll < profile.parryChance + profile.guardChance;
  }

  private resolveBodyCollisions(): void {
    for (const enemy of this.livingEnemies) this.separatePair(this.player, enemy, 58, 38);
    for (let i = 0; i < this.livingEnemies.length; i += 1) {
      for (let j = i + 1; j < this.livingEnemies.length; j += 1) this.separatePair(this.livingEnemies[i]!, this.livingEnemies[j]!, 46, 32);
    }
    for (const fighter of [this.player, ...this.livingEnemies]) {
      for (const prop of this.props) {
        if (!prop.solid || prop.broken) continue;
        if (fighter.airborne && fighter.jumpHeight > 52) continue;
        const dx = fighter.x - prop.x;
        const dy = fighter.y - prop.y;
        const minX = prop.width * .5 + 28;
        const minY = prop.depth * .5 + 16;
        if (Math.abs(dx) < minX && Math.abs(dy) < minY) {
          if (Math.abs(dx) / minX > Math.abs(dy) / minY) fighter.x = prop.x + Math.sign(dx || 1) * minX;
          else fighter.y = prop.y + Math.sign(dy || 1) * minY;
        }
      }
    }
  }

  private separatePair(a: Fighter, b: Fighter, minX: number, minY: number): void {
    if ((a.airborne || b.airborne) && Math.max(a.jumpHeight, b.jumpHeight) > 42) return;
    const dx = b.x - a.x;
    const dy = Math.abs(b.y - a.y);
    if (Math.abs(dx) >= minX || dy >= minY) return;
    const correction = (minX - Math.abs(dx)) * .5;
    const sign = dx >= 0 ? 1 : -1;
    a.x -= sign * correction;
    b.x += sign * correction;
  }
}
