import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';

export type ReleaseGateVerdict = 'ready' | 'check' | 'blocked';

export interface ReleaseGateInput {
  saveReady: boolean;
  appShellReady: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerControlled: boolean;
  landscape: boolean;
  offlineCampaignReady: boolean;
  telemetry: RuntimeTelemetrySnapshot;
  saveHealth?: { source: 'primary' | 'backup' | 'defaults'; repaired: boolean; backupReady: boolean; issues: readonly string[] };
  networkOnline?: boolean;
  cacheSaveSeparated?: boolean;
  loadingRecoveryReady?: boolean;
  serviceWorkerUpdateSafe?: boolean;
  portableSaveReady?: boolean;
  offlineTransitionsReady?: boolean;
  updateSimulationSafe?: boolean;
  releaseReportReady?: boolean;
  runtimeFatalFree?: boolean;
  runtimeErrorFree?: boolean;
  sessionRecoveryReady?: boolean;
  updateAutoRecoveryReady?: boolean;
}

export interface ReleaseGateResult {
  verdict: ReleaseGateVerdict;
  blockers: string[];
  warnings: string[];
}

export function evaluateReleaseGate(input: ReleaseGateInput): ReleaseGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.saveReady) blockers.push('SAVE');
  if (!input.appShellReady) blockers.push('APP SHELL');
  if (!input.serviceWorkerSupported) blockers.push('SERVICE WORKER');
  if (input.serviceWorkerSupported && !input.serviceWorkerControlled) warnings.push('RELOAD FOR SW CONTROL');
  if (!input.landscape) warnings.push('ROTATE LANDSCAPE');
  if (!input.offlineCampaignReady) warnings.push('OFFLINE CAMPAIGN NOT PREPARED');
  if (input.networkOnline === false && !input.offlineCampaignReady) blockers.push('OFFLINE DATA');
  if (input.cacheSaveSeparated === false) blockers.push('CACHE / SAVE SEPARATION');
  if (input.loadingRecoveryReady === false) blockers.push('LOAD RECOVERY');
  if (input.serviceWorkerUpdateSafe === false) blockers.push('UPDATE SAVE SAFETY');
  if (input.portableSaveReady === false) blockers.push('SAVE EXPORT / IMPORT');
  if (input.offlineTransitionsReady === false) warnings.push('OFFLINE TRANSITIONS');
  if (input.updateSimulationSafe === false) blockers.push('UPDATE MIGRATION');
  if (input.releaseReportReady === false) warnings.push('RELEASE REPORT');
  if (input.runtimeFatalFree === false) blockers.push('RUNTIME FATAL ERROR');
  else if (input.runtimeErrorFree === false) warnings.push('RUNTIME ERROR LOG');
  if (input.sessionRecoveryReady === false) blockers.push('SESSION RECOVERY');
  if (input.updateAutoRecoveryReady === false) blockers.push('UPDATE AUTO-RECOVERY');

  if (input.saveHealth) {
    if (input.saveHealth.source === 'backup') warnings.push('SAVE RECOVERED FROM BACKUP');
    if (input.saveHealth.repaired) warnings.push('SAVE REPAIRED');
    if (!input.saveHealth.backupReady) warnings.push('SAVE BACKUP NOT READY');
  }

  if (input.telemetry.stability === 'poor') blockers.push('FRAME STABILITY');
  else if (input.telemetry.stability === 'watch') warnings.push('FRAME STABILITY');
  else if (input.telemetry.stability === 'warming-up') warnings.push('PERF WARMING UP');

  if (input.telemetry.memoryStability === 'poor') blockers.push('MEMORY GROWTH');
  else if (input.telemetry.memoryStability === 'watch') warnings.push('MEMORY GROWTH');
  if ((input.telemetry.heapPeakMb ?? 0) > 320) warnings.push('HIGH JS HEAP');

  return { verdict: blockers.length ? 'blocked' : warnings.length ? 'check' : 'ready', blockers: Array.from(new Set(blockers)), warnings: Array.from(new Set(warnings)) };
}
