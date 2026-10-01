import type { ReleaseGateResult } from './ReleaseGate.js';
import type { OfflineCampaignStatus, OfflineTransitionStatus } from './AssetManager.js';
import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';
import { certificationSummary, type DeviceCertificationRecord } from './DeviceCertification.js';
import type { SaveHealth } from '../save/SaveManager.js';
import type { CacheUpgradePlan } from './UpdatePolicy.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { ReleaseIntegritySnapshot } from './ReleaseIntegrity.js';

export type AcceptanceStatus = 'pass' | 'check' | 'block';

export interface AcceptanceItem {
  id: string;
  label: string;
  status: AcceptanceStatus;
  detail: string;
}

export interface AcceptanceMatrix {
  status: AcceptanceStatus;
  passed: number;
  checks: number;
  blocked: number;
  total: number;
  items: AcceptanceItem[];
}

export interface AcceptanceMatrixInput {
  gate: ReleaseGateResult;
  saveHealth: SaveHealth;
  portableSaveReady: boolean;
  updatePlan: CacheUpgradePlan;
  offline: OfflineCampaignStatus | null;
  transitions: OfflineTransitionStatus | null;
  loadingRecoveryReady: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerControlled: boolean;
  standalone: boolean;
  landscape: boolean;
  telemetry: RuntimeTelemetrySnapshot;
  deviceCertification?: DeviceCertificationRecord | null;
  errorJournal?: RuntimeErrorSnapshot | null;
  sessionRecoveryReady?: boolean;
  updateAutoRecoveryReady?: boolean;
  releaseIntegrity?: ReleaseIntegritySnapshot | null;
}

function item(id: string, label: string, status: AcceptanceStatus, detail: string): AcceptanceItem {
  return { id, label, status, detail };
}

