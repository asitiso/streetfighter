import type { CombatWorld } from '../combat/CombatWorld.js';
import type { Fighter } from '../combat/Fighter.js';
import { comboDamageScale } from '../combat/Fighter.js';
import type { ModeRules, MoveButton, MoveData } from '../combat/CombatTypes.js';
import { normalFor, specialMovesFor, superArtMoveFor, throwMoveFor } from '../combat/MoveLibrary.js';
import { techniqueCatalogFor, targetComboFollowUp } from '../combat/TechniqueLibrary.js';
import { getCharacter } from '../game/characters.js';
import type { InputManager } from '../input/InputManager.js';

/* ---------------------------------------------------------------- frame data & move list (pure) */

export interface FrameData { startup: number; active: number; recovery: number; total: number; onBlock: number; onHit: number | 'KD'; damage: number }

/** Frame data straight from MoveData. Advantage assumes the first active frame connects (hit-stop cancels out). */
export function frameDataFor(move: MoveData): FrameData {
  const afterContact = Math.max(0, move.active - 1) + move.recovery;
  return {
    startup: move.startup, active: move.active, recovery: move.recovery,
    total: move.startup + move.active + move.recovery,
    onBlock: move.blockStun - afterContact,
    onHit: move.knockdown || move.launch || move.level === 'throw' ? 'KD' : move.hitStun - afterContact,
    damage: move.damage,
  };
}

export interface MoveListEntry { group: 'NORMAL' | 'COMMAND' | 'TARGET' | 'THROW' | 'SPECIAL' | 'SUPER'; name: string; input: string; move: MoveData }

const BUTTONS: readonly MoveButton[] = ['lp', 'mp', 'hp', 'lk', 'mk', 'hk'];
const B = (b: MoveButton) => b.toUpperCase();

export function trainingMoveList(characterId: string): MoveListEntry[] {
  const list: MoveListEntry[] = [];
  for (const b of BUTTONS) list.push({ group: 'NORMAL', name: `STAND ${B(b)}`, input: B(b), move: normalFor(b, false, characterId) });
  for (const b of BUTTONS) list.push({ group: 'NORMAL', name: `CROUCH ${B(b)}`, input: `↓+${B(b)}`, move: normalFor(b, true, characterId) });
  const command = techniqueCatalogFor(characterId).command;
  if (command) list.push({ group: 'COMMAND', name: command.label, input: `→+${B(command.button ?? 'mp')}`, move: command });
  for (const b of BUTTONS) {
    const base = normalFor(b, false, characterId);
    for (const f of BUTTONS) {
      const follow = targetComboFollowUp(characterId, base.id, f);
      if (follow) list.push({ group: 'TARGET', name: follow.label, input: `${B(b)} > ${B(f)}`, move: follow });
    }
  }
  list.push({ group: 'THROW', name: 'THROW', input: 'LP+LK (CLOSE)', move: throwMoveFor(characterId) });
  const s = specialMovesFor(characterId);
  list.push({ group: 'SPECIAL', name: s.primary.label, input: '↓↘→+P', move: s.primary });
  list.push({ group: 'SPECIAL', name: `EX ${s.exPrimary.label}`, input: '↓↘→+PP', move: s.exPrimary });
  list.push({ group: 'SPECIAL', name: s.antiAir.label, input: '→↓↘+P', move: s.antiAir });
  list.push({ group: 'SPECIAL', name: s.mobility.label, input: '↓↙←+K', move: s.mobility });
  const def = getCharacter(characterId);
  for (const art of def.superArts) list.push({ group: 'SUPER', name: `SA${art.id} ${art.name}`, input: '↓↘→↓↘→+P', move: superArtMoveFor(characterId, art.id, art.gauge) });
  return list;
}

/** Numpad-style arrow for the held direction (absolute screen directions). */
export function directionArrow(left: boolean, right: boolean, up: boolean, down: boolean): string {
  const h = left === right ? 0 : left ? -1 : 1, v = up === down ? 0 : up ? 1 : -1;
  return [['↙', '↓', '↘'], ['←', '•', '→'], ['↖', '↑', '↗']][v + 1]![h + 1]!;
}

/* ---------------------------------------------------------------- settings */

export type DummyAction = 'stand' | 'crouch' | 'jump' | 'cpu';
export type DummyBlock = 'none' | 'all' | 'after-first-hit';
export interface TrainingSettings {
  action: DummyAction; block: DummyBlock; parry: boolean; stun: boolean;
  infiniteHealth: boolean; infiniteMeter: boolean; inputDisplay: boolean; frameData: boolean;
}
export const DEFAULT_TRAINING_SETTINGS: TrainingSettings = { action: 'stand', block: 'none', parry: false, stun: true, infiniteHealth: true, infiniteMeter: true, inputDisplay: true, frameData: true };

