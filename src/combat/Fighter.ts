import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import { aiTuning, type AiLevelTuning } from './AiDifficulty.js';
import type { InputManager } from '../input/InputManager.js';
import type { EnemyDirective, FighterState, HitZone, ModeRules, MoveButton, MoveData } from './CombatTypes.js';
import { enemyAiProfile, type EnemyAiProfile, type EnemyArchetypeId } from './EnemyArchetypes.js';
import { InputBuffer } from './InputBuffer.js';
import { normalFor, specialMovesFor, superArtMoveFor, throwMoveFor } from './MoveLibrary.js';
import { airNormalFor, commandNormalFor, targetComboFollowUp } from './TechniqueLibrary.js';
import { combatProfileFor, type CharacterCombatProfile } from './CharacterCombatProfiles.js';

let nextFighterUid = 1;
const HITSTOP_CANCEL_BUFFER_TICKS = 6;
const FROZEN_ACTION_BUFFER_TICKS = 6;
type PendingFrozenAction = { airborne: boolean; epoch: number | undefined; tick: number } & (
  { kind: 'attack'; move: MoveData } | { kind: 'jump'; button: MoveButton | null } | { kind: 'dash'; direction: 1 | -1 }
);
const pendingFrozenActions = new WeakMap<Fighter, PendingFrozenAction>();

// --- V082: SF3-style stun gauge, dizzy and wake-up -------------------------------------------
export const STUN_MAX_BASE = 100;
export const STUN_DECAY_DELAY = 90;
export const STUN_DECAY_PER_FRAME = .4;
export const DIZZY_FRAMES = 150;
export const DIZZY_MASH_FRAMES = 5;
export const WAKE_INVULN_FRAMES = 8;
export const QUICK_RISE_REMAINING = 10;
export const QUICK_RISE_INPUT_WINDOW = 20;
export const TECH_ROLL_FRAMES = 12;
export const TECH_ROLL_SPEED = 5;
export const WAKE_REVERSAL_BUFFER = 8;

/** Stun added by a clean hit: normals/specials build it fastest, throws less, supers very little (SF3 feel). */
export function stunGainFor(move: Pick<MoveData, 'damage' | 'superCost' | 'level' | 'kind'>, counter = false): number {
  const factor = move.superCost ? .08 : move.level === 'throw' || move.kind === 'throw' ? .14 : .2;
  return move.damage * factor * (counter ? 1.25 : 1);
}

/** SF-style combo scaling: first two hits full damage, then -10% per hit, floored (supers keep more). */
export function comboDamageScale(hitInCombo: number, move: Pick<MoveData, 'superCost'>): number {
  const scaled = 1 - Math.max(0, hitInCombo - 2) * .1;
  return Math.max(move.superCost ? .5 : .3, Math.min(1, scaled));
}

/** Chip damage on block: specials (no button) and supers chip; normals and throws never do. */
export function chipDamageFor(move: Pick<MoveData, 'button' | 'kind' | 'level' | 'damage' | 'superCost'>): number {
  if (move.button || move.kind === 'throw' || move.level === 'throw') return 0;
  return Math.max(1, Math.round(move.damage * (move.superCost ? .25 : .15)));
}


interface StunWakeState {
  stun: number; stunDecayDelay: number; stunEnabled: boolean; stunLocked: boolean; pendingDizzy: boolean;
  dizzy: boolean; dizzyCount: number; wakeInvulnFrames: number; quickRiseUsed: boolean; quickRiseCount: number;
  knockdownGroundFrames: number; techRollFrames: number; techRollDirection: 1 | -1; wakeReversal: MoveData | null;
}
const stunWakeStates = new WeakMap<object, StunWakeState>();
function sw(fighter: object): StunWakeState {
  let state = stunWakeStates.get(fighter);
  if (!state) {
    state = { stun: 0, stunDecayDelay: 0, stunEnabled: true, stunLocked: false, pendingDizzy: false, dizzy: false, dizzyCount: 0,
      wakeInvulnFrames: 0, quickRiseUsed: false, quickRiseCount: 0, knockdownGroundFrames: 0, techRollFrames: 0, techRollDirection: 1, wakeReversal: null };
    stunWakeStates.set(fighter, state);
  }
  return state;
}


/** Projectile the duel brain is watching (CombatWorld feeds the nearest incoming one each frame). */
export interface AiProjectileThreat { key: object; x: number; y: number; vx: number }
export interface AiBrainStats { fireballJump: number; fireballBlock: number; fireballParry: number; fireballCounter: number; antiAir: number; antiAirNormal: number; whiffPunish: number; footsieSteps: number }
interface AiBrain {
  level: number; tuning: AiLevelTuning;
  threat: AiProjectileThreat | null; threatKey: object | null; threatFrames: number; threatDecided: boolean; parryArmed: boolean; guardFrames: number;
  jumpActive: boolean; jumpFrames: number; jumpDecided: boolean;
  whiffKey: string; whiffFrames: number; whiffDecided: boolean; whiffCommitted: boolean;
  driftFrames: number; driftDirection: -1 | 0 | 1; airAttackDone: boolean;
  footsieFrames: number; footsieDirection: -1 | 0 | 1;
  stats: AiBrainStats;
}
const aiBrains = new WeakMap<object, AiBrain>();
function brain(fighter: object): AiBrain {
  let b = aiBrains.get(fighter);
  if (!b) {
    b = { level: 0, tuning: aiTuning(0), threat: null, threatKey: null, threatFrames: 0, threatDecided: false, parryArmed: false, guardFrames: 0,
      jumpActive: false, jumpFrames: 0, jumpDecided: false, whiffKey: '', whiffFrames: 0, whiffDecided: false, whiffCommitted: false,
      driftFrames: 0, driftDirection: 0, airAttackDone: false, footsieFrames: 0, footsieDirection: 0,
      stats: { fireballJump: 0, fireballBlock: 0, fireballParry: 0, fireballCounter: 0, antiAir: 0, antiAirNormal: 0, whiffPunish: 0, footsieSteps: 0 } };
    aiBrains.set(fighter, b);
  }
  return b;
}

