import { throwChordPressed, type Action, type InputManager } from '../input/InputManager.js';
import type { CombatEvent, EnemyDirective, EnvironmentProp, ModeRules, MoveButton, MoveData } from './CombatTypes.js';
import type { Fighter } from './Fighter.js';
import { gruntById } from './GruntLibrary.js';

/**
 * Beat 'em up layer for belt sections only (Final Fight / Streets of Rage rules):
 * walk-in grabs with knees and front/back throws, thrown bodies that bowl over the crowd,
 * grappler enemies that grab the player, breakable-object drops (food, score, weapons)
 * and swingable/throwable weapons with durability. Duel (boss) rules never run this.
 */
export type WeaponKind = 'pipe' | 'knife' | 'sword';
export type PickupKind = 'apple' | 'chicken' | 'coins' | WeaponKind;

export interface Pickup { id: number; kind: PickupKind; x: number; y: number; z: number; vz: number; vx: number; age: number; life: number; durability: number }
export interface HeldWeapon { kind: WeaponKind; durability: number; maxDurability: number }
export interface GrabHold { holder: Fighter; victim: Fighter; frames: number; knees: number; mash: number; byPlayer: boolean; limit: number; queued: 'knee' | 'front' | 'back' | null }
interface FlyingBody { body: Fighter; thrower: Fighter; dir: 1 | -1; frames: number; damage: number; hit: Set<number> }

export interface BeltWorld {
  readonly player: Fighter;
  readonly enemies: Fighter[];
  readonly events: CombatEvent[];
  readonly props: EnvironmentProp[];
  readonly rules: ModeRules;
  readonly livingEnemies: Fighter[];
  registerComboHit(attacker: Fighter, damage: number, defender?: Fighter): void;
  isHumanEnemy(fighter: Fighter): boolean;
}

export const PICKUP_LABELS: Readonly<Record<PickupKind, string>> = { apple: 'APPLE', chicken: 'ROAST CHICKEN', coins: 'GOLD COINS', pipe: 'LEAD PIPE', knife: 'KNIFE', sword: 'KATANA' };
export const PICKUP_ORDER: readonly PickupKind[] = ['apple', 'chicken', 'coins', 'pipe', 'knife', 'sword'];
const HEAL_FRACTION: Partial<Record<PickupKind, number>> = { apple: .16, chicken: .5 };
const COIN_SCORE = 1000;
export const WEAPON_DURABILITY: Readonly<Record<WeaponKind, number>> = { pipe: 8, knife: 6, sword: 10 };
const WEAPON_FLOOR_LIFE = 900;
const ATTACK_BUTTONS: readonly MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
const MASH_ACTIONS = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'left', 'right', 'up', 'down', 'jump'] as const;
export const GRAB_CONTACT_FRAMES = 3;
export const PLAYER_ESCAPE_MASH = 12;
const NEVER_REACH = { forward: -1e6, back: -1e6, height: 0, lane: 0 };

function weaponStrike(kind: WeaponKind, heavy: boolean, button: MoveButton): MoveData {
  const t = {
    pipe: heavy ? ['PIPE SMASH', 11, 4, 18, 84, 112, true] : ['PIPE SWING', 7, 4, 14, 58, 106, false],
    knife: heavy ? ['KNIFE STAB', 8, 3, 14, 60, 96, false] : ['KNIFE SLASH', 5, 3, 9, 44, 90, false],
    sword: heavy ? ['SWORD CLEAVE', 12, 6, 20, 108, 134, true] : ['SWORD SLASH', 8, 5, 15, 78, 124, false],
  }[kind] as [string, number, number, number, number, number, boolean];
  const [label, startup, active, recovery, damage, reach, knockdown] = t;
  return {
    id: `WEAPON_${kind.toUpperCase()}_${heavy ? 'HEAVY' : 'LIGHT'}`, label, button, kind: 'melee', startup, active, recovery, damage,
    hitStop: heavy ? 10 : 8, hitStun: 16 + Math.round(damage / 8), blockStun: 10 + Math.round(damage / 12), pushback: 14 + damage * .3,
    level: 'mid', knockdown, superGain: 6, hitbox: { forward: reach, back: 14, height: 104, lane: 40 },
    color: kind === 'sword' ? '#dff3ff' : kind === 'knife' ? '#f2f6ff' : '#c9b9a0', identityTag: 'WEAPON',
  };
}