type MenuRow = 'action' | 'block' | 'parry' | 'stun' | 'infiniteHealth' | 'infiniteMeter' | 'inputDisplay' | 'frameData' | 'moveList' | 'reset' | 'select' | 'exit';
export const TRAINING_MENU_ROWS: readonly MenuRow[] = ['action', 'block', 'parry', 'stun', 'infiniteHealth', 'infiniteMeter', 'inputDisplay', 'frameData', 'moveList', 'reset', 'select', 'exit'];
const ACTIONS: readonly DummyAction[] = ['stand', 'crouch', 'jump', 'cpu'];
const BLOCKS: readonly DummyBlock[] = ['none', 'all', 'after-first-hit'];

export interface InputHistoryEntry { direction: string; buttons: string[]; frames: number }
export interface ComboReadout { hits: number; damage: number; lastDamage: number; scale: number; best: number; bestDamage: number; active: boolean }

type DummyInput = { held(a: string): boolean; pressed(a: string): boolean; released(a: string): boolean };
const NONE: DummyInput = { held: () => false, pressed: () => false, released: () => false };

export const BLOCK_AFTER_HIT_FRAMES = 45;
export const KO_REVIVE_FRAMES = 60;
export const HEALTH_FLOOR = .35;

/* ---------------------------------------------------------------- session */

export class TrainingSession {
  readonly settings: TrainingSettings = { ...DEFAULT_TRAINING_SETTINGS };
  menuOpen = false;
  menuIndex = 0;
  moveListOpen = false;
  moveListPage = 0;
  readonly history: InputHistoryEntry[] = [];
  readonly combo: ComboReadout = { hits: 0, damage: 0, lastDamage: 0, scale: 1, best: 0, bestDamage: 0, active: false };
  lastMove: MoveData | null = null;
  resets = 0;
  private world: CombatWorld | null = null;
  private dummyHpBefore = 0;
  private blockAfterHit = 0;
  private koFrames = 0;
  private playerKoFrames = 0;
  private dummyJumpCooldown = 0;
  private neutralFrames = 0;

  constructor(private readonly onExit: (target: 'select' | 'title') => void = () => undefined) {}

  get dummy(): Fighter { return this.world!.enemy; }
  get player(): Fighter { return this.world!.player; }

  attach(world: CombatWorld): void {
    this.world = world;
    world.dummyController = (enemy, _player, rules) => this.controlDummy(enemy, rules);
    world.defenseOverride = (defender) => this.blockDecision(defender);
    this.applySettings();
    this.resetPositions();
  }

  applySettings(): void {
    if (!this.world) return;
    this.dummy.setStunEnabled(this.settings.stun);
    this.dummy.setAiLevel(this.settings.action === 'cpu' ? 3 : 0);
  }

  resetPositions(): void {
    const w = this.world; if (!w) return;
    const p = w.player, d = w.enemy, mid = (w.rules.arenaLeft + w.rules.arenaRight) / 2;
    for (const [f, x, facing] of [[p, mid - 130, 1], [d, mid + 130, -1]] as const) {
      f.x = f.previousX = x; f.previousY = f.y;
      f.facing = facing; f.hp = f.maxHp; f.state = 'idle'; f.stateFrame = 0; f.airborne = false; f.jumpHeight = 0; f.jumpVelocity = 0;
      f.hitStop = 0; f.currentMove = null;
    }
    p.superGauge = this.settings.infiniteMeter ? p.superGaugeMax : p.superGauge;
    w.projectiles.length = 0;
    this.dummy.setStunEnabled(false); this.dummy.setStunEnabled(this.settings.stun);
    this.dummyHpBefore = d.hp; this.blockAfterHit = 0; this.koFrames = 0; this.playerKoFrames = 0;
    Object.assign(this.combo, { hits: 0, damage: 0, lastDamage: 0, scale: 1, active: false });
    this.resets += 1;
  }

