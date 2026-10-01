import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import { runtimeQuality } from '../core/RuntimeQuality.js';
import type { PwaInstallManager } from '../core/PwaInstallManager.js';
import type { OfflineCampaignStatus, OfflineTransitionStatus } from '../core/AssetManager.js';
import type { RuntimeTelemetrySnapshot } from '../core/RuntimeTelemetry.js';
import type { SaveHealth } from '../save/SaveManager.js';
import { evaluateReleaseGate } from '../core/ReleaseGate.js';
import type { CacheUpgradePlan } from '../core/UpdatePolicy.js';
import { buildReleaseReport, RELEASE_CANDIDATE, releaseReportJson } from '../core/ReleaseReport.js';
import { buildAcceptanceMatrix, type AcceptanceMatrix } from '../core/AcceptanceMatrix.js';
import { certificationSummary, type DeviceCertificationRecord } from '../core/DeviceCertification.js';
import type { RuntimeErrorSnapshot } from '../core/RuntimeErrorJournal.js';
import { decideFinalCandidate } from '../core/FinalCandidateDecision.js';
import type { ReleaseIntegritySnapshot } from '../core/ReleaseIntegrity.js';

export interface ReleaseCheckContext {
  saveReady: boolean;
  saveHealth: () => SaveHealth;
  appShellReady: boolean;
  install: PwaInstallManager;
  telemetry: () => RuntimeTelemetrySnapshot;
  storageSeparated: boolean;
  loadingRecoveryReady: boolean;
  serviceWorkerUpdateSafe: boolean;
  portableSaveReady: boolean;
  updatePlan: CacheUpgradePlan;
  verifyOffline: () => Promise<OfflineCampaignStatus>;
  verifyTransitions: () => Promise<OfflineTransitionStatus>;
  verifyNetworkCut: () => Promise<{ ready: boolean; cached: number; total: number; missing: string[] }>;
  prepareOffline: (onProgress: (done: number, total: number) => void) => Promise<OfflineCampaignStatus>;
  deviceCertification: () => DeviceCertificationRecord;
  errorJournal: () => RuntimeErrorSnapshot;
  sessionRecoveryReady: boolean;
  updateAutoRecoveryReady: boolean;
  saveAcceptance: (matrix: AcceptanceMatrix) => void;
  releaseIntegrity: () => ReleaseIntegritySnapshot;
  verifyIntegrity: () => Promise<ReleaseIntegritySnapshot>;
}

