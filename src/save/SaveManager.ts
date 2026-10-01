import type { StageResult } from '../game/StageResult.js';

export const SAVE_DB_NAME = 'ssc-save-data-v1';
export const SAVE_SCHEMA_VERSION = 2;
const PRIMARY_KEY = 'profile';
const BACKUP_KEY = 'profile-backup';
const ALLOWED_CHARACTERS = new Set(['RYU', 'KEN', 'CHUN-LI', 'ALEX', 'DUDLEY', 'MAKOTO', 'IBUKI', 'YUN']);

export interface GameSave {
  schemaVersion: number;
  currentStage: number;
  completedStages: number[];
  selectedCharacter: string;
  selectedSuperArt: 1 | 2 | 3;
  stageSelectUnlocked: boolean;
  audioEnabled: boolean;
  vibrationEnabled: boolean;
  controlScale: number;
  touchStickScale: number;
  touchButtonScale: number;
  touchOpacity: number;
  touchStickX: number;
  touchStickY: number;
  touchButtonsX: number;
  touchButtonsY: number;
  hasCampaignStarted: boolean;
  stageResults: StageResult[];
}

export interface SaveHealth {
  source: 'primary' | 'backup' | 'defaults';
  repaired: boolean;
  issues: string[];
  backupReady: boolean;
  schemaVersion: number;
}

export interface StoredSaveRecord {
  schemaVersion: number;
  savedAt: number;
  checksum: string;
  data: GameSave;
}

export const DEFAULT_SAVE: GameSave = {
  schemaVersion: SAVE_SCHEMA_VERSION,
  currentStage: 1,
  completedStages: [],
  selectedCharacter: 'RYU',
  selectedSuperArt: 1,
  stageSelectUnlocked: false,
  audioEnabled: true,
  vibrationEnabled: true,
  controlScale: 1,
  touchStickScale: 1,
  touchButtonScale: 1,
  touchOpacity: .72,
  touchStickX: 38,
  touchStickY: 28,
  touchButtonsX: 32,
  touchButtonsY: 26,
  hasCampaignStarted: false,
  stageResults: [],
};

function finiteNumber(value: unknown, fallback: number, min: number, max: number, issues: string[], key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) { if (value !== undefined) issues.push(key); return fallback; }
  if (value < min || value > max) { issues.push(key); return Math.max(min, Math.min(max, value)); }
  return value;
}

function booleanValue(value: unknown, fallback: boolean, issues: string[], key: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value !== undefined) issues.push(key);
  return fallback;
}

function sanitizeStageResult(value: unknown): StageResult | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Record<keyof StageResult, unknown>>;
  const stageId = item.stageId;
  if (typeof stageId !== 'number' || ![1, 2, 3, 4, 5].includes(stageId)) return null;
  const number = (key: keyof StageResult, max = 10_000_000): number => {
    const candidate = item[key];
    return typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, Math.min(max, candidate)) : 0;
  };
  return {
    stageId: stageId as 1 | 2 | 3 | 4 | 5,
    clearSeconds: number('clearSeconds', 24 * 60 * 60),
    defeatedEnemies: number('defeatedEnemies', 10_000),
    damageDealt: number('damageDealt'),
    damageTaken: number('damageTaken'),
    maxComboHits: number('maxComboHits', 10_000),
    maxComboDamage: number('maxComboDamage'),
    parries: number('parries', 100_000),
    redParries: number('redParries', 100_000),
    supersUsed: number('supersUsed', 100_000),
    throwsLanded: number('throwsLanded', 100_000),
  };
}

