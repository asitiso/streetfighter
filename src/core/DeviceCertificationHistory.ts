import { certificationSummary, sanitizeDeviceCertification, type DeviceCertificationExport, type DeviceCertificationRecord } from './DeviceCertification.js';

export const DEVICE_CERT_HISTORY_KEY = 'ssc-device-cert-history-v1';

export interface DeviceCertificationHistoryEntry {
  id: string;
  candidate: string;
  deviceLabel: string;
  capturedAt: string;
  source: 'current' | 'import' | 'upgrade';
  record: DeviceCertificationRecord;
}

export interface DeviceCertificationHistorySnapshot {
  total: number;
  devices: number;
  candidates: number;
  entries: DeviceCertificationHistoryEntry[];
}

export interface CertificationComparison {
  deviceLabel: string;
  currentCandidate: string;
  previousCandidate: string | null;
  current: { passed: number; total: number; status: string; p95Ms: number | null };
  previous: { passed: number; total: number; status: string; p95Ms: number | null } | null;
  regression: boolean;
  detail: string;
}

function cloneRecord(record: DeviceCertificationRecord): DeviceCertificationRecord {
  return JSON.parse(JSON.stringify(record)) as DeviceCertificationRecord;
}

function validCandidate(value: unknown): value is string { return typeof value === 'string' && /^\d+\.\d+\.\d+-rc\.\d+$/.test(value); }

export function parseCertificationForHistory(text: string): { ok: boolean; message: string; record: DeviceCertificationRecord | null } {
  try {
    const raw = JSON.parse(text) as Partial<DeviceCertificationExport> | DeviceCertificationRecord;
    const exportedRecord = (raw as Partial<DeviceCertificationExport>).record;
    const source = exportedRecord && typeof exportedRecord === 'object' ? exportedRecord : raw as DeviceCertificationRecord;
    const candidate = validCandidate((raw as Partial<DeviceCertificationExport>).candidate)
      ? (raw as Partial<DeviceCertificationExport>).candidate!
      : validCandidate(source.candidate) ? source.candidate : '';
    if (!candidate) return { ok: false, message: 'CERTIFICATION CANDIDATE MISSING', record: null };
    return { ok: true, message: `ARCHIVED ${candidate}`, record: sanitizeDeviceCertification(source, candidate) };
  } catch {
    return { ok: false, message: 'INVALID CERTIFICATION JSON', record: null };
  }
}

export function compareLatestCertification(entries: readonly DeviceCertificationHistoryEntry[], currentCandidate: string, currentRecord: DeviceCertificationRecord): CertificationComparison {
  const sameDevice = entries
    .filter((entry) => entry.deviceLabel === currentRecord.deviceLabel && entry.candidate !== currentCandidate)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const previousEntry = sameDevice[0] ?? null;
  const currentSummary = certificationSummary(currentRecord);
  const previousSummary = previousEntry ? certificationSummary(previousEntry.record) : null;
  const currentP95 = currentRecord.touchLatency.p95Ms;
  const previousP95 = previousEntry?.record.touchLatency.p95Ms ?? null;
  const statusRank = (status: string) => status === 'pass' ? 0 : status === 'check' ? 1 : status === 'untested' ? 2 : 3;
  const regression = !!previousEntry && (
    statusRank(currentSummary.status) > statusRank(previousSummary!.status)
    || (currentP95 != null && previousP95 != null && currentP95 > previousP95 + 20)
  );
  return {
    deviceLabel: currentRecord.deviceLabel,
    currentCandidate,
    previousCandidate: previousEntry?.candidate ?? null,
    current: { passed: currentSummary.passed, total: currentSummary.total, status: currentSummary.status, p95Ms: currentP95 },
    previous: previousEntry && previousSummary ? { passed: previousSummary.passed, total: previousSummary.total, status: previousSummary.status, p95Ms: previousP95 } : null,
    regression,
    detail: previousEntry ? (regression ? 'REGRESSION DETECTED' : 'NO CERTIFICATION REGRESSION') : 'NO PRIOR CERTIFICATION FOR THIS DEVICE',
  };
}

export class DeviceCertificationHistoryStore {
  constructor(private readonly currentCandidate: string) { this.archiveLegacyCurrent(); }

  archive(record: DeviceCertificationRecord, source: DeviceCertificationHistoryEntry['source'] = 'current'): DeviceCertificationHistoryEntry {
    const entry: DeviceCertificationHistoryEntry = {
      id: `${record.candidate}:${record.deviceLabel}:${record.updatedAt}`,
      candidate: record.candidate,
      deviceLabel: record.deviceLabel,
      capturedAt: new Date().toISOString(),
      source,
      record: cloneRecord(record),
    };
    const all = this.readAll().filter((existing) => existing.id !== entry.id);
    all.push(entry);
    this.writeAll(all.slice(-48));
    return entry;
  }

  importJson(text: string): { ok: boolean; message: string; entry?: DeviceCertificationHistoryEntry } {
    const parsed = parseCertificationForHistory(text);
    if (!parsed.ok || !parsed.record) return { ok: false, message: parsed.message };
    const entry = this.archive(parsed.record, 'import');
    return { ok: true, message: parsed.message, entry };
  }

  snapshot(): DeviceCertificationHistorySnapshot {
    const entries = this.readAll().sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    return {
      total: entries.length,
      devices: new Set(entries.map((entry) => entry.deviceLabel)).size,
      candidates: new Set(entries.map((entry) => entry.candidate)).size,
      entries: entries.map((entry) => ({ ...entry, record: cloneRecord(entry.record) })),
    };
  }

  compareCurrent(record: DeviceCertificationRecord): CertificationComparison {
    return compareLatestCertification(this.readAll(), this.currentCandidate, record);
  }

  private archiveLegacyCurrent(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = JSON.parse(localStorage.getItem('ssc-device-cert-v1') ?? 'null') as Partial<DeviceCertificationRecord> | null;
      if (!raw || !validCandidate(raw.candidate) || raw.candidate === this.currentCandidate) return;
      const record = sanitizeDeviceCertification(raw, raw.candidate);
      this.archive(record, 'upgrade');
    } catch { /* history capture is best effort */ }
  }

  private readAll(): DeviceCertificationHistoryEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = JSON.parse(localStorage.getItem(DEVICE_CERT_HISTORY_KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter((entry): entry is DeviceCertificationHistoryEntry => !!entry && typeof entry === 'object' && validCandidate(entry.candidate) && typeof entry.deviceLabel === 'string' && !!entry.record);
    } catch { return []; }
  }

  private writeAll(entries: DeviceCertificationHistoryEntry[]): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(DEVICE_CERT_HISTORY_KEY, JSON.stringify(entries)); } catch { /* diagnostics only */ }
  }
}