  /** CombatWorld calls this instead of the enemy AI. */
  controlDummy(dummy: Fighter, rules: ModeRules): void {
    const player = this.world!.player;
    if (this.settings.parry && dummy.canDefend()) { dummy.parryWindow = Math.max(dummy.parryWindow, 2); dummy.lowParryWindow = Math.max(dummy.lowParryWindow, 2); }
    if (this.settings.action === 'cpu') { dummy.updateAi(player, rules); return; }
    let input = NONE;
    if (this.settings.action === 'crouch') input = { held: (a) => a === 'down', pressed: () => false, released: () => false };
    if (this.settings.action === 'jump') {
      if (this.dummyJumpCooldown > 0) this.dummyJumpCooldown -= 1;
      const ready = !dummy.airborne && (dummy.state === 'idle' || dummy.state === 'walk') && this.dummyJumpCooldown === 0;
      if (ready) { this.dummyJumpCooldown = 6; input = { held: (a) => a === 'jump', pressed: (a) => a === 'jump', released: () => false }; }
    }
    dummy.facing = player.x >= dummy.x ? 1 : -1;
    dummy.updatePlayer(input as unknown as InputManager, rules);
  }

  private blockDecision(defender: Fighter): boolean | null {
    if (defender !== this.world?.enemy) return null;
    if (this.settings.block === 'all') return true;
    if (this.settings.block === 'after-first-hit') return this.blockAfterHit > 0;
    return this.settings.action === 'cpu' ? null : false; // CPU dummy with BLOCK NONE keeps its own guard logic
  }

  /** Before world.update: keep the dummy alive and the meter full when those toggles are on. */
  beforeUpdate(): void {
    const w = this.world; if (!w) return;
    const d = w.enemy, p = w.player;
    if (this.settings.infiniteHealth) {
      if (d.hp > 0 && d.hp < d.maxHp * HEALTH_FLOOR) d.hp = Math.round(d.maxHp * HEALTH_FLOOR);
      if (p.hp > 0 && p.hp < p.maxHp * HEALTH_FLOOR) p.hp = Math.round(p.maxHp * HEALTH_FLOOR);
    }
    if (this.settings.infiniteMeter) p.superGauge = p.superGaugeMax;
    this.dummyHpBefore = d.hp;
  }

  /** After world.update: combo readout, frame data, block-after-hit timer, refills and KO revive. */
  afterUpdate(input: InputManager): void {
    const w = this.world; if (!w) return;
    const d = w.enemy, p = w.player;
    this.recordInput(input);
    if (p.currentMove && p.state === 'attack' && p.moveFrame <= 1) this.lastMove = p.currentMove;
    const dealt = this.dummyHpBefore - d.hp;
    const reeling = d.state === 'hit' || d.state === 'knockdown' || d.airborne || d.hitStop > 0;
    if (dealt > 0) {
      if (!this.combo.active || d.comboHitsTaken <= 1) Object.assign(this.combo, { hits: 0, damage: 0 });
      this.combo.active = true;
      this.combo.hits = Math.max(this.combo.hits + 1, d.comboHitsTaken);
      this.combo.damage += dealt;
      this.combo.lastDamage = dealt;
      this.combo.scale = comboDamageScale(this.combo.hits, p.currentMove ?? this.lastMove ?? {});
      if (this.combo.hits > this.combo.best || (this.combo.hits === this.combo.best && this.combo.damage > this.combo.bestDamage)) { this.combo.best = this.combo.hits; this.combo.bestDamage = this.combo.damage; }
      if (this.settings.block === 'after-first-hit') this.blockAfterHit = BLOCK_AFTER_HIT_FRAMES;
    }
    if (reeling) this.neutralFrames = 0; else this.neutralFrames += 1;
    if (!reeling && this.combo.active && this.neutralFrames > 1) this.combo.active = false;
    if (this.blockAfterHit > 0 && !reeling && d.state !== 'block') this.blockAfterHit -= 1;
    if (this.settings.infiniteHealth && this.neutralFrames === 40) d.hp = d.maxHp;
    if (this.settings.infiniteHealth && p.hp > 0 && p.state !== 'hit' && p.state !== 'knockdown' && !p.airborne && p.hp < p.maxHp && this.neutralFrames > 40) p.hp = p.maxHp;
    if (d.hp <= 0) { this.koFrames += 1; if (this.koFrames >= KO_REVIVE_FRAMES) this.revive(d); } else this.koFrames = 0;
    if (p.hp <= 0) { this.playerKoFrames += 1; if (this.playerKoFrames >= KO_REVIVE_FRAMES) this.revive(p); } else this.playerKoFrames = 0;
    this.dummyHpBefore = d.hp;
  }

