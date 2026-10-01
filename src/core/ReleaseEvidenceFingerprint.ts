import type { DeviceCertificationRecord } from './DeviceCertification.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { ReleaseIntegritySnapshot } from './ReleaseIntegrity.js';

export interface ReleaseEvidenceFingerprintInput {
  candidate: string;
  certification: DeviceCertificationRecord;
  errors: RuntimeErrorSnapshot;
  integrity?: ReleaseIntegritySnapshot | null;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => stable(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, stable(item)]));
}

function fnv1a64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0').toUpperCase();
}

export function releaseEvidencePayload(input: ReleaseEvidenceFingerprintInput): unknown {
  const cert = input.certification;
  return stable({
    candidate: input.candidate,
    deviceLabel: cert.deviceLabel,
    tests: Object.entries(cert.tests).map(([id, result]) => ({
      id,
      status: result.status,
      updatedAt: result.updatedAt,
      note: result.note ?? null,
    })),
    touchLatency: {
      status: cert.touchLatency.status,
      samples: [...cert.touchLatency.samples],
      averageMs: cert.touchLatency.averageMs,
      p95Ms: cert.touchLatency.p95Ms,
      measuredAt: cert.touchLatency.measuredAt,
    },
    acceptance: cert.lastAcceptance ? {
      status: cert.lastAcceptance.status,
      passed: cert.lastAcceptance.passed,
      checks: cert.lastAcceptance.checks,
      blocked: cert.lastAcceptance.blocked,
      total: cert.lastAcceptance.total,
      items: cert.lastAcceptance.items.map((item) => ({ id: item.id, status: item.status, detail: item.detail })),
    } : null,
    integrity: input.integrity ? {
      status: input.integrity.status,
      candidate: input.integrity.candidate,
      cache: input.integrity.cache,
      manifestRoot: input.integrity.manifestRoot,
      checked: input.integrity.checked,
      total: input.integrity.total,
      mismatches: [...input.integrity.mismatches],
    } : null,
    errors: {
      total: input.errors.total,
      fatal: input.errors.fatal,
      errors: input.errors.errors,
      warnings: input.errors.warnings,
      entries: input.errors.entries.map((entry) => ({
        id: entry.id,
        occurredAt: entry.occurredAt,
        kind: entry.kind,
        severity: entry.severity,
        message: entry.message,
      })),
    },
  });
}

export function buildReleaseEvidenceFingerprint(input: ReleaseEvidenceFingerprintInput): string {
  return fnv1a64(JSON.stringify(releaseEvidencePayload(input)));
}
