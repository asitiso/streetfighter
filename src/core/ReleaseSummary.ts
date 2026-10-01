import { certificationSummary, type DeviceCertificationRecord } from './DeviceCertification.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { RecoveryHistorySnapshot } from './RecoveryHistory.js';
import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';
import type { SaveHealth } from '../save/SaveManager.js';

export type ReleaseSummaryStatus = 'ready' | 'check' | 'blocked';

export interface ReleaseSummaryInput {
  candidate: string;
  save: SaveHealth;
  certification: DeviceCertificationRecord;
  errors: RuntimeErrorSnapshot;
  recovery: RecoveryHistorySnapshot;
  telemetry: RuntimeTelemetrySnapshot;
  serviceWorkerControlled: boolean;
  standalone: boolean;
  online: boolean;
}

export interface ReleaseSummary {
  candidate: string;
  generatedAt: string;
  status: ReleaseSummaryStatus;
  headline: string;
  rows: Array<{ label: string; value: string; status: 'pass' | 'check' | 'block' }>;
}

export function buildReleaseSummary(input: ReleaseSummaryInput, now = new Date()): ReleaseSummary {
  const cert = certificationSummary(input.certification);
  const rows: ReleaseSummary['rows'] = [];
  rows.push({ label: 'SAVE', value: input.save.source === 'primary' && !input.save.repaired ? 'PRIMARY CLEAN' : input.save.source === 'backup' ? 'BACKUP RECOVERED' : 'CHECK SAVE', status: input.save.source === 'primary' && !input.save.repaired ? 'pass' : input.save.source === 'backup' ? 'check' : 'block' });
  rows.push({ label: 'DEVICE CERT', value: `${cert.passed}/${cert.total} PASS`, status: cert.status === 'pass' ? 'pass' : cert.status === 'fail' ? 'block' : 'check' });
  rows.push({ label: 'TOUCH P95', value: input.certification.touchLatency.p95Ms == null ? 'NOT MEASURED' : `${input.certification.touchLatency.p95Ms.toFixed(1)} MS`, status: input.certification.touchLatency.status === 'pass' ? 'pass' : input.certification.touchLatency.status === 'fail' ? 'block' : 'check' });
  rows.push({ label: 'CRASH LOG', value: `${input.errors.fatal} FATAL • ${input.errors.errors} ERROR`, status: input.errors.fatal ? 'block' : input.errors.errors ? 'check' : 'pass' });
  rows.push({ label: 'RECOVERY HISTORY', value: `${input.recovery.success} SUCCESS • ${input.recovery.failed} FAILED`, status: input.recovery.failed ? 'check' : 'pass' });
  rows.push({ label: 'FRAME', value: `${input.telemetry.averageFps.toFixed(0)} AVG / ${input.telemetry.lowFps.toFixed(0)} LOW`, status: input.telemetry.stability === 'poor' ? 'block' : input.telemetry.stability === 'good' ? 'pass' : 'check' });
  rows.push({ label: 'MEMORY', value: input.telemetry.heapTrendMbPerMin == null ? 'NO HEAP API' : `${input.telemetry.heapTrendMbPerMin >= 0 ? '+' : ''}${input.telemetry.heapTrendMbPerMin.toFixed(1)} MB/MIN`, status: input.telemetry.memoryStability === 'poor' ? 'block' : input.telemetry.memoryStability === 'good' ? 'pass' : 'check' });
  rows.push({ label: 'PWA', value: `${input.serviceWorkerControlled ? 'CONTROLLED' : 'CHECK SW'} • ${input.standalone ? 'STANDALONE' : 'BROWSER'}`, status: input.serviceWorkerControlled && input.standalone ? 'pass' : 'check' });
  rows.push({ label: 'NETWORK', value: input.online ? 'ONLINE' : 'OFFLINE', status: 'pass' });
  const blocked = rows.some((row) => row.status === 'block');
  const checks = rows.some((row) => row.status === 'check');
  const status: ReleaseSummaryStatus = blocked ? 'blocked' : checks ? 'check' : 'ready';
  return { candidate: input.candidate, generatedAt: now.toISOString(), status, headline: status === 'ready' ? 'RELEASE CANDIDATE READY' : status === 'blocked' ? 'RELEASE BLOCKED' : 'DEVICE / RUNTIME CHECK REQUIRED', rows };
}
