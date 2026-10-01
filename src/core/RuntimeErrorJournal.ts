export const ERROR_JOURNAL_KEY = 'ssc-error-journal-v1';

export type RuntimeErrorKind = 'error' | 'unhandledrejection' | 'boot' | 'load' | 'update';
export type RuntimeErrorSeverity = 'warning' | 'error' | 'fatal';

export interface RuntimeErrorEntry {
  id: string;
  candidate: string;
  occurredAt: string;
  kind: RuntimeErrorKind;
  severity: RuntimeErrorSeverity;
  message: string;
  stack: string | null;
  source: string | null;
  line: number | null;
  column: number | null;
}

export interface RuntimeErrorSnapshot {
  candidate: string;
  total: number;
  fatal: number;
  errors: number;
  warnings: number;
  entries: RuntimeErrorEntry[];
}

function safeMessage(value: unknown): string {
  if (value instanceof Error) return value.message.slice(0, 500);
  if (typeof value === 'string') return value.slice(0, 500);
  try { return JSON.stringify(value).slice(0, 500); } catch { return String(value).slice(0, 500); }
}

function safeStack(value: unknown): string | null {
  if (value instanceof Error && typeof value.stack === 'string') return value.stack.slice(0, 3000);
  return null;
}

export class RuntimeErrorJournal {
  private installed = false;

  constructor(private readonly candidate: string) {}

  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    window.addEventListener('error', (event) => {
      this.record('error', event.error ?? event.message, 'error', {
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
      });
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.record('unhandledrejection', event.reason, 'error');
    });
  }

  record(kind: RuntimeErrorKind, error: unknown, severity: RuntimeErrorSeverity = 'error', detail: { source?: string | null; line?: number | null; column?: number | null } = {}): RuntimeErrorEntry {
    const entry: RuntimeErrorEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      candidate: this.candidate,
      occurredAt: new Date().toISOString(),
      kind,
      severity,
      message: safeMessage(error),
      stack: safeStack(error),
      source: detail.source ?? null,
      line: detail.line ?? null,
      column: detail.column ?? null,
    };
    const all = this.readAll();
    all.push(entry);
    this.writeAll(all.slice(-48));
    return entry;
  }

  snapshot(): RuntimeErrorSnapshot {
    const entries = this.readAll().filter((entry) => entry.candidate === this.candidate).slice(-24);
    return {
      candidate: this.candidate,
      total: entries.length,
      fatal: entries.filter((entry) => entry.severity === 'fatal').length,
      errors: entries.filter((entry) => entry.severity === 'error').length,
      warnings: entries.filter((entry) => entry.severity === 'warning').length,
      entries: entries.map((entry) => ({ ...entry })),
    };
  }

  clearCandidate(): void {
    this.writeAll(this.readAll().filter((entry) => entry.candidate !== this.candidate));
  }

  private readAll(): RuntimeErrorEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = JSON.parse(localStorage.getItem(ERROR_JOURNAL_KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter((item): item is RuntimeErrorEntry => !!item && typeof item === 'object' && typeof item.candidate === 'string' && typeof item.message === 'string');
    } catch { return []; }
  }

  private writeAll(entries: RuntimeErrorEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(ERROR_JOURNAL_KEY, JSON.stringify(entries)); } catch { /* diagnostics must never break the game */ }
  }
}