export function sanitizeGameSave(raw: unknown): { save: GameSave; issues: string[] } {
  const issues: string[] = [];
  const source = raw && typeof raw === 'object' ? raw as Partial<Record<keyof GameSave, unknown>> : {};
  if (!raw || typeof raw !== 'object') issues.push('SAVE OBJECT');

  const currentStage = Math.round(finiteNumber(source.currentStage, DEFAULT_SAVE.currentStage, 1, 5, issues, 'CURRENT STAGE'));
  const completedStages = Array.isArray(source.completedStages)
    ? Array.from(new Set(source.completedStages.filter((stage): stage is number => typeof stage === 'number' && Number.isInteger(stage) && stage >= 1 && stage <= 5))).sort((a, b) => a - b)
    : [...DEFAULT_SAVE.completedStages];
  if (source.completedStages !== undefined && !Array.isArray(source.completedStages)) issues.push('COMPLETED STAGES');

  const selectedCharacter = typeof source.selectedCharacter === 'string' && ALLOWED_CHARACTERS.has(source.selectedCharacter)
    ? source.selectedCharacter : DEFAULT_SAVE.selectedCharacter;
  if (source.selectedCharacter !== undefined && selectedCharacter !== source.selectedCharacter) issues.push('CHARACTER');

  const art = source.selectedSuperArt;
  const selectedSuperArt: 1 | 2 | 3 = art === 1 || art === 2 || art === 3 ? art : DEFAULT_SAVE.selectedSuperArt;
  if (art !== undefined && art !== selectedSuperArt) issues.push('SUPER ART');

  const stageResults = Array.isArray(source.stageResults)
    ? source.stageResults.map(sanitizeStageResult).filter((result): result is StageResult => !!result).filter((result, index, all) => all.findIndex((candidate) => candidate.stageId === result.stageId) === index).sort((a, b) => a.stageId - b.stageId)
    : [];
  if (source.stageResults !== undefined && (!Array.isArray(source.stageResults) || stageResults.length !== source.stageResults.length)) issues.push('STAGE RESULTS');

  return {
    save: {
      schemaVersion: SAVE_SCHEMA_VERSION,
      currentStage,
      completedStages,
      selectedCharacter,
      selectedSuperArt,
      stageSelectUnlocked: booleanValue(source.stageSelectUnlocked, DEFAULT_SAVE.stageSelectUnlocked, issues, 'STAGE SELECT'),
      audioEnabled: booleanValue(source.audioEnabled, DEFAULT_SAVE.audioEnabled, issues, 'AUDIO'),
      vibrationEnabled: booleanValue(source.vibrationEnabled, DEFAULT_SAVE.vibrationEnabled, issues, 'VIBRATION'),
      controlScale: finiteNumber(source.controlScale, DEFAULT_SAVE.controlScale, .5, 1.8, issues, 'CONTROL SCALE'),
      touchStickScale: finiteNumber(source.touchStickScale, DEFAULT_SAVE.touchStickScale, .55, 1.65, issues, 'STICK SCALE'),
      touchButtonScale: finiteNumber(source.touchButtonScale, DEFAULT_SAVE.touchButtonScale, .55, 1.65, issues, 'BUTTON SCALE'),
      touchOpacity: finiteNumber(source.touchOpacity, DEFAULT_SAVE.touchOpacity, .2, 1, issues, 'TOUCH OPACITY'),
      touchStickX: finiteNumber(source.touchStickX, DEFAULT_SAVE.touchStickX, 0, 2048, issues, 'STICK X'),
      touchStickY: finiteNumber(source.touchStickY, DEFAULT_SAVE.touchStickY, 0, 1024, issues, 'STICK Y'),
      touchButtonsX: finiteNumber(source.touchButtonsX, DEFAULT_SAVE.touchButtonsX, 0, 2048, issues, 'BUTTON X'),
      touchButtonsY: finiteNumber(source.touchButtonsY, DEFAULT_SAVE.touchButtonsY, 0, 1024, issues, 'BUTTON Y'),
      hasCampaignStarted: booleanValue(source.hasCampaignStarted, DEFAULT_SAVE.hasCampaignStarted, issues, 'CAMPAIGN STARTED'),
      stageResults,
    },
    issues: Array.from(new Set(issues)),
  };
}

