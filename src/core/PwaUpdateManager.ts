import { GAME_CACHE_NAME } from './AssetManager.js';
import { RecoveryHistoryStore } from './RecoveryHistory.js';

export const UPDATE_ATTEMPT_KEY = 'ssc-update-attempt-v1';

export interface UpdateAttemptMarker {
  candidate: string;
  previousCache: string | null;
  currentCache: string;
  startedAt: string;
  recoveryTried: boolean;
}

export interface PwaUpdateStatus {
  supported: boolean;
  currentCache: string;
  previousCache: string | null;
  controlled: boolean;
  waiting: boolean;
  installing: boolean;
  lastAction: string;
  rollbackActive: string | null;
  pendingRecovery: boolean;
}

function cacheVersion(name: string): number {
  const match = /^game-cache-v(\d+)$/.exec(name);
  return match ? Number(match[1]) : -1;
}

export function selectPreviousGameCache(caches: readonly string[], current = GAME_CACHE_NAME): string | null {
  return caches
    .filter((name) => /^game-cache-v\d+$/.test(name) && name !== current)
    .sort((a, b) => cacheVersion(b) - cacheVersion(a))[0] ?? null;
}

function readAttempt(): UpdateAttemptMarker | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = JSON.parse(localStorage.getItem(UPDATE_ATTEMPT_KEY) ?? 'null') as Partial<UpdateAttemptMarker> | null;
    if (!value || typeof value.currentCache !== 'string' || typeof value.startedAt !== 'string') return null;
    return {
      candidate: typeof value.candidate === 'string' ? value.candidate : 'unknown',
      previousCache: typeof value.previousCache === 'string' ? value.previousCache : null,
      currentCache: value.currentCache,
      startedAt: value.startedAt,
      recoveryTried: value.recoveryTried === true,
    };
  } catch { return null; }
}

function writeAttempt(marker: UpdateAttemptMarker | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!marker) localStorage.removeItem(UPDATE_ATTEMPT_KEY);
    else localStorage.setItem(UPDATE_ATTEMPT_KEY, JSON.stringify(marker));
  } catch { /* update recovery is best effort */ }
}

export class PwaUpdateManager {
  private lastAction = 'IDLE';
  private readonly history: RecoveryHistoryStore;

  constructor(private readonly candidate = 'unknown') { this.history = new RecoveryHistoryStore(candidate); }

  pendingAttempt(): UpdateAttemptMarker | null { return readAttempt(); }
  markBootHealthy(): void { writeAttempt(null); this.lastAction = 'BOOT HEALTHY'; }
  autoRecoveryReady(): boolean { return typeof localStorage !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator; }

  async status(): Promise<PwaUpdateStatus> {
    const supported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const cacheNames = typeof caches !== 'undefined' ? await caches.keys().catch(() => [] as string[]) : [];
    const registration = supported ? await navigator.serviceWorker.getRegistration().catch(() => undefined) : undefined;
    let currentCache = GAME_CACHE_NAME;
    let previousCache = selectPreviousGameCache(cacheNames, currentCache);
    let rollbackActive: string | null = null;
    if (supported && navigator.serviceWorker.controller) {
      try {
        const reply = await this.messageController({ type: 'GET_UPDATE_STATUS' });
        if (typeof reply?.current === 'string') currentCache = reply.current;
        if (typeof reply?.previous === 'string' || reply?.previous === null) previousCache = reply.previous;
        if (typeof reply?.rollbackActive === 'string' || reply?.rollbackActive === null) rollbackActive = reply.rollbackActive;
      } catch { /* older worker: cache inspection above is enough */ }
    }
    return {
      supported,
      currentCache,
      previousCache,
      controlled: supported && !!navigator.serviceWorker.controller,
      waiting: !!registration?.waiting,
      installing: !!registration?.installing,
      lastAction: this.lastAction,
      rollbackActive,
      pendingRecovery: !!readAttempt(),
    };
  }

