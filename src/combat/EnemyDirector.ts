import type { EnemyDirective, EnemyRole, ModeRules } from './CombatTypes.js';
import type { Fighter } from './Fighter.js';
import { specialMovesFor } from './MoveLibrary.js';
import { canFireGruntProjectile, GRUNTS } from './GruntLibrary.js';

export class EnemyDirector {
  private frame = 0;
  private readonly roles = new Map<number, EnemyRole>();

  update(player: Fighter, enemies: readonly Fighter[], rules: ModeRules): Map<number, EnemyDirective> {
    this.frame += 1;
    const alive = enemies.filter((enemy) => enemy.hp > 0);
    const directives = new Map<number, EnemyDirective>();
    if (rules.mode === 'duel') {
      for (const enemy of alive) directives.set(enemy.uid, this.directiveFor('attack', player, enemy, 0, rules));
      return directives;
    }

    const recoveries = alive.filter((enemy) => enemy.state === 'hit' || enemy.state === 'block' || enemy.state === 'knockdown' || enemy.hitStop > 0);
    const available = alive.filter((enemy) => !recoveries.includes(enemy));
    available.sort((a, b) => this.score(player, a) - this.score(player, b));

    const pressurePool = available.filter((enemy) => enemy.aiProfile.pressure >= .9);
    const attackCount = !rules.beltSingleMelee && available.length >= 4
      ? Math.min(2, Math.max(1, pressurePool.length)) : Math.min(1, available.length);
    // Started moves keep running even if the director assigns their owner a different role.
    const committed = alive.filter((enemy) => enemy.state === 'attack' && enemy.currentMove
      && enemy.moveFrame < enemy.currentMove.startup + enemy.currentMove.active);
    const committedMelee = committed.filter((enemy) => !enemy.currentMove?.projectile).length;
    const openings = Math.max(0, Math.min(attackCount - committedMelee, 2 - committed.length));
    const candidates = available.filter((enemy) => enemy.state !== 'attack');
    // Keep a ready bottle thrower beside a frontline threat. The market reserves
    // its second slot for ranged support, even while the melee fighter is active.
    const roomForSupport = rules.beltSingleMelee ? committed.length + openings < 2
      : openings > 0 && openings + committedMelee === 2;
    const support = roomForSupport
      ? candidates.find((enemy) => enemy.character.id === GRUNTS.thrower.id && !enemy.airborne
        && enemy.aiCooldown <= 1 && canFireGruntProjectile(GRUNTS.thrower.specials.primary.projectile,
          Math.abs(enemy.x - player.x), Math.abs(enemy.y - player.y), enemy.aiProfile.preferredDistance))
      : undefined;
    const attackIds = new Set(candidates.filter((enemy) => enemy !== support)
      .slice(0, openings - Number(!!support && !rules.beltSingleMelee)).map((enemy) => enemy.uid));
    let flankIndex = 0;
    let waitIndex = 0;
    let activeThreats = committed.length + attackIds.size + Number(!!support);

    for (const enemy of alive) {
      let role: EnemyRole;
      if (recoveries.includes(enemy) || enemy.state === 'attack') role = 'recovery';
      else if (attackIds.has(enemy.uid)) role = 'attack';
      else if (enemy === support) role = 'ranged';
      else if (activeThreats < 2 && Math.abs(enemy.x - player.x) > enemy.aiProfile.preferredDistance * 1.55 && this.canUseRanged(enemy)) { role = 'ranged'; activeThreats += 1; }
      else if (flankIndex < 2 && enemy.aiProfile.flankBias >= .45) { role = 'flank'; flankIndex += 1; }
      else { role = 'wait'; waitIndex += 1; }
      this.roles.set(enemy.uid, role);
      directives.set(enemy.uid, this.directiveFor(role, player, enemy, role === 'wait' ? waitIndex : flankIndex, rules));
    }
    return directives;
  }

  roleFor(enemy: Fighter): EnemyRole {
    return this.roles.get(enemy.uid) ?? 'wait';
  }

  activeAttackers(enemies: readonly Fighter[]): number {
    return enemies.filter((enemy) => enemy.hp > 0 && this.roles.get(enemy.uid) === 'attack').length;
  }

  private score(player: Fighter, enemy: Fighter): number {
    const dx = Math.abs(player.x - enemy.x);
    const dy = Math.abs(player.y - enemy.y) * 1.65;
    const recentAttackPenalty = enemy.aiCooldown > 0 ? 70 : 0;
    const preferencePenalty = Math.abs(dx - enemy.aiProfile.preferredDistance) * .24;
    return dx + dy + recentAttackPenalty + preferencePenalty - enemy.aiProfile.pressure * 12;
  }

  private canUseRanged(enemy: Fighter): boolean {
    return enemy.aiProfile.rangedBias > 0 && !!specialMovesFor(enemy.character.id).primary.projectile;
  }

  private directiveFor(role: EnemyRole, player: Fighter, enemy: Fighter, index: number, rules: ModeRules): EnemyDirective {
    const side = enemy.x < player.x ? -1 : 1;
    const laneSpread = 54 + (index % 2) * 35;
    const preferred = enemy.aiProfile.preferredDistance;
    const oscillation = Math.sin((this.frame + enemy.uid * 17) / 55) * 18;
    switch (role) {
      case 'attack':
        return { role, desiredX: player.x + side * preferred, desiredY: player.y + oscillation * .25, attackAllowed: true, rangedAllowed: false };
      case 'flank':
        return { role, desiredX: player.x - side * (150 + index * 30), desiredY: this.clampY(player.y + (index % 2 === 0 ? -laneSpread : laneSpread), rules), attackAllowed: false, rangedAllowed: false };
      case 'ranged':
        return { role, desiredX: player.x + side * Math.max(250, preferred), desiredY: this.clampY(player.y + oscillation, rules), attackAllowed: false, rangedAllowed: true };
      case 'recovery':
        return { role, desiredX: enemy.x, desiredY: enemy.y, attackAllowed: false, rangedAllowed: false };
      case 'wait':
      default:
        return { role, desiredX: player.x + side * (210 + index * 28), desiredY: this.clampY(player.y + oscillation, rules), attackAllowed: false, rangedAllowed: false };
    }
  }

  private clampY(y: number, rules: ModeRules): number {
    return Math.max(rules.arenaTop + 8, Math.min(rules.arenaBottom - 8, y));
  }
}