  private revive(f: Fighter): void {
    f.hp = f.maxHp; f.state = 'idle'; f.stateFrame = 0; f.airborne = false; f.jumpHeight = 0; f.jumpVelocity = 0; f.currentMove = null; f.hitStop = 0;
  }

  private recordInput(input: InputManager): void {
    const dir = directionArrow(input.held('left'), input.held('right'), input.held('up') || input.held('jump'), input.held('down'));
    const buttons = BUTTONS.filter((b) => input.pressed(b)).map(B);
    const top = this.history[0];
    if (top && top.direction === dir && buttons.length === 0) { top.frames = Math.min(99, top.frames + 1); return; }
    if (!top && dir === '•' && buttons.length === 0) return;
    this.history.unshift({ direction: dir, buttons, frames: 1 });
    if (this.history.length > 12) this.history.length = 12;
  }

  /* ------------------------------------------------------------ menu */

  toggleMenu(): void { this.menuOpen = !this.menuOpen; this.moveListOpen = false; }

  /** Returns true when the menu consumed this frame's input. */
  updateMenu(input: InputManager): void {
    if (this.moveListOpen) {
      const pages = this.moveListPages();
      if (input.pressed('left')) this.moveListPage = (this.moveListPage + pages - 1) % pages;
      if (input.pressed('right')) this.moveListPage = (this.moveListPage + 1) % pages;
      if (input.pressed('back') || input.pressed('lk') || input.pressed('confirm')) this.moveListOpen = false;
      return;
    }
    const rows = TRAINING_MENU_ROWS.length;
    if (input.pressed('up')) this.menuIndex = (this.menuIndex + rows - 1) % rows;
    if (input.pressed('down')) this.menuIndex = (this.menuIndex + 1) % rows;
    if (input.pressed('left')) this.adjust(-1);
    if (input.pressed('right')) this.adjust(1);
    if (input.pressed('confirm') || input.pressed('lp')) this.activate();
    if (input.pressed('back') || input.pressed('lk')) this.menuOpen = false;
  }

  adjust(direction: -1 | 1): void {
    const row = TRAINING_MENU_ROWS[this.menuIndex]!;
    const cycle = <T>(list: readonly T[], value: T): T => list[(list.indexOf(value) + direction + list.length) % list.length]!;
    if (row === 'action') this.settings.action = cycle(ACTIONS, this.settings.action);
    else if (row === 'block') this.settings.block = cycle(BLOCKS, this.settings.block);
    else if (row === 'parry' || row === 'stun' || row === 'infiniteHealth' || row === 'infiniteMeter' || row === 'inputDisplay' || row === 'frameData') this.settings[row] = !this.settings[row];
    else return;
    this.applySettings();
  }

  activate(): void {
    const row = TRAINING_MENU_ROWS[this.menuIndex]!;
    if (row === 'moveList') { this.moveListOpen = true; this.moveListPage = 0; }
    else if (row === 'reset') { this.resetPositions(); this.menuOpen = false; }
    else if (row === 'select' || row === 'exit') this.onExit(row === 'select' ? 'select' : 'title');
    else this.adjust(1);
  }

  private moveListPages(): number { return Math.max(1, Math.ceil(trainingMoveList(this.player.character.id).length / MOVES_PER_PAGE)); }

  /* ------------------------------------------------------------ drawing */

  render(ctx: CanvasRenderingContext2D, compactTouchControls = false): void {
    if (!this.world) return;
    ctx.save();
    // Training badge over the round timer.
    ctx.fillStyle = 'rgba(8,12,20,.86)'; ctx.beginPath(); ctx.roundRect(566, 146, 148, 24, 8); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#7fe3ff'; ctx.font = '900 12px Arial Black, sans-serif';
    ctx.fillText(`TRAINING • ${this.settings.action.toUpperCase()}`, 640, 163);
    if (this.settings.inputDisplay) this.drawInputHistory(ctx);
    this.drawCombo(ctx);
    if (this.settings.frameData) this.drawFrameData(ctx, compactTouchControls);
    if (!this.menuOpen && !compactTouchControls) {
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '800 11px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('START / P : TRAINING MENU  •  ESC : RESET POSITION', 640, 668);
    }
    if (this.menuOpen) this.moveListOpen ? this.drawMoveList(ctx) : this.drawMenu(ctx);
    ctx.restore();
  }