  async checkForUpdate(): Promise<PwaUpdateStatus> {
    if (!('serviceWorker' in navigator)) { this.lastAction = 'SERVICE WORKER UNSUPPORTED'; return this.status(); }
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) { this.lastAction = 'NO REGISTRATION'; return this.status(); }
    this.lastAction = 'CHECKING SERVER';
    try { await registration.update(); this.lastAction = registration.waiting ? 'UPDATE READY' : registration.installing ? 'UPDATE INSTALLING' : 'NO NEW UPDATE'; }
    catch { this.lastAction = 'UPDATE CHECK FAILED'; }
    return this.status();
  }

  async applyWaitingUpdate(): Promise<{ applied: boolean; message: string }> {
    if (!('serviceWorker' in navigator)) return { applied: false, message: 'SERVICE WORKER UNSUPPORTED' };
    const status = await this.status();
    const registration = await navigator.serviceWorker.getRegistration();
    let waiting = registration?.waiting ?? null;
    if (!waiting) {
      await this.checkForUpdate();
      waiting = (await navigator.serviceWorker.getRegistration())?.waiting ?? null;
      if (!waiting) return { applied: false, message: this.lastAction };
    }
    writeAttempt({ candidate: this.candidate, previousCache: status.previousCache, currentCache: status.currentCache, startedAt: new Date().toISOString(), recoveryTried: false });
    waiting.postMessage({ type: 'SKIP_WAITING' });
    this.lastAction = 'APPLYING UPDATE • AUTO-RECOVERY ARMED';
    this.history.record('update-apply', 'check', `${status.currentCache} → waiting worker • previous ${status.previousCache ?? 'none'}`);
    return { applied: true, message: this.lastAction };
  }

  async recoverFailedBoot(): Promise<{ recovered: boolean; message: string }> {
    const attempt = readAttempt();
    if (!attempt) return { recovered: false, message: 'NO UPDATE ATTEMPT' };
    if (attempt.recoveryTried) return { recovered: false, message: 'RECOVERY ALREADY TRIED' };
    writeAttempt({ ...attempt, recoveryTried: true });
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return { recovered: false, message: 'NO ACTIVE SERVICE WORKER' };
    try {
      const reply = await this.messageController({ type: 'ROLLBACK_PREVIOUS' });
      if (reply?.ok === true) {
        this.lastAction = `AUTO RECOVERY → ${reply.previous ?? attempt.previousCache ?? 'PREVIOUS'}`;
        this.history.record('update-auto-recovery', 'success', this.lastAction);
        return { recovered: true, message: this.lastAction };
      }
      this.lastAction = reply?.error ?? 'AUTO RECOVERY UNAVAILABLE';
      this.history.record('update-auto-recovery', 'failed', this.lastAction);
      return { recovered: false, message: this.lastAction };
    } catch {
      this.lastAction = 'AUTO RECOVERY FAILED';
      this.history.record('update-auto-recovery', 'failed', this.lastAction);
      return { recovered: false, message: this.lastAction };
    }
  }

  async rollbackPrevious(): Promise<{ applied: boolean; message: string }> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return { applied: false, message: 'NO ACTIVE SERVICE WORKER' };
    try {
      const reply = await this.messageController({ type: 'ROLLBACK_PREVIOUS' });
      const applied = reply?.ok === true;
      this.lastAction = applied ? `ROLLBACK → ${reply.previous ?? 'PREVIOUS'}` : reply?.error ?? 'ROLLBACK UNAVAILABLE';
      this.history.record('rollback', applied ? 'success' : 'failed', this.lastAction);
      return { applied, message: this.lastAction };
    } catch {
      this.lastAction = 'ROLLBACK FAILED';
      this.history.record('rollback', 'failed', this.lastAction);
      return { applied: false, message: this.lastAction };
    }
  }

  async restoreCurrent(): Promise<{ applied: boolean; message: string }> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return { applied: false, message: 'NO ACTIVE SERVICE WORKER' };
    try {
      const reply = await this.messageController({ type: 'RESTORE_CURRENT' });
      const applied = reply?.ok === true;
      this.lastAction = applied ? 'CURRENT ASSETS RESTORED' : reply?.error ?? 'RESTORE FAILED';
      this.history.record('restore-current', applied ? 'success' : 'failed', this.lastAction);
      return { applied, message: this.lastAction };
    } catch {
      this.lastAction = 'RESTORE FAILED';
      this.history.record('restore-current', 'failed', this.lastAction);
      return { applied: false, message: this.lastAction };
    }
  }

  private messageController(message: unknown): Promise<any> {
    return new Promise((resolve, reject) => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) { reject(new Error('No service worker controller')); return; }
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => reject(new Error('Service worker reply timeout')), 1500);
      channel.port1.onmessage = (event) => { window.clearTimeout(timeout); resolve(event.data); };
      controller.postMessage(message, [channel.port2]);
    });
  }
}
