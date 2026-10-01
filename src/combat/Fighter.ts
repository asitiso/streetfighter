import type { CharacterDef, SuperArtDef } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';
import type { EnemyDirective, FighterState, HitZone, ModeRules, MoveButton, MoveData } from './CombatTypes.js';
import { enemyAiProfile, type EnemyAiProfile, type EnemyArchetypeId } from './EnemyArchetypes.js';
import { InputBuffer } from './InputBuffer.js';
import { normalFor, specialMovesFor, superArtMoveFor, throwMoveFor } from './MoveLibrary.js';
import { airNormalFor, commandNormalFor, targetComboFollowUp } from './TechniqueLibrary.js';
import { combatProfileFor, type CharacterCombatProfile } from './CharacterCombatProfiles.js';

let nextFighterUid = 1;

export class Fighter {
  readonly uid = nextFighterUid++;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  facing: 1 | -1;
  state: FighterState = 'idle';
  stateFrame = 0;
  hp = 1000;
  maxHp = 1000;
  superGauge = 0;
  installFrames = 0;
  installPowerScale = 1;
  installFrameScale = 1;
  installMoveScale = 1;
  installLabel = '';
  currentMove: MoveData | null = null;
  moveFrame = 0;
  attackConnected = false;
  readonly attackVictims = new Set<number>();
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
  wallBounceFrames = 0;
  groundBounceFrames = 0;
  landingFrames = 0;
  throwEscapeFrames = 0;
  dashFrames = 0;
  dashDirection: 1 | -1 = 1;
  lastHitDirection: 1 | -1 = 1;
  lastHitReaction: 'high' | 'mid' | 'low' | 'launch' | 'throw' = 'mid';
  lastHitZone: HitZone = 'torso';
  lastHitPower = 0;
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

  captureInput(input: InputManager, tick: number): void {
    this.buffer.capture(input, tick);
  }

  updatePlayer(input: InputManager, rules: ModeRules): void {
    this.previousX = this.x;
    this.previousY = this.y;
    this.updateAir();
    if (this.hitStop > 0) { this.hitStop -= 1; return; }
    this.tickWindows();

    const forwardAction = this.facing === 1 ? 'right' : 'left';
    if (input.pressed(forwardAction)) {
      if (this.state === 'block') this.redParryWindow = 3;
      else this.parryWindow = 6;
    }
    if (input.pressed('down') && !this.airborne) this.lowParryWindow = 6;

    if (this.state === 'hit' || this.state === 'block' || this.state === 'parry' || this.state === 'knockdown' || this.state === 'victory' || this.state === 'ko') {
      this.advanceLockedState();
      return;
    }

    if (this.state === 'attack') {
      if (this.attackConnected && this.currentMove && this.moveFrame >= this.currentMove.startup) {
        const targetCombo = this.readTargetCombo(input);
        if (targetCombo) { this.startMove(targetCombo); return; }
        if (this.currentMove.cancelIntoSpecial) {
          const cancel = this.readSpecialMove(input);
          if (cancel) { this.startMove(cancel); return; }
          const chain = this.readChainNormal(input, rules);
          if (chain) { this.startMove(chain); return; }
        }
      }
      this.applyMoveKinematics(rules);
      this.advanceMove();
      return;
    }

    const jumpPressed = input.pressed('jump') || (!rules.depthMovement && input.pressed('up'));
    if (!this.airborne && jumpPressed) {
      this.dashFrames = 0;
      this.airborne = true;
      this.jumpVelocity = this.combatProfile.jumpVelocity;
      this.state = 'jump';
      this.stateFrame = 0;
      const airAttack = this.readMove(input, rules);
      if (airAttack) this.startMove(airAttack);
      return;
    }

    const attack = this.readMove(input, rules);
    if (attack) { this.dashFrames = 0; this.startMove(attack); return; }

    if (!this.airborne && this.dashFrames > 0) {
      const dashSpeed = 8.2 * this.character.speed * this.combatProfile.walkScale;
      this.x += this.dashDirection * dashSpeed;
      this.dashFrames -= 1;
      this.state = 'walk';
      this.stateFrame += 1;
      this.clamp(rules);
      return;
    }
    if (!this.airborne && input.pressed('left') && this.buffer.doubleTap('left', 11)) { this.startDash(-1); this.clamp(rules); return; }
    if (!this.airborne && input.pressed('right') && this.buffer.doubleTap('right', 11)) { this.startDash(1); this.clamp(rules); return; }

    const moveSpeed = 4.3 * this.character.speed * this.combatProfile.walkScale * this.installMoveScale;
    let moved = false;
    if (input.held('left')) { this.x -= moveSpeed; moved = true; }
    if (input.held('right')) { this.x += moveSpeed; moved = true; }
    if (rules.depthMovement) {
      if (input.held('up')) { this.y -= moveSpeed * .68 * this.combatProfile.depthScale; moved = true; }
      if (input.held('down')) { this.y += moveSpeed * .68 * this.combatProfile.depthScale; moved = true; }
    } else if (input.held('down') && !this.airborne) {
      this.state = 'crouch';
      this.stateFrame += 1;
      this.clamp(rules);
      return;
    }

    this.clamp(rules);
    if (this.airborne) this.state = 'jump';
    else this.state = moved ? 'walk' : 'idle';
    this.stateFrame += 1;
  }