function weaponToss(kind: WeaponKind, button: MoveButton): MoveData {
  const damage = kind === 'sword' ? 96 : kind === 'pipe' ? 72 : 66;
  return {
    id: `WEAPON_TOSS_${kind.toUpperCase()}`, label: `${PICKUP_LABELS[kind]} TOSS`, button, kind: 'projectile', startup: 8, active: 2, recovery: 16, damage,
    hitStop: 9, hitStun: 22, blockStun: 14, pushback: 30, level: 'mid', knockdown: true, superGain: 8,
    hitbox: { forward: 44, back: 10, height: 100, lane: 44 }, projectile: { speed: 11.5, life: 64, radius: 20 },
    color: '#f2e6c8', identityTag: 'WEAPON',
  };
}

function kneeMove(final: boolean, power: number, button: MoveButton): MoveData {
  const damage = Math.round((final ? 34 : 22) * power);
  return {
    id: final ? 'BELT_KNEE_FINISH' : 'BELT_KNEE', label: final ? 'KNEE FINISH' : 'KNEE', button, kind: 'melee', startup: 3, active: 3, recovery: final ? 14 : 7,
    damage, hitStop: final ? 9 : 6, hitStun: 22, blockStun: 8, pushback: 0, level: 'mid', knockdown: final, superGain: 6,
    hitbox: { forward: 84, back: 14, height: 100, lane: 44 }, color: '#ffe0a0', identityTag: 'GRAB',
  };
}

function throwMove(back: boolean, power: number): MoveData {
  return {
    id: back ? 'BELT_BACK_THROW' : 'BELT_FRONT_THROW', label: back ? 'BACK DROP' : 'FRONT THROW', kind: 'throw', startup: 1, active: 1, recovery: 18,
    damage: Math.round((back ? 74 : 66) * power), hitStop: 8, hitStun: 20, blockStun: 0, pushback: 0, level: 'throw', knockdown: true, superGain: 10,
    hitbox: { ...NEVER_REACH }, color: '#f5e8c7', identityTag: 'GRAB',
  };
}

const heldWeapons = new WeakMap<Fighter, HeldWeapon>();
const heldFighters = new WeakSet<Fighter>();

export function heldWeaponOf(fighter: Fighter): HeldWeapon | null { return heldWeapons.get(fighter) ?? null; }
export function isHeldByGrab(fighter: Fighter): boolean { return heldFighters.has(fighter); }

/** Swap a normal punch for a weapon swing and HK for a weapon toss while a weapon is held. */
export function weaponMoveFor(fighter: Fighter, move: MoveData): MoveData {
  const weapon = heldWeapons.get(fighter);
  if (!weapon || !move.button || move.kind !== 'melee' || move.technique || move.superCost || move.exCost || move.identityTag === 'GRAB') return move;
  if (move.button === 'hk') { heldWeapons.delete(fighter); return weaponToss(weapon.kind, 'hk'); }
  if (move.button === 'lk' || move.button === 'mk') return move;
  return weaponStrike(weapon.kind, move.button === 'hp', move.button);
}

