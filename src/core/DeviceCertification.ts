import type { AcceptanceMatrix } from './AcceptanceMatrix.js';

export const DEVICE_CERT_STORAGE_KEY = 'ssc-device-cert-v1';

export type CertificationStatus = 'untested' | 'pass' | 'check' | 'fail';

export interface CertificationTestDef {
  id: string;
  label: string;
  detail: string;
  required: boolean;
}

export interface CertificationTestResult {
  status: CertificationStatus;
  updatedAt: string | null;
  note?: string;
}

export interface TouchLatencyResult {
  samples: number[];
  averageMs: number | null;
  p95Ms: number | null;
  status: CertificationStatus;
  measuredAt: string | null;
}

export interface DeviceCertificationRecord {
  candidate: string;
  deviceLabel: string;
  createdAt: string;
  updatedAt: string;
  tests: Record<string, CertificationTestResult>;
  touchLatency: TouchLatencyResult;
  lastAcceptance: AcceptanceMatrix | null;
}

export interface AutomaticCertificationEvidence {
  standalone: boolean;
  bootedOffline: boolean;
  audioReady: boolean;
  sessionSeconds: number;
  frameStability: 'warming-up' | 'good' | 'watch' | 'poor';
  memoryStability: 'unknown' | 'good' | 'watch' | 'poor';
  sustainedStability?: 'warming-up' | 'good' | 'watch' | 'poor';
  baselineFps?: number | null;
  recentFps?: number | null;
  sustainedDegradationPct?: number | null;
  qualityChanges?: number;
  heapTrendMbPerMin?: number | null;
  safeAreaReady?: boolean;
  safeAreaNote?: string;
}

export interface AutomaticCertificationUpdate {
  id: string;
  status: Extract<CertificationStatus, 'pass' | 'check'>;
  note: string;
}

export function automaticCertificationUpdates(evidence: AutomaticCertificationEvidence): AutomaticCertificationUpdate[] {
  const updates: AutomaticCertificationUpdate[] = [];
  if (evidence.safeAreaReady) updates.push({ id: 'landscape', status: 'pass', note: evidence.safeAreaNote || 'AUTO: landscape safe-area containment confirmed' });
  if (evidence.standalone) updates.push({ id: 'pwa-install', status: 'pass', note: 'AUTO: standalone display mode confirmed' });
  if (evidence.standalone && evidence.bootedOffline) updates.push({ id: 'offline-launch', status: 'pass', note: 'AUTO: standalone app booted while navigator offline' });
  if (evidence.audioReady) updates.push({ id: 'audio-unlock', status: 'pass', note: 'AUTO: Web Audio context running after interaction' });
  if (evidence.sessionSeconds >= 600) {
    const sustained = evidence.sustainedStability ?? 'warming-up';
    const poor = evidence.frameStability === 'poor' || evidence.memoryStability === 'poor' || sustained === 'poor';
    const baseline = evidence.baselineFps == null ? 'N/A' : `${evidence.baselineFps.toFixed(1)}`;
    const recent = evidence.recentFps == null ? 'N/A' : `${evidence.recentFps.toFixed(1)}`;
    const degradation = evidence.sustainedDegradationPct == null ? 'N/A' : `${evidence.sustainedDegradationPct >= 0 ? '+' : ''}${evidence.sustainedDegradationPct.toFixed(1)}%`;
    updates.push({
      id: 'ten-minute-play',
      status: 'check',
      note: poor
        ? `AUTO: 10m warning • sustained ${sustained} • ${baseline}→${recent}fps (${degradation})`
        : `AUTO: 10m runtime clear • ${baseline}→${recent}fps (${degradation}) • confirm device heat`,
    });
  }
  return updates;
}

export const DEVICE_CERT_TESTS: readonly CertificationTestDef[] = [
  { id: 'landscape', label: 'LANDSCAPE / SAFE AREA', detail: 'Notch and rounded corners do not cover HUD or buttons', required: true },
  { id: 'touch-controls', label: '6-BUTTON TOUCH', detail: 'D-pad + LP/MP/HP/LK/MK/HK respond without stuck input', required: true },
  { id: 'audio-unlock', label: 'AUDIO UNLOCK', detail: 'BGM and hit/parry audio start after first interaction', required: true },
  { id: 'pwa-install', label: 'PWA INSTALL / LAUNCH', detail: 'Install to home screen and launch standalone', required: true },
  { id: 'offline-launch', label: 'AIRPLANE MODE LAUNCH', detail: 'Installed app opens with network disabled', required: true },
  { id: 'background-resume', label: 'BACKGROUND / RESUME', detail: 'Return after 30s without stuck input or time jump', required: true },
  { id: 'offline-transition', label: 'OFFLINE STAGE TRANSITION', detail: 'Prepared campaign moves between stages while offline', required: true },
  { id: 'ten-minute-play', label: '10 MINUTE PLAY', detail: 'No severe FPS collapse, freeze, or runaway heat', required: true },
  { id: 'production-review', label: 'FINAL VISUAL / AUDIO REVIEW', detail: 'Stage depth, VFX hierarchy, Gill phases, projectile trails, and ending audio reviewed', required: true },
] as const;