  updateAi(target: Fighter, rules: ModeRules): void {
    this.updateAiDirected(target, rules, { role: 'attack', desiredX: target.x, desiredY: target.y, attackAllowed: true, rangedAllowed: true });
  }

  updateAiDirected(target: Fighter, rules: ModeRules, directive: EnemyDirective): void {
    this.previousX = this.x;
    this.previousY = this.y;
    this.updateAir();
    if (this.hitStop > 0) { this.hitStop -= 1; return; }
    this.tickWindows();
    if (this.aiCooldown > 0) this.aiCooldown -= 1;
    if (this.state === 'hit' || this.state === 'block' || this.state === 'parry' || this.state === 'knockdown' || this.state === 'victory' || this.state === 'ko') {
      this.advanceLockedState();
      return;
    }
    if (this.state === 'attack') { this.applyMoveKinematics(rules); this.advanceMove(); return; }

    const dxToPlayer = target.x - this.x;
    const dx = directive.desiredX - this.x;
    const dy = directive.desiredY - this.y;
    this.facing = dxToPlayer >= 0 ? 1 : -1;
    const playerDistance = Math.abs(dxToPlayer);
    const closeToAnchor = Math.abs(dx) < 22 && Math.abs(dy) < 14;
    const profile = this.aiProfile;
    const movement = 2.15 * this.character.speed * profile.moveSpeed;
    const cornerDistance = Math.min(target.x - rules.arenaLeft, rules.arenaRight - target.x);
    const targetCornered = !rules.depthMovement && cornerDistance < 118;
    const sameLane = Math.abs(target.y - this.y) < 48;
    const chaseCapable = ['KEN', 'CHUNLI', 'DUDLEY', 'IBUKI', 'YUN', 'GILL'].includes(this.character.id) || profile.moveSpeed >= 1.08;

    if (directive.attackAllowed && this.aiCooldown === 0 && target.airborne && target.jumpHeight > 34 && playerDistance < 205 && sameLane) {
      if (chaseCapable && target.jumpHeight > 78 && playerDistance > 58) {
        this.airborne = true;
        this.jumpVelocity = Math.max(9.4, this.combatProfile.jumpVelocity * .84);
        this.startMove(airNormalFor(this.character.id, profile.throwBias > .2 ? 'hp' : 'hk'));
      } else {
        this.startMove(specialMovesFor(this.character.id).antiAir);
      }
      this.aiAirChaseCount += 1;
      this.aiCooldown = Math.max(12, Math.round(profile.attackCooldown * .58 / Math.max(.78, this.aiTempoScale)));
    } else if (targetCornered && directive.attackAllowed && this.aiCooldown === 0 && playerDistance < Math.max(118, profile.preferredDistance + 44) && sameLane) {
      const deterministic = ((this.uid * 23 + this.stateFrame * 7 + Math.round(playerDistance * 1.7)) % 100) / 100;
      const command = this.aiCommandNormal();
      const useThrow = playerDistance < 74 && deterministic < Math.min(.62, profile.throwBias + .23);
      const useCommand = !useThrow && command && deterministic > .58;
      const pressureMove = useThrow ? throwMoveFor(this.character.id) : useCommand ? command : normalFor(deterministic < .42 ? 'mp' : 'hk', false, this.character.id);
      this.startMove(pressureMove);
      this.aiCornerPressureCount += 1;
      this.aiCornerPressureFrames = 42;
      this.aiCooldown = Math.max(10, Math.round(profile.attackCooldown * .62 / Math.max(.82, profile.pressure * this.aiTempoScale)));
    } else {
      if (rules.depthMovement && Math.abs(dy) > 8) this.y += Math.sign(dy) * Math.min(Math.abs(dy), movement * .92);
      if (Math.abs(dx) > Math.max(22, profile.preferredDistance * .22)) {
        this.x += Math.sign(dx) * movement;
        this.state = 'walk';
      } else if (directive.rangedAllowed && profile.rangedBias > 0 && this.aiCooldown === 0 && playerDistance > profile.preferredDistance * 1.25) {
        this.startMove(specialMovesFor(this.character.id).primary);
        this.aiCooldown = Math.max(24, Math.round(profile.attackCooldown * (1.18 - Math.min(1, profile.rangedBias) * .22) / this.aiTempoScale));
      } else if (directive.attackAllowed && this.aiCooldown === 0 && playerDistance < Math.max(92, profile.preferredDistance + 58) && sameLane) {
        const deterministic = ((this.uid * 17 + this.stateFrame * 11 + Math.round(playerDistance)) % 100) / 100;
        const useSuper = this.superGauge >= this.superStockCost && deterministic < this.aiSuperBias;
        const useThrow = !useSuper && playerDistance < 72 && deterministic < profile.throwBias + this.aiSuperBias * .25;
        const heavyThreshold = .55 + Math.min(.25, profile.pressure * .08);
        const move = useSuper ? this.selectedSuperMove() : useThrow ? throwMoveFor(this.character.id) : this.selectAiAttack(deterministic, heavyThreshold, playerDistance);
        this.startMove(move);
        this.aiCooldown = Math.max(14, Math.round(profile.attackCooldown / Math.max(.72, profile.pressure * this.aiTempoScale)));
      } else {
        this.state = closeToAnchor ? 'idle' : 'walk';
      }
    }
    this.clamp(rules);
    this.stateFrame += 1;
  }

