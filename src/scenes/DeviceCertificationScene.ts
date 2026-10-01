import type { RenderContext, Scene } from '../core/Scene.js';
import type { Action, InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import { DEVICE_CERT_TESTS, certificationSummary, type CertificationStatus, type DeviceCertificationRecord, type TouchLatencyResult } from '../core/DeviceCertification.js';
import { TouchLatencyProbe } from '../core/TouchLatencyProbe.js';
import type { OfflineDynamicImportAudit } from '../core/AssetManager.js';
import type { RuntimeTelemetrySnapshot } from '../core/RuntimeTelemetry.js';
import { remainingCertificationActions } from '../core/FinalProofBundle.js';

const TOUCH_AUDIT_ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'lp', 'mp', 'hp', 'lk', 'mk', 'hk'] as const;

export interface DeviceCertificationContext {
  candidate: string;
  canvas: HTMLCanvasElement;
  getRecord: () => DeviceCertificationRecord;
  setTest: (id: string, status: CertificationStatus, note?: string) => DeviceCertificationRecord;
  setLatency: (samples: readonly number[]) => DeviceCertificationRecord;
  syncAutomaticEvidence: () => DeviceCertificationRecord;
  reset: () => DeviceCertificationRecord;
  exportFinalProof: () => void;
  importCertification: () => Promise<{ ok: boolean; message: string; record?: DeviceCertificationRecord }>;
  setTouchVisible: (visible: boolean) => void;
  runOfflineTransitionAudit: () => Promise<OfflineDynamicImportAudit>;
  getTelemetry: () => RuntimeTelemetrySnapshot;
}

export class DeviceCertificationScene implements Scene {
  private time = 0;
  private index = 0;
  private record: DeviceCertificationRecord;
  private latency = new TouchLatencyProbe();
  private latencyPreview: TouchLatencyResult | null = null;
  private lock = 0;
  private message = '';
  private autoSync = 0;
  private touchAuditRunning = false;
  private touchAudit = new Set<Action>();
  private offlineAuditBusy = false;
  private offlineAudit: OfflineDynamicImportAudit | null = null;

  constructor(
    private readonly input: InputManager,
    private readonly audio: AudioManager,
    private readonly context: DeviceCertificationContext,
    private readonly onBack: () => void,
  ) { this.record = context.getRecord(); }

  enter(): void {
    this.record = this.context.syncAutomaticEvidence();
    this.audio.playStagePulse();
  }
  exit(): void { this.latency.stop(); this.touchAuditRunning = false; this.context.setTouchVisible(true); }
  resize(): void {}
  destroy(): void { this.latency.stop(); this.touchAuditRunning = false; this.context.setTouchVisible(true); }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.autoSync += dt;
    if (this.autoSync >= 2) {
      this.autoSync = 0;
      this.record = this.context.syncAutomaticEvidence();
    }
    if (this.lock > 0) this.lock -= 1;

    if (this.touchAuditRunning) {
      for (const action of TOUCH_AUDIT_ACTIONS) if (this.input.touchPressed(action)) this.touchAudit.add(action);
      if (this.touchAudit.size >= TOUCH_AUDIT_ACTIONS.length) {
        this.touchAuditRunning = false;
        this.record = this.context.setTest('touch-controls', 'pass', 'AUTO: real-touch D-pad + 6 attack buttons detected 10/10');
        this.message = 'REAL TOUCH AUDIT 10/10 PASS';
        this.audio.playUiConfirm();
        this.lock = 6;
        return;
      }
      if (this.input.pressed('start')) {
        this.touchAuditRunning = false;
        this.touchAudit.clear();
        this.message = 'TOUCH AUDIT CANCELLED';
        this.audio.playUiConfirm();
      }
      return;
    }