function stableJson(save: GameSave): string { return JSON.stringify(save); }

export function checksumSave(save: GameSave): string {
  const text = stableJson(save);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function encodeSaveRecord(save: GameSave, savedAt = Date.now()): StoredSaveRecord {
  const normalized = sanitizeGameSave(save).save;
  return { schemaVersion: SAVE_SCHEMA_VERSION, savedAt, checksum: checksumSave(normalized), data: normalized };
}

export function decodeSaveRecord(raw: unknown): { save: GameSave; issues: string[]; legacy: boolean } | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Partial<StoredSaveRecord>;
  if ('data' in record || 'checksum' in record) {
    if (!record.data || typeof record.checksum !== 'string') return null;
    const sanitized = sanitizeGameSave(record.data);
    if (record.checksum !== checksumSave(sanitized.save)) return null;
    return { ...sanitized, legacy: false };
  }
  const legacy = sanitizeGameSave(raw);
  return { ...legacy, legacy: true };
}

export function recoverSaveRecords(rawPrimary: unknown, rawBackup: unknown): { save: GameSave; health: SaveHealth } {
  const primary = decodeSaveRecord(rawPrimary);
  const backup = decodeSaveRecord(rawBackup);
  if (primary) {
    return {
      save: primary.save,
      health: {
        source: 'primary',
        repaired: primary.issues.length > 0 || primary.legacy,
        issues: primary.legacy ? ['LEGACY MIGRATION', ...primary.issues] : primary.issues,
        backupReady: !!backup,
        schemaVersion: SAVE_SCHEMA_VERSION,
      },
    };
  }
  if (backup) {
    return {
      save: backup.save,
      health: {
        source: 'backup',
        repaired: true,
        issues: Array.from(new Set(['PRIMARY CORRUPT', ...backup.issues])),
        backupReady: true,
        schemaVersion: SAVE_SCHEMA_VERSION,
      },
    };
  }
  const hadStoredData = rawPrimary !== undefined || rawBackup !== undefined;
  return {
    save: { ...DEFAULT_SAVE, completedStages: [], stageResults: [] },
    health: {
      source: 'defaults',
      repaired: hadStoredData,
      issues: hadStoredData ? ['SAVE RESET TO DEFAULTS'] : [],
      backupReady: false,
      schemaVersion: SAVE_SCHEMA_VERSION,
    },
  };
}


export interface PortableSavePackage {
  app: 'side-scroll-chronicles';
  formatVersion: 1;
  exportedAt: string;
  schemaVersion: number;
  checksum: string;
  data: GameSave;
}

export function createPortableSave(save: GameSave, now = new Date()): PortableSavePackage {
  const normalized = sanitizeGameSave(save).save;
  return {
    app: 'side-scroll-chronicles',
    formatVersion: 1,
    exportedAt: now.toISOString(),
    schemaVersion: SAVE_SCHEMA_VERSION,
    checksum: checksumSave(normalized),
    data: normalized,
  };
}

export function decodePortableSave(text: string): { save: GameSave; issues: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('INVALID JSON'); }
  if (!raw || typeof raw !== 'object') throw new Error('INVALID SAVE PACKAGE');
  const packageCandidate = raw as Partial<PortableSavePackage>;
  if (packageCandidate.app === 'side-scroll-chronicles' || 'formatVersion' in packageCandidate) {
    if (packageCandidate.app !== 'side-scroll-chronicles' || packageCandidate.formatVersion !== 1 || !packageCandidate.data || typeof packageCandidate.checksum !== 'string') throw new Error('UNSUPPORTED SAVE PACKAGE');
    const sanitized = sanitizeGameSave(packageCandidate.data);
    if (packageCandidate.checksum !== checksumSave(sanitized.save)) throw new Error('CHECKSUM MISMATCH');
    return { save: sanitized.save, issues: sanitized.issues };
  }
  const record = decodeSaveRecord(raw);
  if (record) return { save: record.save, issues: record.legacy ? ['LEGACY IMPORT', ...record.issues] : record.issues };
  throw new Error('UNRECOGNIZED SAVE FORMAT');
}