export function buildAcceptanceMatrix(input: AcceptanceMatrixInput): AcceptanceMatrix {
  const rows: AcceptanceItem[] = [];
  const saveGood = input.saveHealth.source !== 'defaults' && !input.saveHealth.repaired;
  rows.push(item('save-health', 'SAVE HEALTH', saveGood ? 'pass' : input.saveHealth.source === 'backup' ? 'check' : 'block',
    saveGood ? 'PRIMARY CLEAN' : input.saveHealth.source === 'backup' ? 'BACKUP RECOVERED' : 'DEFAULT / REPAIRED'));
  rows.push(item('save-portable', 'SAVE EXPORT / IMPORT', input.portableSaveReady ? 'pass' : 'block', input.portableSaveReady ? 'CHECKSUM PACKAGE READY' : 'MISSING'));
  rows.push(item('update-safety', 'CACHE → SAVE ISOLATION', input.updatePlan.safe ? 'pass' : 'block',
    input.updatePlan.safe ? `${input.updatePlan.staleGameCaches.length} STALE GAME CACHE(S) SAFE TO REMOVE` : 'SAVE/CACHE POLICY UNSAFE'));

  const offlineStatus: AcceptanceStatus = input.offline?.ready ? 'pass' : 'check';
  rows.push(item('offline-campaign', 'OFFLINE CAMPAIGN', offlineStatus,
    input.offline ? `${input.offline.cached}/${input.offline.total} CACHED` : 'NOT CHECKED'));

  if (input.transitions) {
    for (const transition of input.transitions.transitions) {
      rows.push(item(`offline-${transition.id}`, transition.label, transition.ready ? 'pass' : 'check', transition.ready ? 'READY' : `${transition.missing.length} FILE(S) MISSING`));
    }
  } else {
    rows.push(item('offline-transitions', 'OFFLINE TRANSITIONS', 'check', 'NOT CHECKED'));
  }

  rows.push(item('load-recovery', 'LOAD FAILURE RECOVERY', input.loadingRecoveryReady ? 'pass' : 'block', input.loadingRecoveryReady ? 'RETRY / BACK READY' : 'MISSING'));
  const errorStatus: AcceptanceStatus = (input.errorJournal?.fatal ?? 0) > 0 ? 'block' : (input.errorJournal?.errors ?? 0) > 0 ? 'check' : 'pass';
  rows.push(item('runtime-errors', 'CRASH / ERROR JOURNAL', errorStatus, input.errorJournal ? `${input.errorJournal.fatal} FATAL • ${input.errorJournal.errors} ERROR • ${input.errorJournal.warnings} WARN` : 'NO CURRENT-CANDIDATE ERRORS'));
  rows.push(item('session-recovery', 'SESSION INTERRUPTION RECOVERY', input.sessionRecoveryReady === false ? 'block' : 'pass', input.sessionRecoveryReady === false ? 'MISSING' : 'STAGE RESTART CHECKPOINT READY'));
  rows.push(item('update-auto-recovery', 'UPDATE FAILURE AUTO-RECOVERY', input.updateAutoRecoveryReady === false ? 'block' : 'pass', input.updateAutoRecoveryReady === false ? 'MISSING' : 'PREVIOUS CACHE FALLBACK ARMED'));
  if (input.releaseIntegrity) {
    const integrityStatus: AcceptanceStatus = input.releaseIntegrity.status === 'pass' ? 'pass' : input.releaseIntegrity.status === 'fail' ? 'block' : 'check';
    rows.push(item('release-integrity', 'DEPLOY SHA-256 INTEGRITY', integrityStatus, input.releaseIntegrity.status === 'pass' ? `${input.releaseIntegrity.checked}/${input.releaseIntegrity.total} FILES • ${input.releaseIntegrity.manifestRoot?.slice(0, 16) ?? 'NO ROOT'}` : input.releaseIntegrity.message));
  }
  rows.push(item('service-worker', 'SERVICE WORKER', !input.serviceWorkerSupported ? 'block' : input.serviceWorkerControlled ? 'pass' : 'check',
    !input.serviceWorkerSupported ? 'UNSUPPORTED' : input.serviceWorkerControlled ? 'CONTROLLING PAGE' : 'REGISTERED — RELOAD ONCE'));
  rows.push(item('standalone', 'PWA STANDALONE', input.standalone ? 'pass' : 'check', input.standalone ? 'STANDALONE' : 'BROWSER MODE'));
  rows.push(item('landscape', 'LANDSCAPE', input.landscape ? 'pass' : 'check', input.landscape ? 'PASS' : 'ROTATE DEVICE'));

  const frameStatus: AcceptanceStatus = input.telemetry.stability === 'poor' ? 'block' : input.telemetry.stability === 'good' ? 'pass' : 'check';
  rows.push(item('frame-stability', 'FRAME STABILITY', frameStatus,
    `${input.telemetry.averageFps.toFixed(1)} AVG / ${input.telemetry.lowFps.toFixed(1)} LOW`));
  const memoryStatus: AcceptanceStatus = input.telemetry.memoryStability === 'poor' ? 'block' : input.telemetry.memoryStability === 'good' ? 'pass' : 'check';
  rows.push(item('memory-trend', 'MEMORY TREND', memoryStatus,
    input.telemetry.heapTrendMbPerMin == null ? 'NO HEAP API' : `${input.telemetry.heapTrendMbPerMin >= 0 ? '+' : ''}${input.telemetry.heapTrendMbPerMin.toFixed(1)} MB/MIN`));

  if (input.deviceCertification) {
    const cert = certificationSummary(input.deviceCertification);
    const certStatus: AcceptanceStatus = cert.status === 'pass' ? 'pass' : cert.status === 'fail' ? 'block' : 'check';
    rows.push(item('device-certification', 'DEVICE CERTIFICATION', certStatus, `${cert.passed}/${cert.total} PASS • ${cert.failed} FAIL • ${cert.untested} UNTESTED`));
    const latency = input.deviceCertification.touchLatency;
    const latencyStatus: AcceptanceStatus = latency.status === 'pass' ? 'pass' : latency.status === 'fail' ? 'block' : 'check';
    rows.push(item('touch-latency', 'TOUCH LATENCY', latencyStatus, latency.p95Ms == null ? 'NOT MEASURED' : `AVG ${latency.averageMs?.toFixed(1)} MS • P95 ${latency.p95Ms.toFixed(1)} MS`));
  }

  // Preserve the stricter aggregate gate in the matrix instead of hiding a global blocker.
  rows.push(item('release-gate', 'AUTOMATED RELEASE GATE', input.gate.verdict === 'blocked' ? 'block' : input.gate.verdict === 'check' ? 'check' : 'pass',
    input.gate.verdict.toUpperCase()));

  const blocked = rows.filter((row) => row.status === 'block').length;
  const checks = rows.filter((row) => row.status === 'check').length;
  const passed = rows.filter((row) => row.status === 'pass').length;
  return { status: blocked ? 'block' : checks ? 'check' : 'pass', passed, checks, blocked, total: rows.length, items: rows };
}