    if (this.latency.running) {
      if (this.input.pressed('start') || this.input.pressed('lk')) { this.latency.stop(); this.context.setTouchVisible(true); this.audio.playUiConfirm(); }
      return;
    }
    if (this.lock > 0) return;
    const totalRows = DEVICE_CERT_TESTS.length + 3;
    if (this.input.pressed('up')) { this.index = (this.index + totalRows - 1) % totalRows; this.lock = 4; this.audio.playMenuMove(); }
    if (this.input.pressed('down')) { this.index = (this.index + 1) % totalRows; this.lock = 4; this.audio.playMenuMove(); }
    if (this.input.pressed('lp') && this.index < DEVICE_CERT_TESTS.length) this.mark('pass');
    if (this.input.pressed('mp') && this.index < DEVICE_CERT_TESTS.length) this.mark('check');
    if (this.input.pressed('hk') && this.index < DEVICE_CERT_TESTS.length) this.mark('fail');
    if (this.input.pressed('hp')) {
      if (this.index === DEVICE_CERT_TESTS.length) this.startLatency();
      else if (this.index === DEVICE_CERT_TESTS.length + 1) this.focusNextRequired();
      else if (this.index === DEVICE_CERT_TESTS.length + 2) { void this.importCertification(); }
      else if (DEVICE_CERT_TESTS[this.index]?.id === 'touch-controls') this.startTouchAudit();
      else if (DEVICE_CERT_TESTS[this.index]?.id === 'offline-transition') void this.startOfflineTransitionAudit();
      else if (DEVICE_CERT_TESTS[this.index]?.id === 'ten-minute-play') this.confirmTenMinuteHeat();
      else this.mark('untested');
    }
    if (this.input.pressed('lp') && this.index === DEVICE_CERT_TESTS.length + 1) { this.context.exportFinalProof(); this.message = 'FINAL PROOF EXPORTED'; this.audio.playUiConfirm(); this.lock = 5; }
    if (this.input.pressed('mk')) { this.record = this.context.reset(); this.latencyPreview = null; this.touchAudit.clear(); this.message = 'CERTIFICATION RESET'; this.audio.playUiConfirm(); }
    if (this.input.pressed('start') || this.input.pressed('lk')) { this.audio.playUiConfirm(); this.onBack(); }
  }


  private focusNextRequired(): void {
    this.record = this.context.syncAutomaticEvidence();
    const remaining = remainingCertificationActions(this.record).filter((action) => action.status !== 'done');
    if (!remaining.length) {
      this.context.exportFinalProof();
      this.message = 'DEVICE CERT COMPLETE • UNSEALED PROOF EXPORTED • RUN FINAL APPROVAL';
      this.audio.playUiConfirm();
      this.lock = 6;
      return;
    }
    const next = remaining[0]!;
    if (next.id === 'touch-latency') this.index = DEVICE_CERT_TESTS.length;
    else {
      const target = DEVICE_CERT_TESTS.findIndex((test) => test.id === next.id);
      if (target >= 0) this.index = target;
    }
    this.message = `NEXT: ${next.label}`;
    this.audio.playMenuMove();
    this.lock = 5;
  }

  private mark(status: CertificationStatus): void {
    const test = DEVICE_CERT_TESTS[this.index];
    if (!test) return;
    this.record = this.context.setTest(test.id, status);
    this.audio.playUiConfirm();
    this.lock = 4;
  }


  private confirmTenMinuteHeat(): void {
    const telemetry = this.context.getTelemetry();
    if (telemetry.sessionSeconds < 600) {
      this.message = `ENDURANCE ${Math.floor(telemetry.sessionSeconds / 60)}m${Math.floor(telemetry.sessionSeconds % 60)}s / 10m`;
      this.audio.playUiConfirm();
      this.lock = 4;
      return;
    }
    const unsafe = telemetry.stability === 'poor' || telemetry.memoryStability === 'poor' || telemetry.sustainedStability === 'poor';
    if (unsafe) {
      this.record = this.context.setTest('ten-minute-play', 'check', `AUTO: runtime warning • sustained ${telemetry.sustainedStability} • inspect heat/FPS before PASS`);
      this.message = 'RUNTIME WARNING • HEAT CONFIRM BLOCKED';
      this.audio.playUiConfirm();
      this.lock = 5;
      return;
    }
    const degradation = telemetry.sustainedDegradationPct == null ? 'N/A' : `${telemetry.sustainedDegradationPct >= 0 ? '+' : ''}${telemetry.sustainedDegradationPct.toFixed(1)}%`;
    this.record = this.context.setTest('ten-minute-play', 'pass', `MANUAL HEAT OK + AUTO 10m • ${telemetry.baselineFps?.toFixed(1) ?? 'N/A'}→${telemetry.recentFps?.toFixed(1) ?? 'N/A'}fps (${degradation})`);
    this.message = '10 MIN ENDURANCE + DEVICE HEAT PASS';
    this.audio.playUiConfirm();
    this.lock = 6;
  }

  private async importCertification(): Promise<void> {
    const result = await this.context.importCertification();
    this.message = result.message;
    if (result.ok && result.record) this.record = result.record;
    this.audio.playUiConfirm();
    this.lock = 5;
  }


  private async startOfflineTransitionAudit(): Promise<void> {
    if (this.offlineAuditBusy) return;
    this.offlineAuditBusy = true;
    this.message = 'OFFLINE IMPORT AUDIT RUNNING…';
    this.audio.playUiConfirm();
    try {
      const result = await this.context.runOfflineTransitionAudit();
      this.offlineAudit = result;
      if (result.ready) {
        const maxMs = result.steps.reduce((max, step) => Math.max(max, step.durationMs), 0);
        this.record = this.context.setTest('offline-transition', 'pass', `AUTO: offline module-worker dynamic import ${result.loaded}/${result.total} PASS • slowest ${Math.round(maxMs)}ms`);
        this.message = `OFFLINE DYNAMIC IMPORT ${result.loaded}/${result.total} PASS`;
      } else {
        this.record = this.context.setTest('offline-transition', 'check', `AUDIT: ${result.message}`);
        this.message = result.message;
      }
    } catch (error) {
      this.record = this.context.setTest('offline-transition', 'check', `AUDIT ERROR: ${String(error).slice(0, 90)}`);
      this.message = 'OFFLINE IMPORT AUDIT ERROR';
    } finally {
      this.offlineAuditBusy = false;
      this.lock = 6;
    }
  }

  private startTouchAudit(): void {
    this.touchAudit.clear();
    this.touchAuditRunning = true;
    this.context.setTouchVisible(true);
    this.message = 'TOUCH EACH D-PAD + LP/MP/HP/LK/MK/HK';
    this.audio.playUiConfirm();
  }

  private startLatency(): void {
    this.latencyPreview = { samples: [], averageMs: null, p95Ms: null, status: 'untested', measuredAt: null };
    this.context.setTouchVisible(false);
    this.latency.start(this.context.canvas, (result) => {
      this.latencyPreview = result;
      if (result.samples.length >= 8) {
        this.record = this.context.setLatency(result.samples);
        this.context.setTouchVisible(true);
        this.audio.playUiConfirm();
      }
    });
    this.audio.playUiConfirm();
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const bg = ctx.createLinearGradient(0, 0, 1280, 720); bg.addColorStop(0, '#111c25'); bg.addColorStop(1, '#07090f'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'left'; ctx.fillStyle = '#8be0b4'; ctx.font = '900 32px Arial Black, sans-serif'; ctx.fillText('DEVICE CERTIFICATION', 72, 58);
    ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText(`${this.context.candidate} • ${this.record.deviceLabel}`, 74, 82);

    const summary = certificationSummary(this.record);
    const summaryColor = summary.status === 'pass' ? '#8be0b4' : summary.status === 'fail' ? '#ff7488' : '#ffd071';
    ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = summaryColor; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(900, 30, 300, 65, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = summaryColor; ctx.font = '900 23px Arial Black, sans-serif'; ctx.fillText(summary.status.toUpperCase(), 920, 66);
    ctx.fillStyle = 'rgba(225,232,242,.58)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText(`${summary.passed}/${summary.total} PASS • ${summary.failed} FAIL • ${summary.untested} UNTESTED`, 920, 84);

    let y = 122;
    for (let i = 0; i < DEVICE_CERT_TESTS.length; i += 1) {
      const test = DEVICE_CERT_TESTS[i]!;
      const result = this.record.tests[test.id] ?? { status: 'untested', updatedAt: null };
      const selected = this.index === i;
      const autoDetail = test.id === 'touch-controls'
        ? `${test.detail} • HP AUTO AUDIT`
        : test.id === 'offline-transition'
          ? `${test.detail} • HP REAL OFFLINE IMPORT AUDIT`
          : test.id === 'ten-minute-play'
            ? `${test.detail} • HP CONFIRM HEAT AFTER AUTO 10m AUDIT`
            : test.detail;
      const detail = result.note ?? autoDetail;
      this.drawRow(ctx, y, selected, test.label, detail, result.status);
      y += 48;
    }
    const latencyResult = this.latencyPreview ?? this.record.touchLatency;
    const latencyDetail = this.latency.running
      ? `TAP CENTER PAD • ${latencyResult.samples.length}/8 SAMPLES`
      : latencyResult.averageMs == null ? 'HP: START 8-TAP POINTER→FRAME MEASUREMENT' : `AVG ${latencyResult.averageMs.toFixed(1)} ms • P95 ${latencyResult.p95Ms?.toFixed(1) ?? '—'} ms • ${latencyResult.samples.length} SAMPLES`;
    this.drawRow(ctx, y, this.index === DEVICE_CERT_TESTS.length, 'TOUCH LATENCY', latencyDetail, latencyResult.status);
    y += 48;
    const summaryStatus = summary.status === 'pass' ? 'pass' : summary.status === 'fail' ? 'fail' : 'check';
    const remaining = remainingCertificationActions(this.record).filter((action) => action.status !== 'done');
    const nextDetail = remaining.length ? `${remaining.length} REMAIN • HP: JUMP TO NEXT • LP: EXPORT PROOF` : 'ALL DEVICE CHECKS PASS • EXPORT PROOF • THEN FINAL APPROVAL';
    this.drawRow(ctx, y, this.index === DEVICE_CERT_TESTS.length + 1, 'FINAL CERT RUN / PROOF', this.message || nextDetail, summaryStatus);
    y += 48;
    this.drawRow(ctx, y, this.index === DEVICE_CERT_TESTS.length + 2, 'IMPORT CERTIFICATION', this.message || 'HP: LOAD A PREVIOUSLY EXPORTED CERTIFICATION', 'check');

    if (this.touchAuditRunning) this.drawTouchAudit(ctx);
    if (this.offlineAuditBusy || this.offlineAudit) this.drawOfflineAudit(ctx);
    if (DEVICE_CERT_TESTS[this.index]?.id === 'ten-minute-play') this.drawEnduranceAudit(ctx);
    if (DEVICE_CERT_TESTS[this.index]?.id === 'production-review') this.drawProductionReview(ctx);
    if (this.latency.running) {
      const pulse = .7 + Math.sin(this.time * 5) * .15;
      ctx.fillStyle = `rgba(139,224,180,${.08 * pulse})`; ctx.strokeStyle = '#8be0b4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(865, 500, 310, 125, 18); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = '#dff8e9'; ctx.font = '900 22px Arial Black, sans-serif'; ctx.fillText('TAP HERE', 1020, 548);
      ctx.font = '700 12px Arial, sans-serif'; ctx.fillStyle = 'rgba(223,248,233,.72)'; ctx.fillText(`${latencyResult.samples.length}/8 • use a real touch`, 1020, 577);
      ctx.fillText('START/LK cancels', 1020, 598);
    }

    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,228,240,.56)'; ctx.font = '700 10px Arial, sans-serif';
    ctx.fillText('↑↓ SELECT • LP PASS / EXPORT PROOF • MP CHECK • HK FAIL • HP AUTO / NEXT • MK RESET ALL • START/LK BACK', 640, 704);
    ctx.restore();
  }




  private drawProductionReview(ctx: CanvasRenderingContext2D): void {
    const checks = [
      'STAGE PARALLAX DEPTH READS CLEARLY',
      'HIT / PARRY / SUPER VFX HAVE CLEAR HIERARCHY',
      'PROJECTILE TRAILS ARE VISUALLY DISTINCT',
      'GILL PHASE I / II / III HUD READS IMMEDIATELY',
      'BELT→DUEL→FINAL→ENDING AUDIO TRANSITIONS CLEANLY',
    ];
    ctx.fillStyle = 'rgba(8,16,22,.94)'; ctx.strokeStyle = '#8fc9ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(858, 138, 334, 286, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#bfe3ff'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('FINAL PRODUCTION REVIEW', 1025, 170);
    ctx.fillStyle = 'rgba(225,232,242,.62)'; ctx.font = '700 9px Arial, sans-serif'; ctx.fillText('Review on the actual target phone before LP PASS', 1025, 190);
    for (let i = 0; i < checks.length; i += 1) {
      const y = 225 + i * 37;
      ctx.textAlign = 'left'; ctx.fillStyle = '#8fc9ff'; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(`${i + 1}`, 884, y);
      ctx.fillStyle = 'rgba(230,236,245,.78)'; ctx.font = '800 9px Arial, sans-serif'; ctx.fillText(checks[i]!, 908, y);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#bfe3ff'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText('LP PASS • MP CHECK • HK FAIL', 1025, 405);
  }

  private drawEnduranceAudit(ctx: CanvasRenderingContext2D): void {
    const t = this.context.getTelemetry();
    const ready = t.sessionSeconds >= 600;
    const unsafe = t.stability === 'poor' || t.memoryStability === 'poor' || t.sustainedStability === 'poor';
    const color = !ready ? '#ffd071' : unsafe ? '#ff7488' : '#8be0b4';
    const elapsed = `${Math.floor(t.sessionSeconds / 60)}:${Math.floor(t.sessionSeconds % 60).toString().padStart(2, '0')}`;
    const degradation = t.sustainedDegradationPct == null ? 'N/A' : `${t.sustainedDegradationPct >= 0 ? '+' : ''}${t.sustainedDegradationPct.toFixed(1)}%`;
    ctx.fillStyle = 'rgba(8,16,22,.94)'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(858, 138, 334, 286, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('10 MIN ENDURANCE AUDIT', 1025, 170);
    ctx.fillStyle = 'rgba(225,232,242,.62)'; ctx.font = '700 9px Arial, sans-serif'; ctx.fillText('Active gameplay time • background time excluded', 1025, 190);
    const rows = [
      ['ACTIVE TIME', `${elapsed} / 10:00`],
      ['RECENT FPS', t.recentFps == null ? 'WARMING UP' : `${t.recentFps.toFixed(1)} FPS`],
      ['BASELINE→RECENT', t.baselineFps == null || t.recentFps == null ? 'COLLECTING' : `${t.baselineFps.toFixed(1)} → ${t.recentFps.toFixed(1)}`],
      ['SLOWDOWN', degradation],
      ['SUSTAINED', t.sustainedStability.toUpperCase()],
      ['MEMORY', t.memoryStability.toUpperCase()],
    ] as const;
    for (let i = 0; i < rows.length; i += 1) {
      const [label, value] = rows[i]!; const y = 224 + i * 27;
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(225,232,242,.52)'; ctx.font = '800 9px Arial, sans-serif'; ctx.fillText(label, 884, y);
      ctx.textAlign = 'right'; ctx.fillStyle = i >= 4 && unsafe ? '#ff9aae' : '#e6eef1'; ctx.font = '900 10px ui-monospace, monospace'; ctx.fillText(value, 1165, y);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = '900 12px Arial Black, sans-serif';
    ctx.fillText(!ready ? 'KEEP PLAYING' : unsafe ? 'INSPECT FPS / HEAT' : 'HP = CONFIRM DEVICE HEAT OK', 1025, 398);
  }

  private drawOfflineAudit(ctx: CanvasRenderingContext2D): void {
    const result = this.offlineAudit;
    const loaded = result?.loaded ?? 0;
    const total = result?.total ?? 5;
    const ok = !!result?.ready;
    ctx.fillStyle = 'rgba(8,16,22,.92)'; ctx.strokeStyle = this.offlineAuditBusy ? '#ffd071' : ok ? '#8be0b4' : '#ffd071'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(858, 138, 334, 286, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = this.offlineAuditBusy ? '#ffe4a3' : ok ? '#dff8e9' : '#ffe4a3'; ctx.font = '900 16px Arial Black, sans-serif';
    ctx.fillText(this.offlineAuditBusy ? 'OFFLINE IMPORT AUDIT…' : 'OFFLINE IMPORT AUDIT', 1025, 170);
    ctx.fillStyle = 'rgba(225,232,242,.62)'; ctx.font = '700 9px Arial, sans-serif';
    ctx.fillText('Module Worker • new module realm • service-worker cache', 1025, 190);
    if (result?.steps.length) {
      for (let i = 0; i < result.steps.length; i += 1) {
        const step = result.steps[i]!; const y = 218 + i * 34;
        ctx.textAlign = 'left'; ctx.fillStyle = step.ready ? '#8be0b4' : '#ff9b7e'; ctx.font = '900 9px ui-monospace, monospace'; ctx.fillText(step.label, 884, y);
        ctx.textAlign = 'right'; ctx.fillText(step.ready ? `${Math.round(step.durationMs)}ms` : 'CHECK', 1165, y);
      }
    } else {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '800 10px Arial, sans-serif';
      ctx.fillText(this.offlineAuditBusy ? 'Loading deferred Stage 2–5 + Ending modules…' : (result?.message ?? 'Run HP while the device is offline'), 1025, 250);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = ok ? '#8be0b4' : '#ffd071'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillText(`${loaded}/${total} ${ok ? 'PASS' : this.offlineAuditBusy ? 'RUNNING' : 'CHECK'}`, 1025, 402);
  }

  private drawTouchAudit(ctx: CanvasRenderingContext2D): void {
    const pulse = .72 + Math.sin(this.time * 4.2) * .12;
    ctx.fillStyle = `rgba(8,16,22,${.86 + pulse * .04})`; ctx.strokeStyle = '#8be0b4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(860, 140, 330, 280, 18); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#dff8e9'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText('REAL TOUCH AUDIT', 1025, 174);
    ctx.fillStyle = 'rgba(223,248,233,.68)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText('Keyboard / gamepad do not count', 1025, 194);
    for (let i = 0; i < TOUCH_AUDIT_ACTIONS.length; i += 1) {
      const action = TOUCH_AUDIT_ACTIONS[i]!;
      const col = i % 5; const row = Math.floor(i / 5); const x = 885 + col * 57; const y = 225 + row * 62;
      const hit = this.touchAudit.has(action);
      ctx.fillStyle = hit ? 'rgba(139,224,180,.18)' : 'rgba(255,255,255,.045)';
      ctx.strokeStyle = hit ? '#8be0b4' : 'rgba(255,255,255,.16)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, 48, 44, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = hit ? '#dff8e9' : 'rgba(225,232,242,.62)'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(action.toUpperCase(), x + 24, y + 27);
    }
    ctx.fillStyle = '#8be0b4'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText(`${this.touchAudit.size}/${TOUCH_AUDIT_ACTIONS.length}`, 1025, 368);
    ctx.fillStyle = 'rgba(223,248,233,.56)'; ctx.font = '700 9px Arial, sans-serif'; ctx.fillText('Touch every control once • START cancels', 1025, 393);
  }

  private drawRow(ctx: CanvasRenderingContext2D, y: number, selected: boolean, label: string, detail: string, status: CertificationStatus): void {
    const color = status === 'pass' ? '#8be0b4' : status === 'fail' ? '#ff7488' : status === 'check' ? '#ffd071' : 'rgba(220,228,240,.34)';
    ctx.fillStyle = selected ? 'rgba(139,224,180,.09)' : 'rgba(255,255,255,.028)';
    ctx.strokeStyle = selected ? '#8be0b4' : 'rgba(255,255,255,.07)'; ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(72, y - 26, 760, 41, 9); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = selected ? '#eefaf3' : '#e6e9ee'; ctx.font = '900 15px Arial Black, sans-serif'; ctx.fillText(label, 94, y - 6);
    ctx.fillStyle = 'rgba(220,228,240,.48)'; ctx.font = '700 9px Arial, sans-serif'; ctx.fillText(detail.slice(0, 105), 94, y + 9);
    ctx.textAlign = 'right'; ctx.fillStyle = color; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText(status.toUpperCase(), 808, y + 1);
  }
}