  startMove(move: MoveData): void {
    if (move.exCost && this.superGauge < move.exCost) return;
    if (move.superCost && this.superGauge < move.superCost) return;
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
    this.currentMove = effective;
    this.parryWindow = 0;
    this.lowParryWindow = 0;
    this.redParryWindow = 0;
    this.moveFrame = 0;
    this.attackConnected = false;
    this.attackVictims.clear();
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
    if (this.airborne || this.hp <= 0) return false;
    return this.state !== 'hit' && this.state !== 'knockdown' && this.state !== 'parry' && this.state !== 'ko' && this.state !== 'victory';
  }

  receiveHit(move: MoveData, attacker: Fighter, guarding: boolean, counter = false): 'hit' | 'block' | 'parry' | 'red-parry' {
    const low = move.level === 'low';
    this.lastHitDirection = attacker.facing;
    this.lastHitReaction = move.level === 'throw' ? 'throw' : move.launch ? 'launch' : move.level === 'low' ? 'low' : move.level === 'high' ? 'high' : 'mid';
    this.lastHitZone = this.resolveHitZone(move);
    this.lastHitPower = Math.max(move.damage, move.pushback * 2);
    if (move.superCost) {
      this.superVictimFrames = Math.max(this.superVictimFrames, 28);
      this.superVictimTotal = Math.max(this.superVictimTotal, 28);
      this.superVictimMotif = move.superPresentation?.motif ?? 'burst';
      this.superVictimDirection = attacker.facing;
      if (!move.multiHit) { this.superVictimHitIndex = 1; this.superVictimHitTotal = 1; }
    }
    if (this.canDefend() && this.redParryWindow > 0) {
      this.enterParry(10);
      return 'red-parry';
    }
    if (this.canDefend() && ((!low && this.parryWindow > 0) || (low && this.lowParryWindow > 0))) {
      this.enterParry(8);
      return 'parry';
    }
    if (guarding && this.canDefend() && move.level !== 'throw' && !move.guardBreak) {
      this.interruptMove();
      this.state = 'block';
      this.stateFrame = -move.blockStun;
      this.x += attacker.facing * move.pushback * .3;
      this.hitStop = Math.max(this.hitStop, Math.round(move.hitStop * .55));
      return 'block';
    }

    this.interruptMove();
    const juggleScale = this.airborne ? Math.max(.58, 1 - this.juggleHits * .09) : 1;
    const damage = Math.round(move.damage * (counter ? 1.12 : 1) * juggleScale);
    this.hp = Math.max(0, this.hp - damage);
    this.superGauge = Math.min(this.superGaugeMax, this.superGauge + Math.round(move.superGain * .55));
    this.hitFlash = 6;
    this.hitStop = move.hitStop;
    this.x += attacker.facing * move.pushback * .45;
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
    } else {
      this.state = 'hit';
      this.stateFrame = -(move.hitStun + (counter ? 3 : 0));
    }
    return 'hit';
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
    this.currentMove = null;
    this.state = 'victory';
    this.stateFrame = 0;
    this.airborne = false;
    this.jumpHeight = 0;
    this.jumpVelocity = 0;
  }

  throwEscaped(pushDirection: 1 | -1): void {
    this.currentMove = null;
    this.state = 'idle';
    this.stateFrame = 0;
    this.x += pushDirection * 22;
    this.hitStop = 4;
    this.throwEscapeFrames = 12;
    this.throwSyncFrames = 0;
    this.throwSyncRole = null;
    this.throwSyncPartnerUid = null;
    this.throwSyncStyle = 'RYU';
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

  private startDash(direction: 1 | -1): void {
    this.dashDirection = direction;
    this.dashFrames = 8;
    this.state = 'walk';
    this.stateFrame = 0;
    this.x += direction * 5;
  }

  private readMove(input: InputManager, rules: ModeRules): MoveData | null {
    const throwPressed = (input.pressed('lp') && input.held('lk')) || (input.pressed('lk') && input.held('lp'));
    if (throwPressed && !this.airborne) return throwMoveFor(this.character.id);
    const buttons: MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
    if (this.airborne) {
      for (const button of buttons) if (input.pressed(button)) return airNormalFor(this.character.id, button);
      return null;
    }
    const special = this.readSpecialMove(input);
    if (special) return special;
    const forwardAction = this.facing === 1 ? 'right' : 'left';
    for (const button of buttons) {
      if (!input.pressed(button)) continue;
      const command = commandNormalFor(this.character.id, button, input.held(forwardAction));
      if (command) return command;
    }
    const crouching = !rules.depthMovement && input.held('down');
    for (const button of buttons) if (input.pressed(button)) return normalFor(button, crouching, this.character.id);
    return null;
  }

  private readSpecialMove(input: InputManager): MoveData | null {
    const punchPressed = input.pressed('lp') || input.pressed('mp') || input.pressed('hp');
    const kickPressed = input.pressed('lk') || input.pressed('mk') || input.pressed('hk');
    const specials = specialMovesFor(this.character.id);
    if (punchPressed && this.buffer.motion(['D', 'DF', 'F', 'D', 'DF', 'F'], this.facing, 24) && this.superGauge >= this.superStockCost) return this.selectedSuperMove();
    if (punchPressed && this.buffer.motion(['F', 'D', 'DF'], this.facing, 14)) return specials.antiAir;
    if (punchPressed && this.buffer.motion(['D', 'DF', 'F'], this.facing, 14)) {
      const doublePunch = ['lp', 'mp', 'hp'].filter((button) => input.held(button as MoveButton)).length >= 2;
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
      if (this.state === 'attack' && this.currentMove?.technique === 'air') {
        this.interruptMove();
        this.state = 'idle';
        this.stateFrame = 0;
      } else if (this.state === 'jump') {
        this.state = 'idle';
        this.stateFrame = 0;
      }
    }
  }

  private tickWindows(): void {
    if (this.installFrames > 0) {
      this.installFrames -= 1;
      if (this.installFrames === 0) { this.installPowerScale = 1; this.installFrameScale = 1; this.installMoveScale = 1; this.installLabel = ''; }
    }
    if (this.parryWindow > 0) this.parryWindow -= 1;
    if (this.lowParryWindow > 0) this.lowParryWindow -= 1;
    if (this.redParryWindow > 0) this.redParryWindow -= 1;
    if (this.hitFlash > 0) this.hitFlash -= 1;
    if (this.wallBounceFrames > 0) this.wallBounceFrames -= 1;
    if (this.groundBounceFrames > 0) this.groundBounceFrames -= 1;
    if (this.landingFrames > 0) this.landingFrames -= 1;
    if (this.throwEscapeFrames > 0) this.throwEscapeFrames -= 1;
    if (this.visualHitSequenceFrames > 0) {
      this.visualHitSequenceFrames -= 1;
      if (this.visualHitSequenceFrames === 0) { this.visualHitSequenceIndex = 1; this.visualHitSequenceTotal = 1; this.visualHitSequenceTotalFrames = 0; }
    }
    if (this.superVictimFrames > 0) {
      this.superVictimFrames -= 1;
      if (this.superVictimFrames === 0) { this.superVictimMotif = ''; this.superVictimTotal = 0; this.superVictimHitIndex = 1; this.superVictimHitTotal = 1; }
    }
    if (this.throwSyncFrames > 0) {
      this.throwSyncFrames -= 1;
      if (this.throwSyncFrames === 0) { this.throwSyncRole = null; this.throwSyncPartnerUid = null; this.throwSyncStyle = 'RYU'; }
    }
    if (this.aiCornerPressureFrames > 0) this.aiCornerPressureFrames -= 1;
  }

  private enterParry(frames: number): void {
    this.interruptMove();
    this.state = 'parry';
    this.stateFrame = -frames;
    this.hitStop = 2;
    this.parryWindow = 0;
    this.lowParryWindow = 0;
    this.redParryWindow = 0;
  }

  private interruptMove(): void {
    this.currentMove = null;
    this.moveFrame = 0;
    this.attackConnected = false;
    this.attackVictims.clear();
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
      this.currentMove = null;
      this.state = this.airborne ? 'jump' : 'idle';
      this.stateFrame = 0;
    }
  }

  private advanceLockedState(): void {
    this.stateFrame += 1;
    if (this.state === 'ko' || this.state === 'victory') return;
    if (this.stateFrame >= 0) {
      this.state = this.airborne ? 'jump' : 'idle';
      this.stateFrame = 0;
    }
  }

  private clamp(rules: ModeRules): void {
    this.x = Math.max(rules.arenaLeft, Math.min(rules.arenaRight, this.x));
    this.y = Math.max(rules.arenaTop, Math.min(rules.arenaBottom, this.y));
  }
}