/** Authored drops per breakable: every stage yields food, score and at least one weapon (sword late). */
const PROP_DROPS: Readonly<Record<string, PickupKind>> = {
  // Stage 1 Metro streets
  'trash-a': 'apple', 'crate-a': 'pipe', 'hydrant-a': 'coins', 'trash-b': 'knife', 'crate-b': 'chicken', 'hydrant-b': 'coins',
  // Stage 2 market
  'stall-market-a': 'chicken', 'crate-market-a': 'knife', 'crate-market-b': 'coins', 'stall-market-b': 'apple', 'trash-market-a': 'pipe', 'crate-market-c': 'chicken',
  // Stage 3 Japan
  'vending-jp-a': 'apple', 'crate-jp-a': 'sword', 'lantern-jp-a': 'coins', 'vending-jp-b': 'chicken', 'crate-jp-b': 'knife',
  // Stage 4 London
  'bin-london-a': 'apple', 'crate-london-a': 'pipe', 'bag-london-a': 'coins', 'crate-london-b': 'chicken', 'bag-london-b': 'knife',
  // Stage 5 facility
  'console-society-a': 'coins', 'crate-society-a': 'pipe', 'console-society-b': 'apple', 'tank-society-a': 'sword', 'crate-society-b': 'chicken',
};

export function propDropFor(prop: Pick<EnvironmentProp, 'id'>): PickupKind {
  const id = prop.id;
  const authored = PROP_DROPS[id];
  if (authored) return authored;
  const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  if (id.startsWith('crate')) return (['pipe', 'chicken', 'knife', 'apple', 'sword'] as const)[hash % 5]!;
  if (id.startsWith('vending') || id.startsWith('stall')) return id.endsWith('a') ? 'chicken' : 'apple';
  if (id.startsWith('bin') || id.startsWith('trash')) return hash % 2 ? 'apple' : 'pipe';
  if (id.startsWith('tank')) return 'sword';
  if (id.startsWith('hydrant')) return 'pipe';
  return 'coins';
}

function isTowardHeld(input: InputManager, facing: 1 | -1): boolean { return input.held(facing === 1 ? 'right' : 'left') && !input.held(facing === 1 ? 'left' : 'right'); }

export interface BeltStats { grabs: number; knees: number; frontThrows: number; backThrows: number; crowdHits: number; breakFrees: number; enemyGrabs: number; enemyKnees: number; enemyThrows: number; playerEscapes: number; pickups: number; foodEaten: number; weaponHits: number; weaponBreaks: number; weaponDrops: number; weaponTosses: number; drops: number }

export class BeltSystems {
  hold: GrabHold | null = null;
  readonly pickups: Pickup[] = [];
  readonly flying: FlyingBody[] = [];
  score = 0;
  readonly stats: BeltStats = { grabs: 0, knees: 0, frontThrows: 0, backThrows: 0, crowdHits: 0, breakFrees: 0, enemyGrabs: 0, enemyKnees: 0, enemyThrows: 0, playerEscapes: 0, pickups: 0, foodEaten: 0, weaponHits: 0, weaponBreaks: 0, weaponDrops: 0, weaponTosses: 0, drops: 0 };
  private nextPickupId = 1;
  private frame = 0;
  private contactUid: number | null = null;
  private contactFrames = 0;
  private readonly grabCooldown = new Map<number, number>();
  private readonly creditedKos = new Set<number>();
  private readonly droppedProps = new Set<string>();

  spawnPickup(kind: PickupKind, x: number, y: number, durability = kind === 'pipe' || kind === 'knife' || kind === 'sword' ? WEAPON_DURABILITY[kind] : 0, vx = 0): Pickup {
    const pickup: Pickup = { id: this.nextPickupId++, kind, x, y, z: 46, vz: 3.2, vx, age: 0, life: kind === 'pipe' || kind === 'knife' || kind === 'sword' ? WEAPON_FLOOR_LIFE : Number.POSITIVE_INFINITY, durability };
    this.pickups.push(pickup);
    return pickup;
  }

  giveWeapon(fighter: Fighter, kind: WeaponKind, durability = WEAPON_DURABILITY[kind]): void { heldWeapons.set(fighter, { kind, durability, maxDurability: WEAPON_DURABILITY[kind] }); }

  private canCollect(player: Fighter): boolean {
    return !this.hold && !player.airborne && player.hitStop === 0 && player.hp > 0
      && (player.state === 'idle' || player.state === 'walk' || player.state === 'crouch');
  }

  private inPickupRange(item: Pickup, player: Fighter): boolean {
    return item.z <= 6 && Math.abs(item.x - player.x) <= 50 && Math.abs(item.y - player.y) <= 28;
  }

