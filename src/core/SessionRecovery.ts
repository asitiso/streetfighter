export const SESSION_RECOVERY_KEY = 'ssc-session-recovery-v1';

export type RecoverableRoute = 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4' | 'stage-5' | 'ending';

export interface SessionCheckpoint {
  candidate: string;
  sessionId: string;
  status: 'active' | 'clean';
  route: 'title' | RecoverableRoute;
  stage: 1 | 2 | 3 | 4 | 5 | null;
  character: string | null;
  superArt: 1 | 2 | 3 | null;
  startedAt: string;
  updatedAt: string;
  cleanReason: string | null;
}

export interface SessionRecoverySnapshot {
  available: boolean;
  checkpoint: SessionCheckpoint | null;
  label: string;
}

function validStage(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;
}

function sanitize(raw: unknown): SessionCheckpoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<SessionCheckpoint>;
  if (typeof source.sessionId !== 'string' || typeof source.candidate !== 'string') return null;
  const route = source.route;
  if (route !== 'title' && route !== 'stage-1' && route !== 'stage-2' && route !== 'stage-3' && route !== 'stage-4' && route !== 'stage-5' && route !== 'ending') return null;
  return {
    candidate: source.candidate,
    sessionId: source.sessionId,
    status: source.status === 'clean' ? 'clean' : 'active',
    route,
    stage: validStage(source.stage),
    character: typeof source.character === 'string' ? source.character : null,
    superArt: source.superArt === 1 || source.superArt === 2 || source.superArt === 3 ? source.superArt : null,
    startedAt: typeof source.startedAt === 'string' ? source.startedAt : new Date().toISOString(),
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
    cleanReason: typeof source.cleanReason === 'string' ? source.cleanReason : null,
  };
}

export class SessionRecoveryStore {
  private current: SessionCheckpoint | null = null;
  private recoverable: SessionCheckpoint | null = null;

  constructor(private readonly candidate: string) {}

  begin(): SessionRecoverySnapshot {
    const previous = this.read();
    if (previous?.status === 'active' && previous.route !== 'title' && previous.candidate === this.candidate) this.recoverable = previous;
    const now = new Date().toISOString();
    this.current = {
      candidate: this.candidate,
      sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'active',
      route: 'title',
      stage: null,
      character: null,
      superArt: null,
      startedAt: now,
      updatedAt: now,
      cleanReason: null,
    };
    this.persist();
    return this.snapshot();
  }

  checkpoint(route: SessionCheckpoint['route'], stage: SessionCheckpoint['stage'], character: string | null, superArt: 1 | 2 | 3 | null): void {
    if (!this.current) this.begin();
    if (!this.current) return;
    this.current = { ...this.current, status: 'active', route, stage, character, superArt, updatedAt: new Date().toISOString(), cleanReason: null };
    this.persist();
  }

  markClean(reason = 'pagehide'): void {
    if (!this.current) return;
    this.current = { ...this.current, status: 'clean', updatedAt: new Date().toISOString(), cleanReason: reason };
    this.persist();
  }

  consumeRecovery(): SessionCheckpoint | null {
    const value = this.recoverable ? { ...this.recoverable } : null;
    this.recoverable = null;
    return value;
  }

  activeRoute(): string { return this.current?.route ?? 'title'; }

  snapshot(): SessionRecoverySnapshot {
    const checkpoint = this.recoverable ? { ...this.recoverable } : null;
    const label = checkpoint?.stage ? `RESTART STAGE ${checkpoint.stage}` : checkpoint?.route === 'ending' ? 'RESUME ENDING' : 'NO INTERRUPTED SESSION';
    return { available: !!checkpoint, checkpoint, label };
  }

  private read(): SessionCheckpoint | null {
    if (typeof localStorage === 'undefined') return null;
    try { return sanitize(JSON.parse(localStorage.getItem(SESSION_RECOVERY_KEY) ?? 'null')); } catch { return null; }
  }

  private persist(): void {
    if (!this.current || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(SESSION_RECOVERY_KEY, JSON.stringify(this.current)); } catch { /* recovery markers are best effort */ }
  }
}