function blankTouchLatency(): TouchLatencyResult {
  return { samples: [], averageMs: null, p95Ms: null, status: 'untested', measuredAt: null };
}

export function createDeviceCertification(candidate: string, now = new Date(), deviceLabel = detectDeviceLabel()): DeviceCertificationRecord {
  const timestamp = now.toISOString();
  return {
    candidate,
    deviceLabel,
    createdAt: timestamp,
    updatedAt: timestamp,
    tests: Object.fromEntries(DEVICE_CERT_TESTS.map((test) => [test.id, { status: 'untested', updatedAt: null }])),
    touchLatency: blankTouchLatency(),
    lastAcceptance: null,
  };
}

export function latencyStats(samples: readonly number[]): Omit<TouchLatencyResult, 'samples' | 'measuredAt'> {
  const clean = samples.filter((value) => Number.isFinite(value) && value >= 0 && value < 500).map((value) => Math.round(value * 10) / 10);
  if (!clean.length) return { averageMs: null, p95Ms: null, status: 'untested' };
  const sorted = [...clean].sort((a, b) => a - b);
  const averageMs = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const p95Ms = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)]!;
  const status: CertificationStatus = clean.length < 5 ? 'check' : p95Ms <= 80 ? 'pass' : p95Ms <= 120 ? 'check' : 'fail';
  return { averageMs: Math.round(averageMs * 10) / 10, p95Ms, status };
}

export function certificationSummary(record: DeviceCertificationRecord): { status: CertificationStatus; passed: number; checks: number; failed: number; untested: number; total: number } {
  const required = DEVICE_CERT_TESTS.filter((test) => test.required).map((test) => record.tests[test.id]?.status ?? 'untested');
  const statuses = [...required, record.touchLatency.status];
  const failed = statuses.filter((status) => status === 'fail').length;
  const checks = statuses.filter((status) => status === 'check').length;
  const untested = statuses.filter((status) => status === 'untested').length;
  const passed = statuses.filter((status) => status === 'pass').length;
  const status: CertificationStatus = failed ? 'fail' : untested ? 'untested' : checks ? 'check' : 'pass';
  return { status, passed, checks, failed, untested, total: statuses.length };
}


export interface DeviceCertificationExport {
  app: 'SIDE-SCROLL CHRONICLES';
  candidate: string;
  exportedAt: string;
  summary: ReturnType<typeof certificationSummary>;
  record: DeviceCertificationRecord;
}

export function deviceCertificationJson(record: DeviceCertificationRecord, now = new Date()): string {
  const payload: DeviceCertificationExport = {
    app: 'SIDE-SCROLL CHRONICLES',
    candidate: record.candidate,
    exportedAt: now.toISOString(),
    summary: certificationSummary(record),
    record: JSON.parse(JSON.stringify(record)) as DeviceCertificationRecord,
  };
  return JSON.stringify(payload, null, 2);
}

export function sanitizeDeviceCertification(raw: unknown, candidate: string): DeviceCertificationRecord {
  const fresh = createDeviceCertification(candidate);
  if (!raw || typeof raw !== 'object') return fresh;
  const source = raw as Partial<DeviceCertificationRecord>;
  const tests: Record<string, CertificationTestResult> = {};
  for (const def of DEVICE_CERT_TESTS) {
    const incoming = source.tests?.[def.id];
    const status = incoming?.status;
    tests[def.id] = {
      status: status === 'pass' || status === 'check' || status === 'fail' || status === 'untested' ? status : 'untested',
      updatedAt: typeof incoming?.updatedAt === 'string' ? incoming.updatedAt : null,
      ...(typeof incoming?.note === 'string' ? { note: incoming.note.slice(0, 120) } : {}),
    };
  }
  const latencySamples = Array.isArray(source.touchLatency?.samples) ? source.touchLatency.samples.filter((value): value is number => typeof value === 'number').slice(-16) : [];
  const stats = latencyStats(latencySamples);
  return {
    candidate,
    deviceLabel: typeof source.deviceLabel === 'string' && source.deviceLabel ? source.deviceLabel.slice(0, 80) : fresh.deviceLabel,
    createdAt: typeof source.createdAt === 'string' ? source.createdAt : fresh.createdAt,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : fresh.updatedAt,
    tests,
    touchLatency: {
      samples: latencySamples,
      ...stats,
      measuredAt: typeof source.touchLatency?.measuredAt === 'string' ? source.touchLatency.measuredAt : null,
    },
    lastAcceptance: source.lastAcceptance && typeof source.lastAcceptance === 'object' ? source.lastAcceptance : null,
  };
}


export interface DeviceCertificationImportResult {
  ok: boolean;
  message: string;
  record: DeviceCertificationRecord | null;
}