  hasReachableReward({ player, rules, props }: BeltWorld, scope: 'all' | 'manual-pickups' = 'all'): boolean {
    const manualOnly = scope === 'manual-pickups';
    const canUse = (kind: PickupKind) => !HEAL_FRACTION[kind] || player.hp < player.maxHp;
    if (this.pickups.some(item => (!manualOnly || item.kind !== 'coins') && canUse(item.kind)
      && item.x >= rules.arenaLeft - 50 && item.x <= rules.arenaRight + 50
      && item.y >= rules.arenaTop - 28 && item.y <= rules.arenaBottom + 28)) return true;
    return !manualOnly && props.some(prop => {
      if (prop.broken || prop.hp <= 0 || prop.x < rules.arenaLeft || prop.x > rules.arenaRight
        || prop.y < rules.arenaTop - 28 || prop.y > rules.arenaBottom + 28) return false;
      const kind = propDropFor(prop);
      return kind !== 'coins' && canUse(kind);
    });
  }

  /** Item an attack press would collect in the player's current state. */
  nearbyManualPickup(player: Fighter): Pickup | null {
    if (!this.canCollect(player)) return null;
    let best: Pickup | null = null;
    let bestDistance = Infinity;
    for (const item of this.pickups) {
      if (item.kind === 'coins' || (HEAL_FRACTION[item.kind] && player.hp >= player.maxHp) || !this.inPickupRange(item, player)) continue;
      const dx = item.x - player.x;
      const dy = item.y - player.y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Coins collect on contact. Food and weapons still use an attack press. */
  collectPickups(world: BeltWorld, input: InputManager, bufferedPickup = false): InputManager {
    const p = world.player;
    if (!this.pickups.length || !this.canCollect(p)) return input;
    const takeItem = !input.pressed('jump') && !throwChordPressed(input)
      && (bufferedPickup || ATTACK_BUTTONS.some(button => input.pressed(button)));
    const best = takeItem ? this.nearbyManualPickup(p) : null;
    for (let index = 0; index < this.pickups.length; index += 1) {
      const item = this.pickups[index]!;
      if (item.kind !== 'coins' || !this.inPickupRange(item, p)) continue;
      this.pickups.splice(index, 1);
      index -= 1;
      this.stats.pickups += 1;
      this.score += COIN_SCORE;
      world.events.push({ type: 'pickup', x: item.x, y: item.y - 70, power: COIN_SCORE, ttl: 46, label: `+${COIN_SCORE}`, color: '#ffd84a' });
    }
    if (!best) return input;
    // Pickup and attack share one press; consuming the reward consumes that input.
    p.discardBufferedAction();
    this.pickups.splice(this.pickups.indexOf(best), 1);
    this.stats.pickups += 1;
    const heal = HEAL_FRACTION[best.kind];
    if (heal) {
      const before = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * heal));
      this.stats.foodEaten += 1;
      this.score += 100;
      world.events.push({ type: 'pickup', x: best.x, y: best.y - 70, power: p.hp - before, ttl: 46, label: `${PICKUP_LABELS[best.kind]} +${p.hp - before}`, color: '#8cff8a' });
    } else {
      const old = heldWeapons.get(p);
      if (old) this.spawnPickup(old.kind, p.x - p.facing * 30, p.y, old.durability);
      this.giveWeapon(p, best.kind as WeaponKind, best.durability);
      world.events.push({ type: 'pickup', x: best.x, y: best.y - 70, power: 0, ttl: 46, label: `${PICKUP_LABELS[best.kind]}!`, color: '#e7f2ff' });
    }
    const masked = new Proxy(input, {
      get(target, key) {
        if (key === 'pressed') return (action: Action) => !ATTACK_BUTTONS.some(button => button === action) && target.pressed(action);
        if (key === 'firstTouchAttack' || key === 'directionSamplesAfterAttack') return () => undefined;
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    return masked;
  }

  /** Runs in place of the player's update while a hold owns the player. Returns true when it did. */
  tickPlayerSide(world: BeltWorld, input: InputManager): boolean {
    const hold = this.hold;
    if (!hold) return false;
    const p = world.player;
    if (hold.byPlayer) {
      if (p.hp <= 0 || hold.victim.hp <= 0 || p.state === 'hit' || p.state === 'knockdown' || p.state === 'ko' || p.airborne || !world.enemies.includes(hold.victim)) { this.release(false); return false; }
      let action: GrabHold['queued'] = null;
      if (ATTACK_BUTTONS.some(button => input.pressed(button))) {
        const firstTouch = input.firstTouchAttack?.(ATTACK_BUTTONS);
        const directions = firstTouch ? input.touchDirectionsAtAttack?.(firstTouch) : undefined;
        const forward = p.facing === 1 ? 'right' : 'left';
        const back = p.facing === 1 ? 'left' : 'right';
        const towardHeld = directions?.includes(forward) ?? input.held(forward);
        const backHeld = directions?.includes(back) ?? input.held(back);
        action = towardHeld === backHeld ? 'knee' : towardHeld ? 'front' : 'back';
      }
      if (p.state === 'attack') {
        // Buffer the next hold action during a knee so mashing chains knees and throws.
        if (action) hold.queued = action;
        p.updatePlayer(input, world.rules);
        this.pin(hold);
        return true;
      }
      if (hold.victim.state === 'knockdown' || hold.victim.state === 'ko') { this.release(false); return false; }
      if (input.pressed('jump')) { this.release(false); return false; }
      // Only idle holding time counts toward the victim breaking free (knees keep the clinch).
      hold.frames += 1;
      const next = action ?? hold.queued;
      hold.queued = null;
      if (next) {
        if (next === 'front') { this.throwHeld(world, false); return true; }
        if (next === 'back') { this.throwHeld(world, true); return true; }
        hold.knees += 1;
        this.stats.knees += 1;
        p.setGrabPose(false);
        p.startMove(kneeMove(hold.knees >= 3, p.character.power, 'mk'));
        this.pin(hold);
        return true;
      }
      if (hold.frames >= hold.limit) { this.breakFree(world, hold.victim, p, 'BREAK FREE'); return false; }
      p.setGrabPose(true);
      p.previousX = p.x; p.previousY = p.y;
      this.pin(hold);
      return true;
    }
    // The player is the victim: mash buttons and directions to wriggle free.
    hold.mash += MASH_ACTIONS.filter(action => input.pressed(action)).length;
    if (hold.mash >= PLAYER_ESCAPE_MASH) {
      this.stats.playerEscapes += 1;
      this.breakFree(world, p, hold.holder, 'ESCAPE!');
      return true;
    }
    this.pin(hold);
    return true;
  }

  /** Walking into an enemy for a few frames grabs it (no button). */
  detectPlayerGrab(world: BeltWorld, input: InputManager): void {
    const p = world.player;
    const bracing = p.proximityGuarding && p.walkDirection === 0;
    if (this.hold || bracing || p.hp <= 0 || p.airborne || p.currentMove || (p.state !== 'walk' && p.state !== 'idle') || !isTowardHeld(input, p.facing) || ATTACK_BUTTONS.some(b => input.held(b))) { this.contactFrames = 0; this.contactUid = null; return; }
    let target: Fighter | null = null;
    for (const enemy of world.livingEnemies) {
      const dx = (enemy.x - p.x) * p.facing;
      if (dx < 0 || dx > 68 || Math.abs(enemy.y - p.y) > 24 || world.isHumanEnemy(enemy) || !enemy.canBeThrown() || enemy.isInvulnerable()) continue;
      if (enemy.state === 'attack' && enemy.isMoveActive()) continue;
      if (!target || Math.abs(enemy.x - p.x) < Math.abs(target.x - p.x)) target = enemy;
    }
    if (!target) { this.contactFrames = 0; this.contactUid = null; return; }
    this.contactFrames = this.contactUid === target.uid ? this.contactFrames + 1 : 1;
    this.contactUid = target.uid;
    if (this.contactFrames < GRAB_CONTACT_FRAMES) return;
    const bruiser = gruntById(target.character.id)?.kind === 'bruiser';
    this.hold = { holder: p, victim: target, frames: 0, knees: 0, mash: 0, byPlayer: true, limit: bruiser ? 66 : 105, queued: null };
    p.state = 'idle'; p.walkDirection = 0;
    this.stats.grabs += 1;
    this.contactFrames = 0;
    heldFighters.add(target);
    p.setGrabPose(true);
    world.events.push({ type: 'grab', x: (p.x + target.x) / 2, y: target.y - 120, power: 0, ttl: 30, label: 'GRAB!' });
    this.pin(this.hold);
  }

  /** True when the hold owns this enemy's update (victim frozen, or holder scripted). */
  tickEnemySide(world: BeltWorld, enemy: Fighter, directive: EnemyDirective | undefined): boolean {
    const hold = this.hold;
    if (hold?.byPlayer && hold.victim === enemy) { if (enemy.hitStop > 0) enemy.hitStop -= 1; return true; }
    if (hold && !hold.byPlayer && hold.holder === enemy) {
      const p = world.player;
      if (enemy.hp <= 0 || enemy.state === 'hit' || enemy.state === 'knockdown' || p.hp <= 0) { this.release(false); return false; }
      hold.frames += 1;
      if (enemy.state === 'attack') {
        if (directive) enemy.updateAiDirected(p, world.rules, directive); else enemy.updateAi(p, world.rules);
      } else if (hold.knees < 2 && hold.frames % 30 === 16) {
        hold.knees += 1;
        this.stats.enemyKnees += 1;
        enemy.setGrabPose(false);
        enemy.startMove(kneeMove(false, enemy.character.power, 'lk'));
      } else if (hold.frames >= 84) {
        this.throwHeld(world, false);
        return true;
      } else enemy.setGrabPose(true);
      if (this.hold) this.pin(this.hold);
      return true;
    }
    if (!hold) this.maybeEnemyGrab(world, enemy, directive?.attackAllowed === true);
    return !!this.hold && !this.hold.byPlayer && this.hold.holder === enemy;
  }

  private maybeEnemyGrab(world: BeltWorld, enemy: Fighter, attackAllowed: boolean): void {
    const def = gruntById(enemy.character.id);
    const p = world.player;
    if (!def?.grabsPlayer || world.isHumanEnemy(enemy) || enemy.airborne || (enemy.state !== 'idle' && enemy.state !== 'walk')) return;
    const cooldown = this.grabCooldown.get(enemy.uid) ?? 90;
    if (cooldown > 0) { this.grabCooldown.set(enemy.uid, cooldown - 1); return; }
    if (!attackAllowed) return;
    if (Math.abs(enemy.x - p.x) > 70 || Math.abs(enemy.y - p.y) > 24 || !p.canBeThrown() || p.isInvulnerable() || p.isMoveActive() || p.airborne) return;
    if (((enemy.uid * 31 + this.frame * 7) % 100) >= 9) return;
    this.grabCooldown.set(enemy.uid, 240);
    enemy.facing = p.x >= enemy.x ? 1 : -1;
    this.hold = { holder: enemy, victim: p, frames: 0, knees: 0, mash: 0, byPlayer: false, limit: 84, queued: null };
    this.stats.enemyGrabs += 1;
    heldFighters.add(p);
    enemy.setGrabPose(true);
    world.events.push({ type: 'grab', x: (p.x + enemy.x) / 2, y: p.y - 120, power: 0, ttl: 34, label: 'GRABBED! MASH!' });
    this.pin(this.hold);
  }

  private pin(hold: GrabHold): void {
    const { holder, victim } = hold;
    if (victim.state === 'knockdown' || victim.state === 'ko') return;
    // Just outside the body-separation gap so collision never drags the pair.
    const x = holder.x + holder.facing * 60;
    victim.setHeld(x, holder.y, holder.facing === 1 ? -1 : 1);
  }

  private release(preserveVictimReaction: boolean): void {
    const hold = this.hold;
    if (!hold) return;
    heldFighters.delete(hold.victim);
    hold.holder.setGrabPose(false);
    if (!preserveVictimReaction && hold.victim.state === 'hit' && hold.victim.hp > 0) hold.victim.releaseHeld();
    this.hold = null;
    this.grabCooldown.set(hold.holder.uid, 200);
  }

  private breakFree(world: BeltWorld, escaper: Fighter, other: Fighter, label: string): void {
    if (this.hold?.byPlayer) this.stats.breakFrees += 1;
    this.release(false);
    const away: 1 | -1 = escaper.x >= other.x ? 1 : -1;
    escaper.throwEscaped(away);
    other.throwEscaped(away === 1 ? -1 : 1);
    world.events.push({ type: 'throw-escape', x: (escaper.x + other.x) / 2, y: escaper.y - 100, power: 0, ttl: 24, label });
  }

  private throwHeld(world: BeltWorld, back: boolean): void {
    const hold = this.hold;
    if (!hold) return;
    const { holder, victim } = hold;
    this.release(false);
    const dir: 1 | -1 = back ? (holder.facing === 1 ? -1 : 1) : holder.facing;
    if (back) { victim.x = holder.x + dir * 36; holder.facing = dir; }
    const move = throwMove(back, holder.character.power);
    const hpBefore = victim.hp;
    victim.receiveHit(move, holder, false, false, dir);
    world.registerComboHit(holder, hpBefore - victim.hp, victim);
    holder.startMove({ ...move, id: `${move.id}_ANIM` });
    holder.beginThrowSync('attacker', victim.uid, dir, 24, holder.character.id);
    if (victim === world.player) victim.beginThrowSync('victim', holder.uid, dir, 24, holder.character.id);
    if (victim.hp > 0) { victim.airborne = true; victim.jumpHeight = Math.max(victim.jumpHeight, 26); victim.jumpVelocity = 7.4; }
    this.flying.push({ body: victim, thrower: holder, dir, frames: 30, damage: Math.round(move.damage * .7), hit: new Set() });
    if (holder === world.player) { if (back) this.stats.backThrows += 1; else this.stats.frontThrows += 1; } else this.stats.enemyThrows += 1;
    world.events.push({ type: 'hit', x: victim.x, y: victim.y - 96, power: move.damage, ttl: 18, label: move.label, color: move.color, attackerSide: holder.side, moveId: move.id });
    if (victim.hp <= 0) world.events.push({ type: 'ko', x: victim.x, y: victim.y - 130, power: 999, ttl: 90 });
  }

  /** A weapon strike connected (hit or block): wear the weapon down. */
  onAttackerContact(world: BeltWorld, attacker: Fighter, move: MoveData): void {
    if (attacker !== world.player || !move.id.startsWith('WEAPON_') || move.id.startsWith('WEAPON_TOSS')) return;
    const weapon = heldWeapons.get(attacker);
    if (!weapon) return;
    this.stats.weaponHits += 1;
    weapon.durability -= 1;
    if (weapon.durability <= 0) {
      heldWeapons.delete(attacker);
      this.stats.weaponBreaks += 1;
      world.events.push({ type: 'pickup', x: attacker.x + attacker.facing * 60, y: attacker.y - 110, power: 0, ttl: 40, label: `${PICKUP_LABELS[weapon.kind]} BROKE`, color: '#ff9c7a' });
    }
  }

  /** Outside hits break an enemy hold. Heavy hits also drop a held weapon. */
  onPlayerHit(world: BeltWorld, move: MoveData, attacker: Fighter): void {
    const p = world.player;
    if (this.hold?.victim === p && this.hold.holder !== attacker) this.release(true);
    const weapon = heldWeapons.get(p);
    if (!weapon || !(move.knockdown || move.level === 'throw' || move.damage >= 45 || p.state === 'knockdown' || p.hp <= 0)) return;
    heldWeapons.delete(p);
    this.stats.weaponDrops += 1;
    this.spawnPickup(weapon.kind, p.x, p.y, weapon.durability, -p.facing * 2.2);
  }

  onMoveStarted(fighter: Fighter): void { if (fighter.currentMove?.id.startsWith('WEAPON_TOSS')) this.stats.weaponTosses += 1; }

  afterUpdate(world: BeltWorld, preservePickupLife = false): void {
    this.frame += 1;
    // Thrown bodies travel and bowl over everyone they pass through (thrower's crowd damage).
    for (let i = 0; i < this.flying.length; i += 1) {
      const f = this.flying[i]!;
      f.frames -= 1;
      const step = f.frames > 0 ? 8.5 : 0;
      const nextX = f.body.x + f.dir * step;
      const clamped = Math.max(world.rules.arenaLeft, Math.min(world.rules.arenaRight, nextX));
      f.body.x = clamped;
      if (clamped !== nextX && f.frames > 0) {
        f.frames = 0;
        f.body.hp = Math.max(0, f.body.hp - 14);
        world.events.push({ type: 'wall-impact', x: f.body.x, y: f.body.y - 80, power: 90, ttl: 22 });
      }
      const victims = f.thrower === world.player ? world.livingEnemies : [];
      for (const other of victims) {
        if (other === f.body || f.hit.has(other.uid) || f.frames <= 0) continue;
        if (Math.abs(other.x - f.body.x) > 64 || Math.abs(other.y - f.body.y) > 40 || other.isInvulnerable()) continue;
        f.hit.add(other.uid);
        const before = other.hp;
        if (this.hold?.victim === other) this.release(false);
        other.receiveThrownCollision(f.damage, f.dir);
        world.registerComboHit(f.thrower, before - other.hp, other);
        this.stats.crowdHits += 1;
        world.events.push({ type: 'enemy-collision', x: (other.x + f.body.x) / 2, y: other.y - 84, power: f.damage, ttl: 24 });
        if (other.hp <= 0) world.events.push({ type: 'ko', x: other.x, y: other.y - 130, power: 999, ttl: 90 });
      }
      if (f.frames <= 0) { this.flying.splice(i, 1); i -= 1; }
    }
    // Scoring and enemy weapon drops.
    for (const enemy of world.enemies) {
      if (enemy.hp > 0 || this.creditedKos.has(enemy.uid)) continue;
      this.creditedKos.add(enemy.uid);
      const def = gruntById(enemy.character.id);
      this.score += def?.score ?? 800;
      if (def?.carries) { this.spawnPickup(def.carries, enemy.x, enemy.y, WEAPON_DURABILITY[def.carries], enemy.facing * -1.6); this.stats.drops += 1; }
      if (this.hold && (this.hold.victim === enemy || this.hold.holder === enemy)) this.release(false);
    }
    // Breakables drop their item.
    for (const prop of world.props) {
      if (!prop.broken || this.droppedProps.has(prop.id)) continue;
      this.droppedProps.add(prop.id);
      this.spawnPickup(propDropFor(prop), prop.x, Math.min(world.rules.arenaBottom, Math.max(world.rules.arenaTop, prop.y + 6)), undefined, 1.4);
      this.stats.drops += 1;
      this.score += 200;
    }
    for (let i = 0; i < this.pickups.length; i += 1) {
      const item = this.pickups[i]!;
      if (!preservePickupLife) item.age += 1;
      if (item.z > 0 || item.vz > 0) {
        item.vz -= .55;
        item.z = Math.max(0, item.z + item.vz);
        item.x = Math.max(world.rules.arenaLeft, Math.min(world.rules.arenaRight, item.x + item.vx));
        if (item.z === 0) { item.vz = Math.abs(item.vz) > 3 ? Math.abs(item.vz) * .35 : 0; item.vx *= .4; }
      }
      if (item.age >= item.life) { this.pickups.splice(i, 1); i -= 1; }
    }
    if (this.hold) this.pin(this.hold);
  }

  reset(): void {
    if (this.hold) this.release(false);
    this.flying.length = 0;
    this.contactFrames = 0;
    this.contactUid = null;
  }
}