  private drawInputHistory(ctx: CanvasRenderingContext2D): void {
    const x = 26, y = 250;
    ctx.fillStyle = 'rgba(6,9,15,.62)'; ctx.beginPath(); ctx.roundRect(x - 8, y - 22, 148, 26 + Math.max(1, this.history.length) * 22, 10); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = '#f1bd51'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText('INPUT', x, y - 6);
    this.history.forEach((entry, i) => {
      const row = y + 16 + i * 22;
      ctx.globalAlpha = Math.max(.35, 1 - i * .05);
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(String(entry.frames).padStart(2, ' '), x, row);
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Arial, sans-serif'; ctx.fillText(entry.direction, x + 24, row + 1);
      ctx.font = '900 12px Arial Black, sans-serif';
      entry.buttons.forEach((b, j) => { ctx.fillStyle = b.endsWith('P') ? '#ff8f6b' : '#79c8ff'; ctx.fillText(b, x + 48 + j * 30, row); });
    });
    ctx.globalAlpha = 1;
  }

  private drawCombo(ctx: CanvasRenderingContext2D): void {
    const c = this.combo, x = 1254, y = 214;
    ctx.fillStyle = 'rgba(6,9,15,.62)'; ctx.beginPath(); ctx.roundRect(x - 210, y - 22, 218, 112, 10); ctx.fill();
    ctx.textAlign = 'right'; ctx.fillStyle = '#f1bd51'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText('COMBO / DAMAGE', x - 4, y - 6);
    ctx.fillStyle = c.active ? '#ffffff' : 'rgba(255,255,255,.7)'; ctx.font = '900 22px Impact, Arial Black, sans-serif';
    ctx.fillText(`${c.hits} HIT${c.hits === 1 ? '' : 'S'}  ${c.damage} DMG`, x - 4, y + 20);
    ctx.font = '800 12px Arial, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.fillText(`LAST HIT ${c.lastDamage}  •  SCALING ${Math.round(c.scale * 100)}%`, x - 4, y + 42);
    ctx.fillText(`BEST ${c.best} HITS / ${c.bestDamage} DMG`, x - 4, y + 62);
    const stun = this.dummy;
    ctx.fillText(`DUMMY STUN ${stun.stunEnabled ? `${Math.round(stun.stunRatio * 100)}%` : 'OFF'}`, x - 4, y + 82);
  }

  private drawFrameData(ctx: CanvasRenderingContext2D, compact: boolean): void {
    const move = this.lastMove; if (!move) return;
    const f = frameDataFor(move), fmt = (n: number | 'KD') => n === 'KD' ? 'KD' : n > 0 ? `+${n}` : `${n}`;
    // The lower corners are reserved for the direction pad and attack buttons.
    const x = 640, y = compact ? 202 : 596;
    ctx.fillStyle = compact ? 'rgba(6,9,15,.9)' : 'rgba(6,9,15,.72)';
    ctx.beginPath(); ctx.roundRect(x - 330, y - 22, 660, 52, 10); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    ctx.font = compact ? '900 17px Arial, sans-serif' : '900 13px Arial Black, sans-serif';
    ctx.fillText(move.label, x, y - 3, 628);
    ctx.font = compact ? '800 15px Arial, sans-serif' : '800 12px Arial, sans-serif';
    ctx.fillStyle = '#e8e1d5';
    ctx.fillText(`STARTUP ${f.startup}  •  ACTIVE ${f.active}  •  RECOVERY ${f.recovery}  •  ON BLOCK ${fmt(f.onBlock)}  •  ON HIT ${fmt(f.onHit)}  •  DMG ${f.damage}`, x, y + 18, 628);
  }

  private menuValue(row: MenuRow): string {
    const onOff = (v: boolean) => v ? 'ON' : 'OFF';
    if (row === 'action') return `◀ ${this.settings.action.toUpperCase()} ▶`;
    if (row === 'block') return `◀ ${this.settings.block === 'after-first-hit' ? 'AFTER FIRST HIT' : this.settings.block.toUpperCase()} ▶`;
    if (row === 'parry' || row === 'stun' || row === 'infiniteHealth' || row === 'infiniteMeter' || row === 'inputDisplay' || row === 'frameData') return `◀ ${onOff(this.settings[row])} ▶`;
    if (row === 'moveList') return `${trainingMoveList(this.player.character.id).length} MOVES`;
    return '';
  }