export class SaveManager {
  private db: IDBDatabase | null = null;
  private lastHealth: SaveHealth = { source: 'defaults', repaired: false, issues: [], backupReady: false, schemaVersion: SAVE_SCHEMA_VERSION };

  get health(): SaveHealth { return { ...this.lastHealth, issues: [...this.lastHealth.issues] }; }

  async init(): Promise<void> {
    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(SAVE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('save')) db.createObjectStore('save');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
  }

  async load(): Promise<GameSave> {
    if (!this.db) return { ...DEFAULT_SAVE };
    const [rawPrimary, rawBackup] = await Promise.all([this.getRaw(PRIMARY_KEY), this.getRaw(BACKUP_KEY)]);
    const recovery = recoverSaveRecords(rawPrimary, rawBackup);
    this.lastHealth = recovery.health;
    const decodedPrimary = decodeSaveRecord(rawPrimary);
    if (recovery.health.source === 'backup') await this.putRaw(PRIMARY_KEY, encodeSaveRecord(recovery.save));
    else if (decodedPrimary?.legacy || decodedPrimary?.issues.length) await this.putRaw(PRIMARY_KEY, encodeSaveRecord(recovery.save));
    return recovery.save;
  }

  async write(patch: Partial<GameSave>): Promise<GameSave> {
    if (!this.db) throw new Error('SaveManager not initialized');
    const current = await this.load();
    const sanitized = sanitizeGameSave({ ...current, ...patch, schemaVersion: SAVE_SCHEMA_VERSION });
    const next = sanitized.save;
    await this.writePrimaryAndBackup(encodeSaveRecord(next), encodeSaveRecord(current));
    this.lastHealth = { source: 'primary', repaired: sanitized.issues.length > 0, issues: sanitized.issues, backupReady: true, schemaVersion: SAVE_SCHEMA_VERSION };
    return next;
  }

  async exportPortable(): Promise<{ filename: string; text: string }> {
    const save = await this.load();
    const pkg = createPortableSave(save);
    const stamp = pkg.exportedAt.replace(/[:.]/g, '-');
    return { filename: `side-scroll-chronicles-save-${stamp}.json`, text: JSON.stringify(pkg, null, 2) };
  }

  async importPortable(text: string): Promise<GameSave> {
    if (!this.db) throw new Error('SaveManager not initialized');
    const imported = decodePortableSave(text);
    const current = await this.load();
    await this.writePrimaryAndBackup(encodeSaveRecord(imported.save), encodeSaveRecord(current));
    this.lastHealth = { source: 'primary', repaired: imported.issues.length > 0, issues: imported.issues, backupReady: true, schemaVersion: SAVE_SCHEMA_VERSION };
    return imported.save;
  }

  private getRaw(key: string): Promise<unknown> { return this.request<unknown>('readonly', (store) => store.get(key)); }
  private putRaw(key: string, value: unknown): Promise<IDBValidKey> { return this.request<IDBValidKey>('readwrite', (store) => store.put(value, key)); }

  private writePrimaryAndBackup(primary: StoredSaveRecord, backup: StoredSaveRecord): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) { reject(new Error('Database unavailable')); return; }
      const tx = this.db.transaction('save', 'readwrite');
      const store = tx.objectStore('save');
      store.put(backup, BACKUP_KEY);
      store.put(primary, PRIMARY_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Save transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Save transaction aborted'));
    });
  }

  private request<T>(mode: IDBTransactionMode, make: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.db) { reject(new Error('Database unavailable')); return; }
      const tx = this.db.transaction('save', mode);
      const request = make(tx.objectStore('save'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }
}