export class Fighter {
  readonly uid = nextFighterUid++;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  facing: 1 | -1;
  state: FighterState = 'idle';
  stateFrame = 0;
  // Visual elapsed ticks survive move/state resets and pause with combat freeze.
  animationFrame = 0;
  // The first attack in a continuous chain owns entry blending, even after cancels.
  attackAnimationStartFrame = -1;
  // Only naturally completed moves own the attack-to-neutral visual settle.
  attackRecoveryAnimationFrame = -1;
  // null preserves manual previews; -1 means a real landing settle was cancelled.
  landingNeutralAnimationFrame: number | null = null;
  // Visual landing eligibility belongs to the same accepted attack-entry clock.
  attackLandingFrames = 0;
  // Accepted attack entry owns momentum eligibility across skipped renders and cancels.
  attackMovementEntry = false;
  // Standing attack entry can follow crouch even if no crouch frame was rendered.
  attackCrouchEntry = false;
  // Visual-only: touchdown completed during this accepted move.
  attackHasLanded = false;
  // Visual-only eligibility for the first attack after a completed parry.
  parryFollowupAnimationFrame = -1;
  // Visual-only crouch transition: -1 is inactive, 0–5 lower into the hold.
  crouchAnimationFrame = -1;
  hp = 1000;
  maxHp = 1000;
  superGauge = 0;
  installFrames = 0;
  installPowerScale = 1;
  installFrameScale = 1;
  installMoveScale = 1;
  installLabel = '';
  currentMove: MoveData | null = null;
  // Visual continuity after a move ends in flight; never extends its combat lock.
  visualRecoveryMoveId: string | null = null;
  moveFrame = 0;
  attackConnected = false;
  private pendingHitStopCancel: { kind: 'special' | 'normal'; move: MoveData; from: MoveData; epoch: number | undefined; tick: number } | null = null;
  readonly attackVictims = new Set<number>();
  readonly attackPropVictims = new Set<string>();
  readonly attackVictimFrames = new Map<number, number>();
  readonly attackVictimHits = new Map<number, number>();
  moveEffectTriggered = false;
  moveStartAnnounced = false;
  hitStop = 0;
  parryWindow = 0;
  lowParryWindow = 0;
  redParryWindow = 0;
  hitFlash = 0;
  aiCooldown = 0;
  aiTempoScale = 1;
  aiSuperBias = 0;
  aiCornerPressureCount = 0;
  aiAirChaseCount = 0;
  aiCornerPressureFrames = 0;
  jumpHeight = 0;
  jumpVelocity = 0;
  airborne = false;
  juggleHits = 0;
  // ES private fields stay out of serialized fighter snapshots used by determinism fixtures.
  #comboHitsTaken = 0;
  #lastComboHitKey = '';
  /** Hits taken in the current uninterrupted hit/juggle chain (drives SF-style damage scaling). */
  get comboHitsTaken(): number { return this.#comboHitsTaken; }
  // Stun / dizzy / wake-up state lives in a module WeakMap (excluded from serialized determinism snapshots).
  get stun(): number { return sw(this).stun; }
  get stunMax(): number { return Math.round(STUN_MAX_BASE * this.combatProfile.healthScale); }
  get stunRatio(): number { return Math.max(0, Math.min(1, sw(this).stun / Math.max(1, this.stunMax))); }
  get stunEnabled(): boolean { return sw(this).stunEnabled; }
  get dizzy(): boolean { return sw(this).dizzy && this.state === 'hit'; }
  get dizzyFramesRemaining(): number { return this.dizzy ? Math.max(0, -this.stateFrame) : 0; }
  get dizzyCount(): number { return sw(this).dizzyCount; }
  get quickRiseCount(): number { return sw(this).quickRiseCount; }
  get wakeInvulnerableFrames(): number { return sw(this).wakeInvulnFrames; }
  get techRolling(): boolean { return sw(this).techRollFrames > 0; }
  setStunEnabled(enabled: boolean): void { sw(this).stunEnabled = enabled; if (!enabled) { sw(this).stun = 0; sw(this).pendingDizzy = false; } }
  /** Duel AI difficulty level (0 = legacy AI, 1 easiest .. 6 hardest). */
  setAiLevel(level: number): void { const b = brain(this); b.tuning = aiTuning(level); b.level = b.tuning.level; }
  get aiLevel(): number { return brain(this).level; }
  get aiBrainStats(): AiBrainStats { return { ...brain(this).stats }; }
  /** Fed by CombatWorld each frame with the nearest projectile flying at this fighter (or null). */
  observeProjectileThreat(threat: AiProjectileThreat | null): void { brain(this).threat = threat; }
  /** True while the duel brain has decided to hold guard (e.g. against a fireball). */
  get aiHoldingGuard(): boolean { return brain(this).guardFrames > 0; }
  get aiGuardBonus(): number { return brain(this).tuning.guardBonus; }
  /** Downed fighters and the first frames after rising cannot be hit (SF wake-up rule); juggled bodies still can. */
  isInvulnerable(): boolean {
    if (this.hp <= 0) return false;
    // Paired throw / super-victim cinematics stay hittable so scripted follow-ups still connect.
    const downed = this.state === 'knockdown' && !this.airborne && this.throwSyncFrames <= 0 && this.superVictimFrames <= 0;
    return downed || sw(this).wakeInvulnFrames > 0;
  }
  wallBounceFrames = 0;
  groundBounceFrames = 0;
  landingFrames = 0;
  throwEscapeFrames = 0;
  dashFrames = 0;
  dashDirection: 1 | -1 = 1;
  // Visual intent survives coordinate clamping and frozen updates.
  walkDirection: -1 | 0 | 1 = 0;
  // Walking starts independently of idle/combat time; null supports untouched pose previews.
  walkAnimationFrame: number | null = null;
  private lastWalkAnimationTick = -1;
  private lastWalkAnimationKind: 'walk' | 'walk-back' | null = null;
  lastHitDirection: 1 | -1 = 1;
  lastHitReaction: 'high' | 'mid' | 'low' | 'launch' | 'throw' = 'mid';
  lastHitZone: HitZone = 'torso';
  lastHitPower = 0;
  knockdownAnimationDuration = 0;
  hitAnimationDuration = 0;
  parryAnimationDuration = 0;
  guardAnimationDuration = 0;
  throwSyncFrames = 0;
  throwSyncTotal = 0;
  throwSyncRole: 'attacker' | 'victim' | null = null;
  throwSyncPartnerUid: number | null = null;
  throwSyncDirection: 1 | -1 = 1;
  throwSyncStyle = 'RYU';
  superVictimFrames = 0;
  superVictimTotal = 0;
  superVictimMotif = '';
  superVictimDirection: 1 | -1 = 1;
  superVictimHitIndex = 1;
  superVictimHitTotal = 1;
  visualHitSequenceIndex = 1;
  visualHitSequenceTotal = 1;
  visualHitSequenceFrames = 0;
  visualHitSequenceTotalFrames = 0;
  readonly buffer = new InputBuffer();
  readonly aiProfile: EnemyAiProfile;
  readonly combatProfile: CharacterCombatProfile;

  constructor(
    readonly character: CharacterDef,
    readonly side: 'player' | 'enemy',
    x: number,
    y: number,
    facing: 1 | -1,
    readonly selectedSuperArt?: SuperArtDef,
    aiArchetype: EnemyArchetypeId = 'brawler',
  ) {
    this.aiProfile = enemyAiProfile(aiArchetype);
    this.combatProfile = combatProfileFor(character.id);
    this.maxHp = Math.round(1000 * this.combatProfile.healthScale);
    this.hp = this.maxHp;
    this.x = x;
    this.y = y;
    this.previousX = x;
    this.previousY = y;
    this.facing = facing;
  }

  get superStockCost(): number { return this.selectedSuperArt?.gauge ?? 100; }
  get superGaugeMax(): number { return this.selectedSuperArt ? this.selectedSuperArt.gauge * this.selectedSuperArt.stocks : 100; }
  get superStocksReady(): number { return Math.floor(this.superGauge / this.superStockCost); }

  private selectedSuperMove(): MoveData {
    return this.selectedSuperArt
      ? superArtMoveFor(this.character.id, this.selectedSuperArt.id, this.selectedSuperArt.gauge)
      : specialMovesFor(this.character.id).super;
  }

  captureInput(input: InputManager, tick: number, superFrozen = false, rules?: ModeRules): void {
    const latest = this.buffer.latest();
    const pending = this.pendingHitStopCancel;
    // A contiguous super-freeze capture pauses combat, not input ownership.
    // Do not extend across missed captures (scene pause) or a new focus epoch.
    if (superFrozen && pending && latest && tick === latest.tick + 1
      && pending.from === this.currentMove && pending.epoch === input.historyEpoch) pending.tick += 1;
    const attack = pendingFrozenActions.get(this);
    if (superFrozen && attack && latest && tick === latest.tick + 1
      && attack.epoch === input.historyEpoch) attack.tick += 1;
    this.buffer.capture(input, tick);
    if (superFrozen) {
      this.bufferFrozenCancel(input, rules);
      if (rules) this.bufferFrozenAction(input, rules);
    }
  }

  updatePlayer(input: InputManager, rules: ModeRules): void {
    const movementEntry = !this.airborne && (this.dashFrames > 0 || Math.abs(this.x - this.previousX) > 4.6);
    this.previousX = this.x;
    this.previousY = this.y;
    if (this.hitStop > 0) {
      this.bufferFrozenCancel(input, rules);
      this.bufferFrozenAction(input, rules);
      this.hitStop -= 1;
      return;
    }
    this.animationFrame += 1;
    const wasAirborne = this.airborne;
    this.updateAir();
    this.tickCrouchAnimation(!rules.depthMovement && input.held('down'));
    this.tickWindows(false, wasAirborne && !this.airborne);
    const bufferedAction = this.takeFrozenAction(input);

    const forwardAction = this.facing === 1 ? 'right' : 'left';
    if (input.pressed(forwardAction) && !input.held(this.facing === 1 ? 'left' : 'right') && this.canDefend()) {
      if (this.state === 'block') this.redParryWindow = 3;
      else this.parryWindow = 6;
    }
    if (input.pressed('down') && this.canDefend()) this.lowParryWindow = 6;

    this.tickStunAndWake(rules);
    if (this.state === 'hit' || this.state === 'block' || this.state === 'parry' || this.state === 'knockdown' || this.state === 'victory' || this.state === 'ko') {
      const retainLowDefense = !rules.depthMovement && input.held('down') && (this.state === 'block' || this.state === 'parry');
      this.readLockedStateInput(input);
      const wasKnockdown = this.state === 'knockdown';
      this.advanceLockedState();
      if (wasKnockdown && this.state !== 'knockdown' && this.state !== 'hit' && sw(this).wakeReversal) {
        // Wake-up reversal: a special entered during the last frames of the knockdown comes out on the first frame up.
        const reversal = sw(this).wakeReversal as MoveData;
        sw(this).wakeReversal = null;
        this.startMove(reversal);
        return;
      }
      if (retainLowDefense && this.stateFrame === 0 && !this.airborne) {
        this.clearGroundSettles();
        this.state = 'crouch';
      }
      return;
    }

    if (this.state === 'attack') {
      if (this.attackConnected && this.currentMove && this.moveFrame >= this.currentMove.startup) {
        // A completed command owns its button before a target-combo shortcut.
        const bufferedCancel = this.takeHitStopCancel(input);
        const cancel = this.currentMove.cancelIntoSpecial ? this.readSpecialMove(input) ?? (bufferedCancel?.kind === 'special' ? bufferedCancel.move : null) : null;
        if (cancel) { this.startMove(cancel); return; }
        const targetCombo = this.readTargetCombo(input);
        if (targetCombo) { this.startMove(targetCombo); return; }
        if (this.currentMove.cancelIntoSpecial) {
          const chain = this.readChainNormal(input, rules);
          if (chain) { this.startMove(chain); return; }
        }
        if (bufferedCancel?.kind === 'normal') { this.startMove(bufferedCancel.move); return; }
      }
      const retainCrouch = !rules.depthMovement && input.held('down') && this.currentMove?.id.startsWith('2');
      this.applyMoveKinematics(rules);
      this.advanceMove();
      // Keep the held crouch on the first free frame instead of flashing upright.
      if (retainCrouch && this.currentMove === null && !this.airborne) {
        this.clearGroundSettles();
        this.state = 'crouch';
      }
      return;
    }

    const freshJump = input.pressed('jump') || (!rules.depthMovement && input.pressed('up'));
    const freshAttack = !this.airborne && freshJump ? null : this.readMove(input, rules);
    const freshDash = !this.airborne && this.dashFrames === 0 && !freshJump && !freshAttack ? this.readDash(input) : 0;
    const queuedJump = bufferedAction?.kind === 'jump' && !freshAttack && !freshDash;
    const jumpPressed = freshJump || queuedJump;
    if (!this.airborne && jumpPressed) {
      this.clearGroundSettles();
      this.clearThrowSync();
      this.visualRecoveryMoveId = null;
      this.dashFrames = 0;
      this.airborne = true;
      this.jumpVelocity = this.combatProfile.jumpVelocity;
      this.state = 'jump';
      this.stateFrame = 0;
      const airAttack = this.readMove(input, rules) ?? (!freshJump && bufferedAction?.kind === 'jump' && bufferedAction.button
        ? airNormalFor(this.character.id, bufferedAction.button) : null);
      if (airAttack) this.startMove(airAttack);
      return;
    }

    const attack = freshAttack ?? (!freshDash && bufferedAction?.kind === 'attack' ? bufferedAction.move : null);
    if (attack) { this.dashFrames = 0; this.startMove(attack, movementEntry); return; }

    if (!this.airborne && this.dashFrames > 0) {
      const dashSpeed = 8.2 * this.character.speed * this.combatProfile.walkScale;
      this.walkDirection = this.dashDirection;
      this.x += this.dashDirection * dashSpeed;
      this.dashFrames -= 1;
      this.state = 'walk';
      this.stateFrame += 1;
      this.clamp(rules);
      this.tickWalkAnimation();
      return;
    }
    if (!this.airborne) {
      const queuedDash = bufferedAction?.kind === 'dash' && !input.pressed('left') && !input.pressed('right')
        && !input.held(bufferedAction.direction === 1 ? 'left' : 'right') ? bufferedAction.direction : 0;
      const dash = freshDash || queuedDash;
      if (dash) { this.startDash(dash); this.clamp(rules); return; }
    }

    if (!rules.depthMovement && input.held('down') && !this.airborne) {
      this.clearGroundSettles();
      this.walkDirection = 0;
      this.state = 'crouch';
      this.stateFrame += 1;
      this.clamp(rules);
      this.tickWalkAnimation();
      return;
    }

    const moveSpeed = 4.3 * this.character.speed * this.combatProfile.walkScale * this.installMoveScale;
    const horizontalDirection = Number(input.held('right')) - Number(input.held('left'));
    let moved = horizontalDirection !== 0;
    if (horizontalDirection !== 0) this.x += horizontalDirection * moveSpeed;
    this.walkDirection = horizontalDirection as -1 | 0 | 1;
    if (rules.depthMovement) {
      const verticalDirection = Number(input.held('down')) - Number(input.held('up'));
      if (verticalDirection !== 0) {
        this.y += verticalDirection * (moveSpeed * .68 * this.combatProfile.depthScale);
        moved = true;
      }
    }

    this.clamp(rules);
    if (this.airborne) this.state = 'jump';
    else this.state = moved ? 'walk' : 'idle';
    this.stateFrame += 1;
    this.tickWalkAnimation();
  }

  updateAi(target: Fighter, rules: ModeRules): void {
    this.updateAiDirected(target, rules, { role: 'attack', desiredX: target.x, desiredY: target.y, attackAllowed: true, rangedAllowed: true });
  }

  updateAiDirected(target: Fighter, rules: ModeRules, directive: EnemyDirective, preserveInstall = false): void {
    const movementEntry = !this.airborne && (this.dashFrames > 0 || Math.abs(this.x - this.previousX) > 4.6);
    this.previousX = this.x;
    this.previousY = this.y;
    if (this.hitStop > 0) { this.hitStop -= 1; return; }
    this.animationFrame += 1;
    const wasAirborne = this.airborne;
    this.updateAir();
    this.tickCrouchAnimation(false);
    this.tickWindows(preserveInstall, wasAirborne && !this.airborne);
    if (this.aiCooldown > 0) this.aiCooldown -= 1;
    this.tickAiBrain(target);
    this.tickStunAndWake(rules);
    if (this.state === 'hit' || this.state === 'block' || this.state === 'parry' || this.state === 'knockdown' || this.state === 'victory' || this.state === 'ko') {
      const duel = rules.mode === 'duel';
      // AI mashes out of dizzy and sometimes quick-rises (deterministic per fighter/frame, no RNG drift).
      if (this.dizzy && this.aiRoll(1) < .1) this.stateFrame = Math.min(0, this.stateFrame + DIZZY_MASH_FRAMES - 1);
      if (this.state === 'knockdown' && !this.airborne && sw(this).knockdownGroundFrames === 8 && this.aiRoll(2) < (duel ? .5 : .2)) this.quickRise(this.aiRoll(3) < .35);
      const wasKnockdown = this.state === 'knockdown';
      this.advanceLockedState();
      if (wasKnockdown && (this.state as FighterState) === 'idle' && directive.attackAllowed && Math.abs(target.x - this.x) < 150
        && Math.abs(target.y - this.y) < 48 && this.aiRoll(4) < (duel ? .35 : .1)) {
        this.facing = target.x >= this.x ? 1 : -1;
        this.startMove(specialMovesFor(this.character.id).antiAir);
      }
      return;
    }
    if (this.state === 'attack') { this.applyMoveKinematics(rules); this.advanceMove(); return; }

    const dxToPlayer = target.x - this.x;
    const dx = directive.desiredX - this.x;
    const dy = directive.desiredY - this.y;
    this.facing = dxToPlayer >= 0 ? 1 : -1;
    const playerDistance = Math.abs(dxToPlayer);
    const profile = this.aiProfile;
    const movement = 2.15 * this.character.speed * profile.moveSpeed;
    const cornerDistance = Math.min(target.x - rules.arenaLeft, rules.arenaRight - target.x);
    const targetCornered = !rules.depthMovement && cornerDistance < 118;
    const sameLane = Math.abs(target.y - this.y) < 48;
    const chaseCapable = ['KEN', 'CHUNLI', 'DUDLEY', 'IBUKI', 'YUN', 'GILL'].includes(this.character.id) || profile.moveSpeed >= 1.08;
    if (rules.mode === 'duel' && brain(this).level > 0 && directive.attackAllowed && this.smartDuelStep(target, movementEntry, playerDistance, movement, chaseCapable)) {
      this.clamp(rules);
      if (this.airborne && (this.state === 'walk' || this.state === 'idle')) this.state = 'jump';
      this.stateFrame += 1;
      this.tickWalkAnimation();
      return;
    }

    if (!this.airborne && directive.attackAllowed && this.aiCooldown === 0 && target.airborne && target.jumpHeight > 34 && playerDistance < 205 && sameLane) {
      if (chaseCapable && target.jumpHeight > 78 && playerDistance > 58) {
        this.airborne = true;
        this.jumpVelocity = Math.max(9.4, this.combatProfile.jumpVelocity * .84);
        this.startMove(airNormalFor(this.character.id, profile.throwBias > .2 ? 'hp' : 'hk'));
      } else {
        this.startMove(specialMovesFor(this.character.id).antiAir, movementEntry);
      }
      this.aiAirChaseCount += 1;
      this.aiCooldown = Math.max(12, Math.round(profile.attackCooldown * .58 / Math.max(.78, this.aiTempoScale)));
    } else if (!this.airborne && targetCornered && directive.attackAllowed && this.aiCooldown === 0 && playerDistance < Math.max(118, profile.preferredDistance + 44) && sameLane) {
      const deterministic = ((this.uid * 23 + this.stateFrame * 7 + Math.round(playerDistance * 1.7)) % 100) / 100;
      const command = this.aiCommandNormal();
      const useThrow = playerDistance < 74 && deterministic < Math.min(.62, profile.throwBias + .23);
      const useCommand = !useThrow && command && deterministic > .58;
      const pressureMove = useThrow ? throwMoveFor(this.character.id) : useCommand ? command : normalFor(deterministic < .42 ? 'mp' : 'hk', false, this.character.id);
      this.startMove(pressureMove, movementEntry);
      this.aiCornerPressureCount += 1;
      this.aiCornerPressureFrames = 42;
      this.aiCooldown = Math.max(10, Math.round(profile.attackCooldown * .62 / Math.max(.82, profile.pressure * this.aiTempoScale)));
    } else {
      this.walkDirection = 0;
      const rangedMove = specialMovesFor(this.character.id).primary;
      const movingDepth = rules.depthMovement && Math.abs(dy) > 8;
      if (movingDepth) this.y += Math.sign(dy) * Math.min(Math.abs(dy), movement * .92);
      if (Math.abs(dx) > Math.max(22, profile.preferredDistance * .22)) {
        this.walkDirection = Math.sign(dx) as -1 | 1;
        this.x += this.walkDirection * movement;
        this.state = 'walk';
      } else if (!this.airborne && directive.rangedAllowed && profile.rangedBias > 0 && !!rangedMove.projectile && this.aiCooldown === 0 && playerDistance > profile.preferredDistance * 1.25) {
        this.startMove(rangedMove, movementEntry);
        this.aiCooldown = Math.max(24, Math.round(profile.attackCooldown * (1.18 - Math.min(1, profile.rangedBias) * .22) / this.aiTempoScale));
      } else if (!this.airborne && directive.attackAllowed && this.aiCooldown === 0 && playerDistance < Math.max(92, profile.preferredDistance + 58) && sameLane) {
        const deterministic = ((this.uid * 17 + this.stateFrame * 11 + Math.round(playerDistance)) % 100) / 100;
        const useSuper = this.superGauge >= this.superStockCost && deterministic < this.aiSuperBias;
        const useThrow = !useSuper && playerDistance < 72 && deterministic < profile.throwBias + this.aiSuperBias * .25;
        const heavyThreshold = .55 + Math.min(.25, profile.pressure * .08);
        const move = useSuper ? this.selectedSuperMove() : useThrow ? throwMoveFor(this.character.id) : this.selectAiAttack(deterministic, heavyThreshold, playerDistance);
        this.startMove(move, movementEntry);
        this.aiCooldown = Math.max(14, Math.round(profile.attackCooldown / Math.max(.72, profile.pressure * this.aiTempoScale)));
      } else {
        this.state = movingDepth ? 'walk' : 'idle';
      }
    }
    this.clamp(rules);
    if (this.airborne && (this.state === 'walk' || this.state === 'idle')) this.state = 'jump';
    this.stateFrame += 1;
    this.tickWalkAnimation();
  }

  startMove(move: MoveData, movementEntry = this.dashFrames > 0 || Math.abs(this.x - this.previousX) > 4.6): void {
    if (move.exCost && this.superGauge < move.exCost) return;
    if (move.superCost && this.superGauge < move.superCost) return;
    this.clearThrowSync();
    // An accepted action replaces old victim poses without changing its flight.
    this.clearSuperVictimReaction();
    this.wallBounceFrames = 0;
    this.groundBounceFrames = 0;
    if (move.exCost) this.superGauge -= move.exCost;
    if (move.superCost) this.superGauge -= move.superCost;
    if (move.install) {
      this.installFrames = move.install.duration;
      this.installPowerScale = move.install.powerScale;
      this.installFrameScale = move.install.frameScale;
      this.installMoveScale = move.install.moveScale;
      this.installLabel = move.install.label;
    }
    const effective = this.installFrames > 0 && !move.install && move.damage > 0 ? {
      ...move,
      damage: Math.round(move.damage * this.installPowerScale),
      startup: Math.max(1, Math.round(move.startup * this.installFrameScale)),
      recovery: Math.max(2, Math.round(move.recovery * this.installFrameScale)),
    } : move;
    if (this.state !== 'attack' || this.attackAnimationStartFrame < 0) {
      this.attackAnimationStartFrame = this.animationFrame;
      // Low normals own their geometry; a later cancel must not revive a
      // ground-entry blend that the first move intentionally suppressed.
      const ownsGroundEntry = !this.airborne && !move.id.startsWith('2');
      this.attackLandingFrames = ownsGroundEntry ? this.landingFrames : 0;
      this.attackMovementEntry = ownsGroundEntry && movementEntry;
      this.attackCrouchEntry = ownsGroundEntry && this.state === 'crouch';
      if (!ownsGroundEntry) this.parryFollowupAnimationFrame = -1;
      else if (this.state === 'parry') this.parryFollowupAnimationFrame = this.animationFrame;
    }
    this.clearGroundSettles();
    this.pendingHitStopCancel = null;
    pendingFrozenActions.delete(this);
    this.attackHasLanded = false;
    this.currentMove = effective;
    this.visualRecoveryMoveId = null;
    this.parryWindow = 0;
    this.lowParryWindow = 0;
    this.redParryWindow = 0;
    this.moveFrame = 0;
    this.attackConnected = false;
    this.attackVictims.clear();
    this.attackPropVictims.clear();
    this.attackVictimFrames.clear();
    this.attackVictimHits.clear();
    this.moveEffectTriggered = false;
    this.moveStartAnnounced = false;
    this.state = 'attack';
    this.stateFrame = 0;
  }


  hasHitTarget(target: Fighter): boolean {
    const move = this.currentMove;
    if (!move?.multiHit) return this.attackVictims.has(target.uid);
    const hits = this.attackVictimHits.get(target.uid) ?? 0;
    if (hits >= move.multiHit.hits) return true;
    const lastFrame = this.attackVictimFrames.get(target.uid);
    return lastFrame !== undefined && this.moveFrame - lastFrame < move.multiHit.interval;
  }

  hitNumberFor(target: Fighter): number { return (this.attackVictimHits.get(target.uid) ?? 0) + 1; }

  markHitTarget(target: Fighter): void {
    this.attackVictims.add(target.uid);
    this.attackVictimFrames.set(target.uid, this.moveFrame);
    this.attackVictimHits.set(target.uid, (this.attackVictimHits.get(target.uid) ?? 0) + 1);
    this.attackConnected = true;
  }

  nudgeTowardLane(targetY: number, maxDistance = 2.4): void {
    const delta = targetY - this.y;
    if (Math.abs(delta) < .2) return;
    this.y += Math.sign(delta) * Math.min(Math.abs(delta), maxDistance);
  }

  isMoveActive(): boolean {
    if (this.state !== 'attack' || !this.currentMove) return false;
    return this.moveFrame >= this.currentMove.startup && this.moveFrame < this.currentMove.startup + this.currentMove.active;
  }

  canDefend(): boolean {
    if (this.airborne) return false;
    return this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'block' || this.state === 'parry';
  }

  canBeThrown(): boolean {
    if (this.airborne || this.hp <= 0 || this.throwSyncFrames > 0 || this.throwEscapeFrames > 0) return false;
    return this.state !== 'hit' && this.state !== 'knockdown' && this.state !== 'parry' && this.state !== 'ko' && this.state !== 'victory';
  }

  receiveHit(move: MoveData, attacker: Fighter, guarding: boolean, counter = false, impactDirection: 1 | -1 = attacker.facing): 'hit' | 'block' | 'parry' | 'red-parry' {
    // A combo only continues while the victim is still reeling (hitstun, juggle, bounce or OTG).
    const wasDizzy = this.dizzy;
    const stillReeling = !wasDizzy && (this.state === 'hit' || this.state === 'knockdown' || (this.airborne && this.juggleHits > 0));
    if (!stillReeling) { this.#comboHitsTaken = 0; this.#lastComboHitKey = ''; }
    const low = move.level === 'low';
    const canParry = move.level !== 'throw' && move.kind !== 'throw';
    this.lastHitDirection = impactDirection;
    this.lastHitReaction = move.level === 'throw' ? 'throw' : move.launch ? 'launch' : move.level === 'low' ? 'low' : move.level === 'high' ? 'high' : 'mid';
    this.lastHitZone = this.resolveHitZone(move);
    this.lastHitPower = Math.max(move.damage, move.pushback * 2);
    if (canParry && this.canDefend() && this.redParryWindow > 0) {
      this.enterParry(10);
      return 'red-parry';
    }
    if (canParry && this.canDefend() && ((!low && this.parryWindow > 0) || (low && this.lowParryWindow > 0))) {
      this.enterParry(8);
      return 'parry';
    }
    if (guarding && this.canDefend() && move.level !== 'throw' && !move.guardBreak) {
      this.interruptMove();
      this.clearSuperVictimReaction();
      this.state = 'block';
      this.guardAnimationDuration = move.blockStun;
      this.stateFrame = -move.blockStun;
      this.x += impactDirection * move.pushback * .3;
      this.hitStop = Math.max(this.hitStop, Math.round(move.hitStop * .55));
      // Street Fighter chip damage: blocked specials and supers still wear the guard down.
      const chip = chipDamageFor(move);
      if (chip > 0) {
        this.hp = Math.max(0, this.hp - chip);
        this.hitFlash = Math.max(this.hitFlash, 3);
        if (this.hp <= 0) { this.state = 'ko'; this.stateFrame = -90; return 'hit'; }
      }
      return 'block';
    }

    if (move.superCost) {
      this.superVictimFrames = Math.max(this.superVictimFrames, 28);
      this.superVictimTotal = Math.max(this.superVictimTotal, 28);
      this.superVictimMotif = move.superPresentation?.motif ?? 'burst';
      this.superVictimDirection = impactDirection;
      if (!move.multiHit) { this.superVictimHitIndex = 1; this.superVictimHitTotal = 1; }
    } else {
      this.clearSuperVictimReaction();
    }
    this.interruptMove();
    const juggleScale = this.airborne ? Math.max(.58, 1 - this.juggleHits * .09) : 1;
    // Hits of one multi-hit move count once, so a super is not scaled by its own hit count.
    const comboKey = `${attacker.uid}:${move.id}`;
    if (!(move.multiHit && comboKey === this.#lastComboHitKey && stillReeling)) this.#comboHitsTaken += 1;
    this.#lastComboHitKey = comboKey;
    const damage = Math.round(move.damage * (counter ? 1.12 : 1) * Math.min(juggleScale, comboDamageScale(this.#comboHitsTaken, move)));
    this.hp = Math.max(0, this.hp - damage);
    if (wasDizzy) { sw(this).dizzy = false; sw(this).stunLocked = true; }
    sw(this).wakeInvulnFrames = 0;
    sw(this).wakeReversal = null;
    if (sw(this).stunEnabled && !sw(this).stunLocked && !sw(this).pendingDizzy && this.hp > 0) {
      sw(this).stun = Math.min(this.stunMax, sw(this).stun + stunGainFor(move, counter));
      sw(this).stunDecayDelay = STUN_DECAY_DELAY;
      if (sw(this).stun >= this.stunMax) sw(this).pendingDizzy = true;
    }
    this.superGauge = Math.min(this.superGaugeMax, this.superGauge + Math.round(move.superGain * .55));
    this.hitFlash = 6;
    this.hitStop = move.hitStop;
    this.x += impactDirection * move.pushback * .45;
    if (move.launch || this.airborne) {
      this.airborne = true;
      this.juggleHits += 1;
      const launchVelocity = move.launch ? Math.max(8.4, Math.min(15.5, move.launch * .115)) : Math.max(5.8, 8.2 - this.juggleHits * .45);
      this.jumpHeight = Math.max(this.jumpHeight, 8);
      this.jumpVelocity = Math.max(this.jumpVelocity, launchVelocity);
    }
    if (this.hp <= 0) {
      this.state = 'ko';
      this.stateFrame = -90;
    } else if (move.knockdown || move.level === 'throw') {
      this.state = 'knockdown';
      this.stateFrame = -34;
      sw(this).quickRiseUsed = false;
      sw(this).knockdownGroundFrames = 0;
      this.knockdownAnimationDuration = -this.stateFrame;
    } else {
      this.state = 'hit';
      this.stateFrame = -(move.hitStun + (counter ? 3 : 0));
      this.hitAnimationDuration = -this.stateFrame;
    }
    return 'hit';
  }

  receiveThrownCollision(damage: number, direction: 1 | -1): void {
    this.interruptMove();
    this.clearSuperVictimReaction();
    this.hp = Math.max(0, this.hp - damage);
    this.hitFlash = 7;
    this.hitStop = Math.max(this.hitStop, 8);
    this.x += direction * 38;
    this.state = this.hp <= 0 ? 'ko' : 'knockdown';
    this.stateFrame = this.hp <= 0 ? -90 : -30;
    if (this.state === 'knockdown') { this.knockdownAnimationDuration = -this.stateFrame; sw(this).quickRiseUsed = false; sw(this).knockdownGroundFrames = 0; }
  }

  applyWallBounce(direction: 1 | -1, strength = 10.5): void {
    this.airborne = true;
    this.juggleHits = Math.max(1, this.juggleHits);
    this.jumpHeight = Math.max(18, this.jumpHeight);
    this.jumpVelocity = Math.max(this.jumpVelocity, strength * .72);
    this.x += direction * 46;
    this.state = this.hp <= 0 ? 'ko' : 'hit';
    this.stateFrame = this.hp <= 0 ? -90 : -18;
    this.wallBounceFrames = 18;
  }

  applyGroundBounce(strength = 8.4): void {
    this.airborne = true;
    this.juggleHits = Math.max(1, this.juggleHits);
    this.jumpHeight = 6;
    this.jumpVelocity = strength;
    this.state = this.hp <= 0 ? 'ko' : 'hit';
    this.stateFrame = this.hp <= 0 ? -90 : -16;
    this.groundBounceFrames = 16;
  }

  enterVictoryPose(): void {
    this.previousX = this.x;
    this.previousY = this.y;
    this.interruptMove();
    this.clearSuperVictimReaction();
    // Clear effects whose countdown stops once the stage enters its clear phase.
    this.hitStop = 0;
    this.hitFlash = 0;
    this.wallBounceFrames = 0;
    this.groundBounceFrames = 0;
    this.juggleHits = 0;
    this.landingFrames = 0;
    this.throwEscapeFrames = 0;
    this.crouchAnimationFrame = -1;
    this.visualHitSequenceIndex = 1;
    this.visualHitSequenceTotal = 1;
    this.visualHitSequenceFrames = 0;
    this.visualHitSequenceTotalFrames = 0;
    this.state = 'victory';
    this.stateFrame = 0;
    this.airborne = false;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
  }

  throwEscaped(pushDirection: 1 | -1): void {
    this.interruptMove();
    this.state = 'idle';
    this.stateFrame = 0;
    this.x += pushDirection * 22;
    this.hitStop = 4;
    this.throwEscapeFrames = 12;
  }

  beginThrowSync(role: 'attacker' | 'victim', partnerUid: number, direction: 1 | -1, frames = 24, style = 'RYU'): void {
    this.throwSyncRole = role;
    this.throwSyncPartnerUid = partnerUid;
    this.throwSyncDirection = direction;
    this.throwSyncStyle = style;
    this.throwSyncFrames = frames;
    this.throwSyncTotal = frames;
  }


  syncSuperVictimHit(hitIndex: number, hitTotal: number): void {
    this.superVictimHitIndex = Math.max(1, hitIndex);
    this.superVictimHitTotal = Math.max(this.superVictimHitIndex, hitTotal);
    const finisher = this.superVictimHitIndex >= this.superVictimHitTotal;
    this.superVictimFrames = finisher ? 30 : 12;
    this.superVictimTotal = this.superVictimFrames;
  }

  syncVisualHitSequence(hitIndex: number, hitTotal: number): void {
    this.visualHitSequenceIndex = Math.max(1, hitIndex);
    this.visualHitSequenceTotal = Math.max(this.visualHitSequenceIndex, hitTotal);
    const finisher = this.visualHitSequenceIndex >= this.visualHitSequenceTotal;
    const duration = finisher ? 18 : this.visualHitSequenceTotal > 1 ? 11 : 15;
    this.visualHitSequenceFrames = duration;
    this.visualHitSequenceTotalFrames = duration;
  }

  get superVictimProgress(): number {
    if (this.superVictimFrames <= 0 || this.superVictimTotal <= 0) return 1;
    return Math.max(0, Math.min(1, 1 - this.superVictimFrames / this.superVictimTotal));
  }

  get throwSyncProgress(): number {
    if (this.throwSyncFrames <= 0 || this.throwSyncTotal <= 0) return 1;
    return Math.max(0, Math.min(1, 1 - this.throwSyncFrames / this.throwSyncTotal));
  }

  private resolveHitZone(move: MoveData): HitZone {
    if (move.level === 'throw' || move.kind === 'throw') return 'throw';
    if (move.launch) return 'launch';
    if (move.level === 'low') return 'leg';
    if (move.level === 'high') return 'head';
    if (move.technique === 'air' && (move.button === 'hp' || move.button === 'hk')) return 'head';
    if (move.button === 'lk' || move.button === 'mk') return 'leg';
    return 'torso';
  }

  addAttackReward(move: MoveData): void {
    this.superGauge = Math.min(this.superGaugeMax, this.superGauge + move.superGain);
    this.hitStop = Math.max(this.hitStop, move.hitStop);
  }

  private readDash(input: InputManager): 1 | -1 | 0 {
    if (input.pressed('left') && !input.held('right') && this.buffer.doubleTap('left', 11)) return -1;
    if (input.pressed('right') && !input.held('left') && this.buffer.doubleTap('right', 11)) return 1;
    return 0;
  }

  private startDash(direction: 1 | -1): void {
    this.clearGroundSettles();
    this.clearThrowSync();
    this.visualRecoveryMoveId = null;
    this.dashDirection = direction;
    this.walkDirection = direction;
    this.dashFrames = 8;
    this.state = 'walk';
    this.stateFrame = 0;
    this.x += direction * 5;
  }

  private readMove(input: InputManager, rules: ModeRules): MoveData | null {
    const throwPressed = (input.pressed('lp') && (input.held('lk') || input.pressed('lk'))) || (input.pressed('lk') && input.held('lp'));
    if (throwPressed && !this.airborne) return throwMoveFor(this.character.id);
    const buttons: MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
    if (this.airborne) {
      for (const button of buttons) if (input.pressed(button)) return airNormalFor(this.character.id, button);
      return null;
    }
    const special = this.readSpecialMove(input);
    if (special) return special;
    const crouching = !rules.depthMovement && input.held('down');
    const forwardAction = this.facing === 1 ? 'right' : 'left';
    for (const button of buttons) {
      if (!input.pressed(button)) continue;
      // Forward command normals are standing attacks; down-forward stays crouched.
      const command = crouching ? null : commandNormalFor(this.character.id, button, input.held(forwardAction) && !input.held(this.facing === 1 ? 'left' : 'right'));
      if (command) return command;
    }
    for (const button of buttons) if (input.pressed(button)) return normalFor(button, crouching, this.character.id);
    return null;
  }

  private bufferFrozenAction(input: InputManager, rules: ModeRules): void {
    if (this.currentMove || !['idle', 'walk', 'crouch', 'jump'].includes(this.state)) return;
    const latest = this.buffer.latest();
    if (!latest) return;
    if (!this.airborne && (input.pressed('jump') || (!rules.depthMovement && input.pressed('up')))) {
      const buttons: MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
      pendingFrozenActions.set(this, {
        kind: 'jump', button: buttons.find(button => input.pressed(button)) ?? null,
        airborne: false, epoch: input.historyEpoch, tick: latest.tick,
      });
      return;
    }
    const move = this.readMove(input, rules);
    if (move) {
      pendingFrozenActions.set(this, {
        kind: 'attack', move, airborne: this.airborne, epoch: input.historyEpoch, tick: latest.tick,
      });
      return;
    }
    if (!this.airborne && this.dashFrames === 0) {
      const direction = this.readDash(input);
      if (direction) pendingFrozenActions.set(this, {
        kind: 'dash', direction, airborne: false, epoch: input.historyEpoch, tick: latest.tick,
      });
      else if ((input.pressed('left') || input.pressed('right')) && pendingFrozenActions.get(this)?.kind === 'dash') {
        pendingFrozenActions.delete(this);
      }
    }
  }

  private takeFrozenAction(input: InputManager): PendingFrozenAction | null {
    const pending = pendingFrozenActions.get(this);
    pendingFrozenActions.delete(this);
    const latest = this.buffer.latest();
    if (!pending || !latest || this.currentMove || !['idle', 'walk', 'crouch', 'jump'].includes(this.state)
      || pending.airborne !== this.airborne || pending.epoch !== input.historyEpoch
      || latest.tick < pending.tick || latest.tick - pending.tick > FROZEN_ACTION_BUFFER_TICKS) return null;
    if (pending.kind === 'attack' && ((pending.move.exCost ?? 0) > this.superGauge || (pending.move.superCost ?? 0) > this.superGauge)) return null;
    return pending;
  }

  private bufferFrozenCancel(input: InputManager, rules?: ModeRules): void {
    const from = this.currentMove;
    if (this.state !== 'attack' || !this.attackConnected || !from
      || this.moveFrame < from.startup) return;
    const special = from.cancelIntoSpecial ? this.readSpecialMove(input) : null;
    const move = special ?? this.readTargetCombo(input)
      ?? (from.cancelIntoSpecial && rules ? this.readChainNormal(input, rules) : null);
    const latest = this.buffer.latest();
    const pending = this.pendingHitStopCancel;
    // A legal special owns its command button before a later normal shortcut.
    if (!special && latest && pending?.kind === 'special' && pending.from === from
      && pending.epoch === input.historyEpoch && latest.tick >= pending.tick
      && latest.tick - pending.tick <= HITSTOP_CANCEL_BUFFER_TICKS
      && (pending.move.exCost ?? 0) <= this.superGauge
      && (pending.move.superCost ?? 0) <= this.superGauge) return;
    if (move && latest) this.pendingHitStopCancel = {
      kind: special ? 'special' : 'normal', move, from, epoch: input.historyEpoch, tick: latest.tick,
    };
  }

  private takeHitStopCancel(input: InputManager): { kind: 'special' | 'normal'; move: MoveData } | null {
    const pending = this.pendingHitStopCancel;
    this.pendingHitStopCancel = null;
    const latest = this.buffer.latest();
    if (!pending || !latest || pending.from !== this.currentMove || pending.epoch !== input.historyEpoch
      || latest.tick < pending.tick || latest.tick - pending.tick > HITSTOP_CANCEL_BUFFER_TICKS) return null;
    if ((pending.move.exCost ?? 0) > this.superGauge || (pending.move.superCost ?? 0) > this.superGauge) return null;
    return pending;
  }

  private readSpecialMove(input: InputManager): MoveData | null {
    const punchPressed = input.pressed('lp') || input.pressed('mp') || input.pressed('hp');
    const kickPressed = input.pressed('lk') || input.pressed('mk') || input.pressed('hk');
    const specials = specialMovesFor(this.character.id);
    if (punchPressed && this.buffer.motion(['D', 'DF', 'F', 'D', 'DF', 'F'], this.facing, 24) && this.superGauge >= this.superStockCost) return this.selectedSuperMove();
    if (punchPressed && this.buffer.motion(['F', 'D', 'DF'], this.facing, 14)) return specials.antiAir;
    if (punchPressed && this.buffer.motion(['D', 'DF', 'F'], this.facing, 14)) {
      const doublePunch = ['lp', 'mp', 'hp'].filter((button) => input.held(button as MoveButton) || input.pressed(button as MoveButton)).length >= 2;
      if (doublePunch && this.superGauge >= 25) return specials.exPrimary;
      return specials.primary;
    }
    if (kickPressed && this.buffer.motion(['D', 'DB', 'B'], this.facing, 14)) return specials.mobility;
    return null;
  }

  private readTargetCombo(input: InputManager): MoveData | null {
    const current = this.currentMove?.id;
    if (!current) return null;
    const buttons: MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
    for (const button of buttons) {
      if (!input.pressed(button)) continue;
      const follow = targetComboFollowUp(this.character.id, current, button);
      if (follow) return follow;
    }
    return null;
  }

  private readChainNormal(input: InputManager, rules: ModeRules): MoveData | null {
    const currentButton = this.currentMove?.button;
    if (!currentButton) return null;
    const allowed = this.combatProfile.chainRoutes[currentButton];
    if (!allowed?.length) return null;
    const crouching = !rules.depthMovement && input.held('down') && !this.airborne;
    for (const button of allowed) {
      if (input.pressed(button)) return normalFor(button, crouching, this.character.id);
    }
    return null;
  }


  private aiCommandNormal(): MoveData | null {
    const buttons: MoveButton[] = ['mp', 'mk', 'hp', 'hk', 'lp', 'lk'];
    for (const button of buttons) {
      const move = commandNormalFor(this.character.id, button, true);
      if (move) return move;
    }
    return null;
  }

  private selectAiAttack(deterministic: number, heavyThreshold: number, playerDistance: number): MoveData {
    const specials = specialMovesFor(this.character.id);
    const specialBias = this.character.id === 'GILL' ? .32 : this.character.id === 'URIEN' ? .25 : this.aiProfile.rangedBias > .5 ? .22 : .1;
    if (deterministic < specialBias && playerDistance > 82) return specials.primary;
    if (deterministic > .92 && playerDistance < 115) return specials.antiAir;
    if (deterministic > .78 && playerDistance > 105 && playerDistance < 230) return specials.mobility;
    return normalFor(deterministic < heavyThreshold ? 'mp' : 'hk', false, this.character.id);
  }

  private applyMoveKinematics(rules: ModeRules): void {
    const move = this.currentMove;
    if (!move) return;
    if (move.id.endsWith('_MOBILITY') && this.moveFrame >= move.startup && this.moveFrame < move.startup + move.active) this.x += this.facing * this.combatProfile.mobilitySpeed * this.installMoveScale;
    if (move.launch && this.moveFrame >= Math.max(1, move.startup - 1) && this.moveFrame < move.startup + move.active + 5) {
      if (!this.airborne) { this.airborne = true; this.jumpVelocity = 11.2; }
      this.x += this.facing * this.combatProfile.antiAirDrift;
    }
    this.clamp(rules);
  }

  private updateAir(): void {
    if (!this.airborne) return;
    this.jumpHeight += this.jumpVelocity;
    this.jumpVelocity -= this.combatProfile.gravity;
    if (this.jumpHeight <= 0 && this.jumpVelocity < 0) {
      this.jumpHeight = 0;
      this.jumpVelocity = 0;
      this.airborne = false;
      this.juggleHits = 0;
      this.wallBounceFrames = 0;
      this.groundBounceFrames = 0;
      this.landingFrames = 8;
      if (this.state === 'attack' && this.currentMove) this.attackHasLanded = true;
      if (this.state === 'attack' && this.currentMove?.technique === 'air') {
        this.interruptMove();
        this.state = 'idle';
        this.stateFrame = 0;
      } else if (this.state === 'jump') {
        this.state = 'idle';
        this.stateFrame = 0;
      }
      this.landingNeutralAnimationFrame = this.state === 'idle' || this.state === 'walk' ? this.animationFrame : -1;
    }
  }

  private tickWalkAnimation(): void {
    if (this.state !== 'walk' || this.airborne || this.dashFrames > 0 || this.crouchAnimationFrame >= 0) {
      this.walkAnimationFrame = null;
      this.lastWalkAnimationTick = -1;
      this.lastWalkAnimationKind = null;
      return;
    }
    const velocity = this.x - this.previousX;
    const kind = Math.sign(velocity || this.walkDirection || this.facing) === this.facing ? 'walk' : 'walk-back';
    this.walkAnimationFrame = this.lastWalkAnimationTick === this.animationFrame - 1 && kind === this.lastWalkAnimationKind
      ? (this.walkAnimationFrame ?? 0) + 1 : 0;
    this.lastWalkAnimationTick = this.animationFrame;
    this.lastWalkAnimationKind = kind;
  }

  private tickCrouchAnimation(heldDown: boolean): void {
    const eligible = this.state === 'idle' || this.state === 'walk' || this.state === 'crouch' || this.state === 'block' || this.state === 'parry'
      || (this.state === 'attack' && this.currentMove?.id.startsWith('2'));
    if (this.airborne || !eligible) { this.crouchAnimationFrame = -1; return; }
    // Keep grounded crouching attacks low until their recovery completes.
    if (this.state === 'attack' && this.currentMove?.id.startsWith('2')) { this.crouchAnimationFrame = 5; return; }
    this.crouchAnimationFrame = heldDown
      ? Math.min(5, this.crouchAnimationFrame + 1)
      : Math.max(-1, this.crouchAnimationFrame - 1);
  }

  private tickWindows(preserveInstall = false, newLanding = false): void {
    if (!preserveInstall && this.installFrames > 0) {
      this.installFrames -= 1;
      if (this.installFrames === 0) { this.installPowerScale = 1; this.installFrameScale = 1; this.installMoveScale = 1; this.installLabel = ''; }
    }
    if (this.parryWindow > 0) this.parryWindow -= 1;
    if (this.lowParryWindow > 0) this.lowParryWindow -= 1;
    if (this.redParryWindow > 0) this.redParryWindow -= 1;
    if (this.hitFlash > 0) this.hitFlash -= 1;
    if (this.wallBounceFrames > 0) this.wallBounceFrames -= 1;
    if (this.groundBounceFrames > 0) this.groundBounceFrames -= 1;
    // A new touchdown owns its first visible tick; existing windows keep aging.
    if (this.landingFrames > 0 && !newLanding) this.landingFrames -= 1;
    if (!this.airborne && this.landingFrames === 0) this.visualRecoveryMoveId = null;
    if (this.throwEscapeFrames > 0) this.throwEscapeFrames -= 1;
    if (this.visualHitSequenceFrames > 0) {
      this.visualHitSequenceFrames -= 1;
      if (this.visualHitSequenceFrames === 0) { this.visualHitSequenceIndex = 1; this.visualHitSequenceTotal = 1; this.visualHitSequenceTotalFrames = 0; }
    }
    if (this.superVictimFrames > 0) {
      this.superVictimFrames -= 1;
      if (this.superVictimFrames === 0) this.clearSuperVictimReaction();
    }
    if (this.throwSyncFrames > 0) {
      this.throwSyncFrames -= 1;
      if (this.throwSyncFrames === 0) this.clearThrowSync();
    }
    if (this.aiCornerPressureFrames > 0) this.aiCornerPressureFrames -= 1;
  }

  private clearThrowSync(): void {
    this.throwSyncFrames = 0;
    this.throwSyncTotal = 0;
    this.throwSyncRole = null;
    this.throwSyncPartnerUid = null;
    this.throwSyncStyle = 'RYU';
  }

  private clearSuperVictimReaction(): void {
    this.superVictimFrames = 0;
    this.superVictimTotal = 0;
    this.superVictimMotif = '';
    this.superVictimHitIndex = 1;
    this.superVictimHitTotal = 1;
  }

  private enterParry(frames: number): void {
    this.interruptMove();
    this.clearSuperVictimReaction();
    this.state = 'parry';
    this.parryAnimationDuration = frames;
    this.stateFrame = -frames;
    this.hitStop = 2;
    this.parryWindow = 0;
    this.lowParryWindow = 0;
    this.redParryWindow = 0;
  }

  private clearGroundSettles(): void {
    if (this.landingNeutralAnimationFrame !== null) this.landingNeutralAnimationFrame = -1;
    this.attackRecoveryAnimationFrame = -1;
  }

  private interruptMove(): void {
    this.clearGroundSettles();
    this.attackRecoveryAnimationFrame = -1;
    this.attackLandingFrames = 0;
    this.attackMovementEntry = false;
    this.attackCrouchEntry = false;
    this.pendingHitStopCancel = null;
    pendingFrozenActions.delete(this);
    this.attackHasLanded = false;
    this.parryFollowupAnimationFrame = -1;
    this.clearThrowSync();
    this.currentMove = null;
    this.visualRecoveryMoveId = null;
    this.moveFrame = 0;
    this.dashFrames = 0;
    this.attackConnected = false;
    this.attackVictims.clear();
    this.attackPropVictims.clear();
    this.attackVictimFrames.clear();
    this.attackVictimHits.clear();
    this.moveEffectTriggered = false;
    this.moveStartAnnounced = false;
  }

  private advanceMove(): void {
    if (!this.currentMove) { this.state = this.airborne ? 'jump' : 'idle'; return; }
    this.moveFrame += 1;
    this.stateFrame += 1;
    const end = this.currentMove.startup + this.currentMove.active + this.currentMove.recovery;
    if (this.moveFrame >= end) {
      // Crouch rise and airborne recovery own their poses instead of this settle.
      this.attackRecoveryAnimationFrame = !this.airborne && !this.currentMove.id.startsWith('2') ? this.animationFrame : -1;
      this.visualRecoveryMoveId = this.currentMove.id;
      this.currentMove = null;
      this.state = this.airborne ? 'jump' : 'idle';
      this.stateFrame = 0;
      if (!this.airborne && this.landingFrames === 8) this.landingNeutralAnimationFrame = this.animationFrame;
    }
  }

  /** Per-frame bookkeeping for the duel brain: threat timers, guard hold, air drift. Runs in every AI state. */
  private tickAiBrain(target: Fighter): void {
    const b = brain(this);
    if (b.level <= 0) return;
    if (b.guardFrames > 0) b.guardFrames -= 1;
    const threat = b.threat;
    if (!threat) { b.threatKey = null; b.parryArmed = false; }
    else {
      if (threat.key !== b.threatKey) { b.threatKey = threat.key; b.threatFrames = 0; b.threatDecided = false; b.parryArmed = false; }
      b.threatFrames += 1;
      if (b.parryArmed && Math.abs(threat.x - this.x) < 90) this.parryWindow = Math.max(this.parryWindow, 3);
    }
    if (target.airborne && target.jumpHeight > 6) {
      if (!b.jumpActive) { b.jumpActive = true; b.jumpFrames = 0; b.jumpDecided = false; }
      b.jumpFrames += 1;
    } else b.jumpActive = false;
    const move = target.currentMove;
    if (target.state === 'attack' && move && !target.attackConnected && target.moveFrame >= move.startup + move.active) {
      const key = `${target.attackAnimationStartFrame}:${move.id}`;
      if (key !== b.whiffKey) { b.whiffKey = key; b.whiffFrames = 0; b.whiffDecided = false; b.whiffCommitted = false; }
      b.whiffFrames += 1;
    } else if (target.state !== 'attack') { b.whiffKey = ''; b.whiffCommitted = false; }
    if (this.airborne && b.driftFrames > 0) { b.driftFrames -= 1; this.x += b.driftDirection * 3.8; }
    if (!this.airborne) { b.driftFrames = 0; b.airAttackDone = false; }
  }

  /**
   * Deterministic duel decisions layered over the archetype AI: fireball answers (counter-fireball, jump over,
   * parry, block), anti-air, whiff punishing and footsie spacing. Returns true when it acted this frame.
   */
  private smartDuelStep(target: Fighter, movementEntry: boolean, distance: number, movement: number, mobile: boolean): boolean {
    const b = brain(this), t = b.tuning;
    const specials = specialMovesFor(this.character.id);
    const toTarget: 1 | -1 = target.x >= this.x ? 1 : -1;
    // Jump-over follow-up: kick on the way down once in range.
    if (this.airborne) {
      if (b.driftFrames > 0 && !b.airAttackDone && !this.currentMove && this.jumpVelocity < 0 && distance < 120) {
        b.airAttackDone = true;
        this.startMove(airNormalFor(this.character.id, 'hk'));
        return true;
      }
      return false;
    }
    // 1) Incoming projectile.
    const threat = b.threat;
    if (threat && !b.threatDecided && b.threatFrames >= t.reactionDelay) {
      const gap = Math.abs(threat.x - this.x);
      const incoming = threat.vx !== 0 && Math.sign(threat.vx) === Math.sign(this.x - threat.x);
      if (incoming && gap < 360) {
        b.threatDecided = true;
        if (this.brainRoll(21, target) < t.fireballChance) {
          const r = this.brainRoll(22, target);
          const canCounter = !!specials.primary.projectile && gap > 150;
          const canJump = gap >= 70 && gap <= 220;
          if (canCounter && r < (mobile ? .35 : .55)) {
            this.facing = toTarget;
            this.startMove(specials.primary, movementEntry);
            b.stats.fireballCounter += 1;
            this.aiCooldown = Math.max(this.aiCooldown, 18);
            return true;
          }
          if (canJump && r < (mobile ? .8 : .62)) {
            this.facing = toTarget;
            this.airborne = true; this.jumpVelocity = this.combatProfile.jumpVelocity; this.state = 'jump'; this.stateFrame = 0;
            b.driftFrames = 30; b.driftDirection = toTarget; b.airAttackDone = false;
            b.stats.fireballJump += 1;
            return true;
          }
          if (t.canParry && r < .86) { b.parryArmed = true; b.stats.fireballParry += 1; }
          else { b.guardFrames = 50; b.stats.fireballBlock += 1; }
        }
      }
    }
    if (threat && (b.guardFrames > 0 || b.parryArmed)) {
      // Hold position while guarding / waiting to parry the shot.
      this.walkDirection = 0; this.state = 'idle';
      return true;
    }
    // 2) Anti-air against jump-ins.
    if (b.jumpActive && !b.jumpDecided && b.jumpFrames >= Math.max(3, Math.round(t.reactionDelay * .6))) {
      const approaching = Math.sign(target.x - target.previousX) === -toTarget || distance < 110;
      if (approaching && distance < 175 && Math.abs(target.y - this.y) < 48) {
        b.jumpDecided = true;
        if (this.brainRoll(23, target) < t.antiAirChance) {
          this.facing = toTarget;
          if (distance < 90 && this.brainRoll(24, target) < .45) { this.startMove(normalFor('hp', true, this.character.id), movementEntry); b.stats.antiAirNormal += 1; }
          else { this.startMove(specials.antiAir, movementEntry); b.stats.antiAir += 1; }
          this.aiCooldown = Math.max(this.aiCooldown, 14);
          return true;
        }
      }
    }
    // 3) Whiff punish: target missed and is still recovering. Commit once per whiff, then step in and hit.
    const whiff = target.currentMove;
    if (b.whiffKey && whiff && b.whiffFrames >= Math.max(2, Math.round(t.reactionDelay * .5))) {
      if (!b.whiffDecided) { b.whiffDecided = true; b.whiffCommitted = this.brainRoll(25, target) < t.whiffPunishChance; }
      const remaining = whiff.startup + whiff.active + whiff.recovery - target.moveFrame;
      if (b.whiffCommitted && remaining > 2) {
        const reach = (m: MoveData) => m.hitbox.forward * this.character.reach - 6;
        const options = [normalFor('mk', true, this.character.id), normalFor('hk', false, this.character.id), normalFor('mp', false, this.character.id), normalFor('lk', true, this.character.id)];
        const punish = options.find((m) => m.startup + m.active > 0 && m.startup + 1 < remaining && distance <= reach(m));
        this.facing = toTarget;
        if (punish) {
          this.startMove(punish, movementEntry);
          b.whiffCommitted = false;
          b.stats.whiffPunish += 1;
          this.aiCooldown = Math.max(this.aiCooldown, 12);
          return true;
        }
        const closest = Math.max(...options.map(reach));
        if (remaining > 7 && distance > closest) {
          this.walkDirection = toTarget; this.x += toTarget * movement * 1.25; this.state = 'walk';
          return true;
        }
      }
    }
    // 4) Footsies: while the archetype AI is cooling down, dance at the edge of poke range instead of walking in.
    const preferred = this.aiProfile.preferredDistance;
    if (t.footsies && this.aiCooldown > 0 && distance > 60 && distance < preferred + 110) {
      if (b.footsieFrames <= 0) {
        const r = this.brainRoll(31, target);
        b.footsieDirection = distance < preferred * .8 ? -1 : r < .38 ? -1 : r < .58 ? 0 : 1;
        b.footsieFrames = 10 + Math.floor(this.brainRoll(32, target) * 16);
      }
      b.footsieFrames -= 1;
      const step = b.footsieDirection * toTarget;
      if (step !== 0) {
        this.walkDirection = step as -1 | 1;
        this.x += step * movement * .72;
        this.state = 'walk';
        b.stats.footsieSteps += 1;
      } else { this.walkDirection = 0; this.state = 'idle'; }
      return true;
    }
    b.footsieFrames = 0;
    return false;
  }

  /** Duel-brain roll: aiRoll mixed with both fighters' positions so different situations choose differently. */
  private brainRoll(salt: number, target: Fighter): number {
    return this.aiRoll(salt + Math.imul(Math.round(this.x) * 31 + Math.round(target.x) * 17 + Math.round(target.jumpHeight) * 7, 2654435761));
  }

  private aiRoll(salt: number): number {
    // Seeded by character + side + frame (not uid) so identically configured worlds replay identically.
    let seed = this.side === 'enemy' ? 97 : 13;
    for (let i = 0; i < this.character.id.length; i += 1) seed = Math.imul(seed ^ this.character.id.charCodeAt(i), 16777619);
    let x = Math.imul(seed, 374761393) ^ Math.imul(this.animationFrame + 7, 668265263) ^ Math.imul(salt, 2246822519);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  /** Per-frame stun decay, wake invulnerability countdown, tech-roll travel and delayed dizzy entry. */
  private tickStunAndWake(rules: ModeRules): void {
    if (sw(this).wakeInvulnFrames > 0) sw(this).wakeInvulnFrames -= 1;
    if (this.state === 'knockdown' && !this.airborne) sw(this).knockdownGroundFrames += 1;
    if (sw(this).techRollFrames > 0) {
      sw(this).techRollFrames -= 1;
      this.x += sw(this).techRollDirection * TECH_ROLL_SPEED;
      this.clamp(rules);
    }
    const reeling = this.state === 'hit' || this.state === 'knockdown' || this.airborne;
    if (!reeling && sw(this).stun > 0) {
      if (sw(this).stunDecayDelay > 0) sw(this).stunDecayDelay -= 1;
      else sw(this).stun = Math.max(0, sw(this).stun - STUN_DECAY_PER_FRAME);
    }
    if (sw(this).pendingDizzy && this.hp > 0 && !this.airborne && this.state !== 'hit' && this.state !== 'knockdown' && this.state !== 'ko' && this.state !== 'victory') this.enterDizzy();
  }

  private enterDizzy(): void {
    this.interruptMove();
    sw(this).pendingDizzy = false;
    sw(this).dizzy = true;
    sw(this).dizzyCount += 1;
    sw(this).stun = 0;
    sw(this).wakeInvulnFrames = 0;
    sw(this).wakeReversal = null;
    this.state = 'hit';
    this.stateFrame = -DIZZY_FRAMES;
    this.hitAnimationDuration = DIZZY_FRAMES;
  }

  /** Quick rise (tap down while grounded) and tech roll (down + back): stand up sooner, optionally rolling away. */
  quickRise(roll = false): boolean {
    if (this.state !== 'knockdown' || this.airborne || sw(this).quickRiseUsed || this.hp <= 0 || this.throwSyncFrames > 0) return false;
    if (sw(this).knockdownGroundFrames > QUICK_RISE_INPUT_WINDOW || this.stateFrame >= -QUICK_RISE_REMAINING) return false;
    sw(this).quickRiseUsed = true;
    sw(this).quickRiseCount += 1;
    this.stateFrame = -QUICK_RISE_REMAINING;
    if (roll) { sw(this).techRollFrames = TECH_ROLL_FRAMES; sw(this).techRollDirection = this.facing === 1 ? -1 : 1; }
    return true;
  }

  private readLockedStateInput(input: InputManager): void {
    if (this.dizzy) {
      const mash = (['lp', 'mp', 'hp', 'lk', 'mk', 'hk', 'left', 'right', 'up', 'down', 'jump'] as const).filter((action) => input.pressed(action)).length;
      if (mash > 0) this.stateFrame = Math.min(0, this.stateFrame + mash * DIZZY_MASH_FRAMES);
      return;
    }
    if (this.state !== 'knockdown' || this.airborne) return;
    if (input.pressed('down')) this.quickRise(input.held(this.facing === 1 ? 'left' : 'right'));
    if (this.stateFrame >= -WAKE_REVERSAL_BUFFER) {
      const special = this.readSpecialMove(input);
      if (special) sw(this).wakeReversal = special;
    }
  }

  private advanceLockedState(): void {
    this.stateFrame += 1;
    if (this.state === 'ko' || this.state === 'victory') return;
    if (this.stateFrame >= 0) {
      const leaving = this.state;
      const leavingDizzy = sw(this).dizzy;
      sw(this).dizzy = false;
      if (!leavingDizzy) sw(this).stunLocked = false;
      if (leaving === 'knockdown' && !sw(this).pendingDizzy) sw(this).wakeInvulnFrames = WAKE_INVULN_FRAMES;
      if (this.state === 'parry') this.parryFollowupAnimationFrame = this.animationFrame + 1;
      this.state = this.airborne ? 'jump' : 'idle';
      this.stateFrame = 0;
      if (!this.airborne && this.landingFrames === 8) this.landingNeutralAnimationFrame = this.animationFrame;
    }
  }

  private clamp(rules: ModeRules): void {
    this.x = Math.max(rules.arenaLeft, Math.min(rules.arenaRight, this.x));
    this.y = Math.max(rules.arenaTop, Math.min(rules.arenaBottom, this.y));
  }
}