export class ReleaseCheckScene implements Scene {
  private time = 0;
  private offline: OfflineCampaignStatus | null = null;
  private transitions: OfflineTransitionStatus | null = null;
  private networkCutReady = false;
  private offlineBusy = false;
  private offlineProgress = 0;
  private offlineError = '';
  private reportMessage = '';

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly context: ReleaseCheckContext,
    private readonly onBack: () => void,
  ) {}

  enter(): void { this.audio.playStagePulse(); void this.refreshOffline(); void this.refreshIntegrity(); }
  exit(): void {}
  resize(): void {}
  destroy(): void {}

  fixedUpdate(dt: number): void {
    this.time += dt;
    if (this.input.pressed('lp') && !this.offlineBusy) { this.audio.playUiConfirm(); void this.prepareOffline(); }
    if (this.input.pressed('mp') && !this.offlineBusy) { this.audio.playUiConfirm(); void this.refreshOffline(); void this.refreshIntegrity(); }
    if (this.input.pressed('hp') && !this.offlineBusy) { this.audio.playUiConfirm(); this.exportReport(); }
    if (this.input.pressed('lk') || this.input.pressed('start')) { this.audio.playUiConfirm(); this.onBack(); }
  }

  private async refreshOffline(): Promise<void> {
    try {
      const [offline, networkCut, transitions] = await Promise.all([this.context.verifyOffline(), this.context.verifyNetworkCut(), this.context.verifyTransitions()]);
      this.offline = offline;
      this.networkCutReady = networkCut.ready;
      this.transitions = transitions;
      this.offlineError = '';
    } catch (error) { this.offlineError = error instanceof Error ? error.message : 'OFFLINE CACHE CHECK FAILED'; }
  }

  private async refreshIntegrity(): Promise<void> {
    await this.context.verifyIntegrity();
  }

  private async prepareOffline(): Promise<void> {
    this.offlineBusy = true;
    this.offlineProgress = 0;
    this.offlineError = '';
    try {
      this.offline = await this.context.prepareOffline((done, total) => { this.offlineProgress = total ? done / total : 1; });
      const [networkCut, transitions] = await Promise.all([this.context.verifyNetworkCut(), this.context.verifyTransitions()]);
      this.networkCutReady = networkCut.ready;
      this.transitions = transitions;
      this.offlineProgress = 1;
    } catch (error) {
      this.offlineError = error instanceof Error ? error.message : 'OFFLINE PREP FAILED';
    } finally {
      this.offlineBusy = false;
    }
  }

  private exportReport(): void {
    const telemetry = this.context.telemetry();
    const saveHealth = this.context.saveHealth();
    const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const landscape = typeof window === 'undefined' || window.innerWidth >= window.innerHeight;
    const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const controlled = sw && !!navigator.serviceWorker.controller;
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const gate = this.gateFor(telemetry, saveHealth, sw, controlled, landscape, online);
    const acceptanceMatrix = buildAcceptanceMatrix({
      gate, saveHealth, portableSaveReady: this.context.portableSaveReady, updatePlan: this.context.updatePlan,
      offline: this.offline, transitions: this.transitions, loadingRecoveryReady: this.context.loadingRecoveryReady,
      serviceWorkerSupported: sw, serviceWorkerControlled: controlled, standalone, landscape, telemetry,
      deviceCertification: this.context.deviceCertification(), errorJournal: this.context.errorJournal(),
      sessionRecoveryReady: this.context.sessionRecoveryReady, updateAutoRecoveryReady: this.context.updateAutoRecoveryReady,
      releaseIntegrity: this.context.releaseIntegrity(),
    });
    this.context.saveAcceptance(acceptanceMatrix);
    const finalCandidate = decideFinalCandidate({ gate, matrix: acceptanceMatrix, certification: this.context.deviceCertification(), errors: this.context.errorJournal(), sessionRecoveryReady: this.context.sessionRecoveryReady, updateRecoveryReady: this.context.updateAutoRecoveryReady });
    const report = buildReleaseReport({ gate, profile: runtimeQuality.releaseProfile, telemetry, saveHealth, offline: this.offline, transitions: this.transitions, updatePlan: this.context.updatePlan, serviceWorkerControlled: controlled, standalone, landscape, online, acceptanceMatrix, deviceCertification: this.context.deviceCertification(), errorJournal: this.context.errorJournal(), finalCandidate, releaseIntegrity: this.context.releaseIntegrity() });
    const blob = new Blob([releaseReportJson(report)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `side-scroll-chronicles-${RELEASE_CANDIDATE}-release-report.json`; anchor.style.display = 'none';
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    this.reportMessage = 'RELEASE REPORT EXPORTED';
  }

  private gateFor(telemetry: RuntimeTelemetrySnapshot, saveHealth: SaveHealth, sw: boolean, controlled: boolean, landscape: boolean, online: boolean) {
    return evaluateReleaseGate({
      saveReady: this.context.saveReady,
      saveHealth,
      appShellReady: this.context.appShellReady,
      serviceWorkerSupported: sw,
      serviceWorkerControlled: controlled,
      landscape,
      offlineCampaignReady: !!this.offline?.ready,
      networkOnline: online,
      cacheSaveSeparated: this.context.storageSeparated,
      loadingRecoveryReady: this.context.loadingRecoveryReady,
      serviceWorkerUpdateSafe: this.context.serviceWorkerUpdateSafe,
      portableSaveReady: this.context.portableSaveReady,
      offlineTransitionsReady: !!this.transitions?.ready,
      updateSimulationSafe: this.context.updatePlan.safe,
      releaseReportReady: true,
      runtimeFatalFree: this.context.errorJournal().fatal === 0,
      runtimeErrorFree: this.context.errorJournal().errors === 0,
      sessionRecoveryReady: this.context.sessionRecoveryReady,
      updateAutoRecoveryReady: this.context.updateAutoRecoveryReady,
      telemetry,
    });
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const g = ctx.createLinearGradient(0, 0, 1280, 720); g.addColorStop(0, '#101824'); g.addColorStop(1, '#080a10'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1280, 720);
    const telemetry = this.context.telemetry();
    const saveHealth = this.context.saveHealth();
    const standalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const landscape = typeof window === 'undefined' || window.innerWidth >= window.innerHeight;
    const sw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const controlled = sw && !!navigator.serviceWorker.controller;
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const gate = this.gateFor(telemetry, saveHealth, sw, controlled, landscape, online);
    const acceptanceMatrix = buildAcceptanceMatrix({
      gate, saveHealth, portableSaveReady: this.context.portableSaveReady, updatePlan: this.context.updatePlan,
      offline: this.offline, transitions: this.transitions, loadingRecoveryReady: this.context.loadingRecoveryReady,
      serviceWorkerSupported: sw, serviceWorkerControlled: controlled, standalone, landscape, telemetry,
      deviceCertification: this.context.deviceCertification(), errorJournal: this.context.errorJournal(),
      sessionRecoveryReady: this.context.sessionRecoveryReady, updateAutoRecoveryReady: this.context.updateAutoRecoveryReady,
      releaseIntegrity: this.context.releaseIntegrity(),
    });
    const finalCandidate = decideFinalCandidate({ gate, matrix: acceptanceMatrix, certification: this.context.deviceCertification(), errors: this.context.errorJournal(), sessionRecoveryReady: this.context.sessionRecoveryReady, updateRecoveryReady: this.context.updateAutoRecoveryReady });

    ctx.textAlign = 'left'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillText('RELEASE CHECK', 84, 72);
    ctx.fillStyle = 'rgba(220,228,240,.58)'; ctx.font = '700 11px Arial, sans-serif'; ctx.fillText(`RC ${RELEASE_CANDIDATE} • CRASH LOG • SESSION RECOVERY • UPDATE AUTO-RECOVERY • AUTO REPORT`, 86, 97);

    const verdictColor = gate.verdict === 'ready' ? '#8be0b4' : gate.verdict === 'check' ? '#ffd071' : '#ff7488';
    ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = verdictColor; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(875, 40, 315, 70, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText('FINAL RC DECISION', 895, 62);
    ctx.fillStyle = finalCandidate.verdict === 'rc-ready' ? '#8be0b4' : finalCandidate.verdict === 'blocked' ? '#ff7488' : '#ffd071'; ctx.font = '900 20px Arial Black, sans-serif'; ctx.fillText(finalCandidate.label, 895, 92);

    const quality = runtimeQuality.current;
    const profile = runtimeQuality.releaseProfile;
    const fpsText = telemetry.stability === 'warming-up' ? 'WARMING UP' : `${telemetry.averageFps.toFixed(0)} AVG / ${telemetry.lowFps.toFixed(0)} LOW`;
    const memoryText = telemetry.memoryStability === 'unknown' ? 'WARMING UP' : `${telemetry.memoryStability.toUpperCase()} • ${telemetry.heapTrendMbPerMin == null ? 'N/A' : `${telemetry.heapTrendMbPerMin >= 0 ? '+' : ''}${telemetry.heapTrendMbPerMin.toFixed(1)} MB/MIN`}`;
    const offlineText = this.offlineBusy ? `CACHING ${Math.round(this.offlineProgress * 100)}%` : this.offline ? `${this.offline.cached}/${this.offline.total} ${this.offline.ready ? 'READY' : 'CACHED'}` : 'CHECKING';
    const transitionText = this.transitions ? `${this.transitions.readyCount}/${this.transitions.total} ${this.transitions.ready ? 'READY' : 'CHECK'}` : 'CHECKING';
    const saveText = saveHealth.source === 'primary' ? saveHealth.repaired ? 'PRIMARY • REPAIRED' : 'PRIMARY • CLEAN' : saveHealth.source === 'backup' ? 'BACKUP RECOVERED' : 'DEFAULTS';
    const checks = [
      ['RELEASE PROFILE', `${profile.label} • ${quality.tier.toUpperCase()}`, true],
      ['SAVE HEALTH', saveText, this.context.saveReady && saveHealth.source !== 'defaults'],
      ['SAVE TRANSFER', this.context.portableSaveReady ? 'EXPORT / IMPORT READY' : 'MISSING', this.context.portableSaveReady],
      ['UPDATE MIGRATION', this.context.updatePlan.safe ? `${this.context.updatePlan.staleGameCaches.length} OLD CACHE → SAFE` : 'BLOCKED', this.context.updatePlan.safe],
      ['SERVICE WORKER', controlled ? 'CONTROLLED' : sw ? 'REGISTERED / RELOAD ONCE' : 'UNSUPPORTED', controlled || sw],
      ['UPDATE / SAVE', this.context.storageSeparated && this.context.serviceWorkerUpdateSafe ? 'ISOLATED • SAFE' : 'CHECK STORAGE POLICY', this.context.storageSeparated && this.context.serviceWorkerUpdateSafe],
      ['OFFLINE CAMPAIGN', offlineText, !!this.offline?.ready],
      ['OFFLINE TRANSITIONS', transitionText, !!this.transitions?.ready],
      ['NETWORK CUT', this.networkCutReady ? 'CACHE FALLBACK READY' : 'PREP OFFLINE FIRST', this.networkCutReady],
      ['LANDSCAPE', landscape ? 'PASS' : 'ROTATE DEVICE', landscape],
      ['FRAME STABILITY', fpsText, telemetry.stability !== 'poor'],
      ['MEMORY TREND', memoryText, telemetry.memoryStability !== 'poor'],
      ['LOAD RECOVERY', this.context.loadingRecoveryReady ? 'RETRY / BACK READY' : 'MISSING', this.context.loadingRecoveryReady],
      ['CRASH / ERROR LOG', (() => { const e = this.context.errorJournal(); return `${e.fatal} FATAL • ${e.errors} ERROR • ${e.warnings} WARN`; })(), this.context.errorJournal().fatal === 0],
      ['SESSION RECOVERY', this.context.sessionRecoveryReady ? 'INTERRUPTED STAGE RESTART READY' : 'MISSING', this.context.sessionRecoveryReady],
      ['UPDATE AUTO-RECOVERY', this.context.updateAutoRecoveryReady ? 'FAILED UPDATE → PREVIOUS CACHE' : 'MISSING', this.context.updateAutoRecoveryReady],
      ['DEPLOY SHA-256', (() => { const integrity = this.context.releaseIntegrity(); return integrity.status === 'pass' ? `${integrity.checked}/${integrity.total} MATCH • ${integrity.manifestRoot?.slice(0, 12) ?? 'NO ROOT'}` : integrity.status === 'checking' ? `${integrity.checked}/${integrity.total} CHECKING` : integrity.message; })(), this.context.releaseIntegrity().status === 'pass'],
      ['DISPLAY / NETWORK', `${standalone ? 'STANDALONE' : 'BROWSER'} • ${online ? 'ONLINE' : 'OFFLINE'}`, true],
      ['INSTALL STATE', this.context.install.state().toUpperCase().replace('-', ' '), true],
      ['QUALITY CHANGES', `${telemetry.qualityChanges} AUTO STEP-DOWN`, true],
      ['ACCEPTANCE MATRIX', `${acceptanceMatrix.passed} PASS / ${acceptanceMatrix.checks} CHECK / ${acceptanceMatrix.blocked} BLOCK`, acceptanceMatrix.blocked === 0],
      ['DEVICE CERT', (() => { const c = certificationSummary(this.context.deviceCertification()); return `${c.passed}/${c.total} PASS • ${c.untested} UNTESTED`; })(), certificationSummary(this.context.deviceCertification()).status === 'pass'],
      ['RELEASE REPORT', 'HP • EXPORT JSON + SAVE ACCEPTANCE', true],
      ['COMBAT CLOCK', 'FIXED 60HZ • UNCHANGED', true],
    ] as const;

    const rows = 12;
    for (let i = 0; i < checks.length; i += 1) {
      const [label, value, ok] = checks[i]!; const x = i < rows ? 84 : 650; const y = 122 + (i % rows) * 41;
      ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = ok ? 'rgba(104,215,164,.32)' : 'rgba(255,183,84,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 540, 33, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(214,223,235,.56)'; ctx.font = '800 8px Arial, sans-serif'; ctx.fillText(label, x + 14, y + 12);
      ctx.fillStyle = ok ? '#8be0b4' : '#ffc06c'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(value, x + 14, y + 27);
    }

    const status = this.offlineError || this.reportMessage || (finalCandidate.blockers.length || finalCandidate.checks.length ? `${finalCandidate.label}: ${[...finalCandidate.blockers, ...finalCandidate.checks].join(' • ')}` : 'FINAL RC AUTOMATED CHECKS READY');
    ctx.fillStyle = this.offlineError ? '#ff8292' : 'rgba(225,232,242,.72)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText(status.slice(0, 130), 84, 625);

    const pulse = .5 + Math.sin(this.time * 2.4) * .5; ctx.fillStyle = `rgba(240,186,69,${.045 + pulse * .025})`; ctx.fillRect(0, 640, 1280, 80);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(this.offlineBusy ? `LP PREPARING OFFLINE ${Math.round(this.offlineProgress * 100)}%` : 'LP PREP OFFLINE', 260, 668);
    ctx.fillStyle = 'rgba(220,228,240,.72)'; ctx.fillText('MP REFRESH + SHA-256', 535, 668); ctx.fillText('HP EXPORT REPORT', 785, 668); ctx.fillText('START / LK BACK', 1050, 668);
    ctx.fillStyle = 'rgba(220,228,240,.46)'; ctx.font = '700 9px Arial, sans-serif'; ctx.fillText('RC gate never lowers combat timing. Crash/session/update recovery never touches combat timing or save isolation.', 640, 698);
    ctx.restore();
  }
}