export function parseDeviceCertificationJson(text: string, candidate: string): DeviceCertificationImportResult {
  try {
    const raw = JSON.parse(text) as Partial<DeviceCertificationExport> | DeviceCertificationRecord;
    const exported = (raw as Partial<DeviceCertificationExport>).record;
    const source = exported && typeof exported === 'object' ? exported : raw as DeviceCertificationRecord;
    const sourceCandidate = typeof (raw as Partial<DeviceCertificationExport>).candidate === 'string'
      ? (raw as Partial<DeviceCertificationExport>).candidate
      : typeof source.candidate === 'string' ? source.candidate : '';
    if (sourceCandidate && sourceCandidate !== candidate) return { ok: false, message: `CANDIDATE MISMATCH • ${sourceCandidate}`, record: null };
    const record = sanitizeDeviceCertification(source, candidate);
    return { ok: true, message: 'DEVICE CERTIFICATION IMPORTED', record };
  } catch {
    return { ok: false, message: 'INVALID CERTIFICATION JSON', record: null };
  }
}

export class DeviceCertificationStore {
  private record: DeviceCertificationRecord;

  constructor(private readonly candidate: string) {
    this.record = this.load();
  }

  snapshot(): DeviceCertificationRecord {
    return JSON.parse(JSON.stringify(this.record)) as DeviceCertificationRecord;
  }

  setTest(id: string, status: CertificationStatus, note?: string): DeviceCertificationRecord {
    if (!DEVICE_CERT_TESTS.some((test) => test.id === id)) return this.snapshot();
    const now = new Date().toISOString();
    this.record.tests[id] = { status, updatedAt: now, ...(note ? { note: note.slice(0, 120) } : {}) };
    this.record.updatedAt = now;
    this.persist();
    return this.snapshot();
  }

  applyAutomaticEvidence(evidence: AutomaticCertificationEvidence): DeviceCertificationRecord {
    let changed = false;
    for (const update of automaticCertificationUpdates(evidence)) changed = this.setAutomaticTest(update.id, update.status, update.note) || changed;
    if (changed) this.persist();
    return this.snapshot();
  }

  recordBackgroundResume(durationMs: number): DeviceCertificationRecord {
    if (!Number.isFinite(durationMs) || durationMs < 30_000) return this.snapshot();
    const seconds = Math.round(durationMs / 100) / 10;
    if (this.setAutomaticTest('background-resume', 'pass', `AUTO: resumed after ${seconds.toFixed(1)}s background; inputs released`)) this.persist();
    return this.snapshot();
  }

  setLatency(samples: readonly number[]): DeviceCertificationRecord {
    const now = new Date().toISOString();
    const clean = samples.filter((value) => Number.isFinite(value) && value >= 0 && value < 500).slice(-16);
    this.record.touchLatency = { samples: [...clean], ...latencyStats(clean), measuredAt: now };
    this.record.updatedAt = now;
    this.persist();
    return this.snapshot();
  }

  saveAcceptance(matrix: AcceptanceMatrix): DeviceCertificationRecord {
    this.record.lastAcceptance = JSON.parse(JSON.stringify(matrix)) as AcceptanceMatrix;
    this.record.updatedAt = new Date().toISOString();
    this.persist();
    return this.snapshot();
  }

  importJson(text: string): DeviceCertificationImportResult {
    const result = parseDeviceCertificationJson(text, this.candidate);
    if (!result.ok || !result.record) return result;
    this.record = result.record;
    this.record.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true, message: result.message, record: this.snapshot() };
  }

  reset(): DeviceCertificationRecord {
    this.record = createDeviceCertification(this.candidate, new Date(), this.record.deviceLabel);
    this.persist();
    return this.snapshot();
  }

  private setAutomaticTest(id: string, status: Extract<CertificationStatus, 'pass' | 'check'>, note: string): boolean {
    const current = this.record.tests[id];
    if (!current) return false;
    if (current.status === 'fail' || current.status === 'pass') return false;
    if (current.status === 'check' && status === 'check') return false;
    const now = new Date().toISOString();
    this.record.tests[id] = { status, updatedAt: now, note: note.slice(0, 120) };
    this.record.updatedAt = now;
    return true;
  }

  private load(): DeviceCertificationRecord {
    if (typeof localStorage === 'undefined') return createDeviceCertification(this.candidate);
    try {
      const raw = localStorage.getItem(DEVICE_CERT_STORAGE_KEY);
      if (!raw) return createDeviceCertification(this.candidate);
      const parsed = JSON.parse(raw) as Partial<DeviceCertificationRecord> | null;
      if (parsed && typeof parsed.candidate === 'string' && parsed.candidate !== this.candidate) return createDeviceCertification(this.candidate);
      return sanitizeDeviceCertification(parsed, this.candidate);
    } catch {
      return createDeviceCertification(this.candidate);
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(DEVICE_CERT_STORAGE_KEY, JSON.stringify(this.record)); } catch { /* private mode / quota */ }
  }
}

function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'TEST DEVICE';
  const nav = navigator as Navigator & { userAgentData?: { platform?: string }; deviceMemory?: number };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? 'DEVICE';
  const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency}C` : 'CPU?';
  const memory = nav.deviceMemory ? `${nav.deviceMemory}GB` : 'RAM?';
  return `${platform} • ${cores} • ${memory}`;
}