  private drawMenu(ctx: CanvasRenderingContext2D): void {
    const labels: Record<MenuRow, string> = { action: 'DUMMY ACTION', block: 'DUMMY BLOCK', parry: 'DUMMY PARRY', stun: 'DUMMY STUN', infiniteHealth: 'INFINITE HEALTH', infiniteMeter: 'INFINITE METER', inputDisplay: 'INPUT DISPLAY', frameData: 'FRAME DATA', moveList: 'MOVE LIST', reset: 'RESET POSITION', select: 'CHANGE CHARACTERS', exit: 'EXIT TO TITLE' };
    ctx.fillStyle = 'rgba(2,4,8,.66)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(10,14,22,.95)'; ctx.beginPath(); ctx.roundRect(390, 64, 500, 600, 20); ctx.fill();
    ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 30px Impact, Arial Black, sans-serif'; ctx.fillText('TRAINING MENU', 640, 106);
    TRAINING_MENU_ROWS.forEach((row, i) => {
      const top = 124 + i * 42, active = i === this.menuIndex;
      ctx.fillStyle = active ? 'rgba(127,227,255,.16)' : 'rgba(255,255,255,.03)';
      ctx.beginPath(); ctx.roundRect(414, top, 452, 36, 8); ctx.fill();
      if (active) { ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.textAlign = 'left'; ctx.fillStyle = active ? '#ffffff' : '#d6dbe3'; ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillText(labels[row], 432, top + 24);
      ctx.textAlign = 'right'; ctx.fillStyle = active ? '#7fe3ff' : 'rgba(255,255,255,.6)'; ctx.font = '800 13px Arial, sans-serif'; ctx.fillText(this.menuValue(row), 848, top + 24);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('↑ ↓ SELECT  •  ← → CHANGE  •  ENTER / LP CONFIRM  •  START / ESC CLOSE', 640, 650);
  }

  private drawMoveList(ctx: CanvasRenderingContext2D): void {
    const all = trainingMoveList(this.player.character.id), pages = this.moveListPages();
    const page = all.slice(this.moveListPage * MOVES_PER_PAGE, (this.moveListPage + 1) * MOVES_PER_PAGE);
    ctx.fillStyle = 'rgba(2,4,8,.72)'; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = 'rgba(10,14,22,.96)'; ctx.beginPath(); ctx.roundRect(120, 50, 1040, 624, 20); ctx.fill();
    ctx.strokeStyle = '#f1bd51'; ctx.lineWidth = 2; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = '900 28px Impact, Arial Black, sans-serif';
    ctx.fillText(`${this.player.character.name} MOVE LIST`, 150, 92);
    ctx.textAlign = 'right'; ctx.fillStyle = '#f1bd51'; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText(`PAGE ${this.moveListPage + 1}/${pages}  ◀ ▶`, 1130, 90);
    const cols = [150, 300, 560, 700, 780, 860, 960, 1060];
    const head = ['TYPE', 'MOVE', 'INPUT', 'STARTUP', 'ACTIVE', 'RECOVERY', 'ON BLOCK', 'DAMAGE'];
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '900 11px Arial Black, sans-serif';
    head.forEach((h, i) => ctx.fillText(h, cols[i]!, 124));
    page.forEach((entry, i) => {
      const y = 152 + i * 29, f = frameDataFor(entry.move);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; ctx.fillRect(140, y - 19, 1000, 27);
      ctx.font = '800 11px Arial, sans-serif'; ctx.fillStyle = entry.group === 'SUPER' ? '#ffcf5a' : entry.group === 'SPECIAL' ? '#ff9a7a' : 'rgba(255,255,255,.6)'; ctx.fillText(entry.group, cols[0]!, y);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText(entry.name.slice(0, 26), cols[1]!, y);
      ctx.fillStyle = '#7fe3ff'; ctx.font = '900 13px Arial, sans-serif'; ctx.fillText(entry.input, cols[2]!, y);
      ctx.fillStyle = 'rgba(255,255,255,.86)'; ctx.font = '800 12px Arial, sans-serif';
      [f.startup, f.active, f.recovery].forEach((v, j) => ctx.fillText(String(v), cols[3 + j]!, y));
      ctx.fillStyle = f.onBlock >= 0 ? '#8dff9a' : f.onBlock >= -6 ? '#ffe08a' : '#ff8b8b'; ctx.fillText(f.onBlock > 0 ? `+${f.onBlock}` : String(f.onBlock), cols[6]!, y);
      ctx.fillStyle = 'rgba(255,255,255,.86)'; ctx.fillText(String(f.damage), cols[7]!, y);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '700 11px Arial, sans-serif';
    ctx.fillText('FRAME DATA FROM THE LIVE MOVE TABLES  •  ON BLOCK ASSUMES FIRST ACTIVE FRAME  •  ESC / LK BACK', 640, 660);
  }
}

const MOVES_PER_PAGE = 17;
