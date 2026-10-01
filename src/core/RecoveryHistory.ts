export const RECOVERY_HISTORY_KEY = 'ssc-recovery-history-v1';

export type RecoveryKind = 'session-recovery' | 'load-recovery' | 'update-apply' | 'update-auto-recovery' | 'rollback' | 'restore-current' | 'device-cert-import' | 'release-approval';
export type RecoveryOutcome = 'success' | 'check' | 'failed';

export interface RecoveryHistoryEntry {
  id: string;
  candidate: string;
  occurredAt: string;
  kind: RecoveryKind;
  outcome: RecoveryOutcome;
  detail: string;
}

export interface RecoveryHistorySnapshot {
  candidate: string;
  total: number;
  success: number;
  checks: number;
  failed: number;
  entries: RecoveryHistoryEntry[];
}

export function summarizeRecoveryHistory(entries: readonly RecoveryHistoryEntry[], candidate: string): RecoveryHistorySnapshot {
  const selected = entries.filter((entry) => entry.candidate === candidate).slice(-24);
  return {
    candidate,
    total: selected.length,
    success: selected.filter((entry) => entry.outcome === 'success').length,
    checks: selected.filter((entry) => entry.outcome === 'check').length,
    failed: selected.filter((entry) => entry.outcome === 'failed').length,
    entries: selected.map((entry) => ({ ...entry })),
  };
}

export class RecoveryHistoryStore {
  constructor(private readonly candidate: string) {}

  record(kind: RecoveryKind, outcome: RecoveryOutcome, detail: string): RecoveryHistoryEntry {
    const entry: RecoveryHistoryEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      candidate: this.candidate,
      occurredAt: new Date().toISOString(),
      kind,
      outcome,
      detail: detail.slice(0, 220),
    };
    const all = this.readAll();
    all.push(entry);
    this.writeAll(all.slice(-64));
    return entry;
  }

  snapshot(): RecoveryHistorySnapshot { return summarizeRecoveryHistory(this.readAll(), this.candidate); }

  clearCandidate(): void { this.writeAll(this.readAll().filter((entry) => entry.candidate !== this.candidate)); }

  private readAll(): RecoveryHistoryEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = JSON.parse(localStorage.getItem(RECOVERY_HISTORY_KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter((entry): entry is RecoveryHistoryEntry => !!entry && typeof entry === 'object' && typeof entry.candidate === 'string' && typeof entry.kind === 'string' && typeof entry.detail === 'string');
    } catch { return []; }
  }

  private writeAll(entries: RecoveryHistoryEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(RECOVERY_HISTORY_KEY, JSON.stringify(entries)); } catch { /* diagnostics are best effort */ }
  }
}
