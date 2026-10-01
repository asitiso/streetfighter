import type { RenderContext, Scene } from '../core/Scene.js';
import type { InputManager } from '../input/InputManager.js';
import type { AudioManager } from '../core/AudioManager.js';
import type { RuntimeErrorSnapshot } from '../core/RuntimeErrorJournal.js';
import type { RecoveryHistorySnapshot } from '../core/RecoveryHistory.js';
import type { ReleaseSummary } from '../core/ReleaseSummary.js';
import type { DeviceCertificationHistorySnapshot, CertificationComparison } from '../core/DeviceCertificationHistory.js';
import { certificationSummary } from '../core/DeviceCertification.js';
import type { ReleaseApprovalRecord } from '../core/ReleaseApproval.js';
import type { ReleaseIntegritySnapshot } from '../core/ReleaseIntegrity.js';

export interface DiagnosticsContext {
  errors: () => RuntimeErrorSnapshot;
  recovery: () => RecoveryHistorySnapshot;
  summary: () => ReleaseSummary;
  history: () => DeviceCertificationHistorySnapshot;
  comparison: () => CertificationComparison;
  approval: () => ReleaseApprovalRecord;
  integrity: () => ReleaseIntegritySnapshot;
  clearErrors: () => void;
  exportDiagnostics: () => void;
  exportRepro: () => void;
  approveRelease: () => { ok: boolean; message: string };
  revokeApproval: () => void;
}

const TABS = ['CRASH', 'RECOVERY', 'DEVICE HISTORY', 'RC COMPARE', 'SUMMARY', 'FINAL APPROVAL'] as const;

export class DiagnosticsScene implements Scene {
  private page = 0;
  private message = '';
  private lock = 0;
  constructor(private readonly input: InputManager, private readonly audio: AudioManager, private readonly context: DiagnosticsContext, private readonly onBack: () => void) {}
  enter(): void { this.audio.playStagePulse(); }
  exit(): void {}
  resize(): void {}
  destroy(): void {}

  fixedUpdate(): void {
    if (this.lock > 0) this.lock -= 1;
    if (this.lock > 0) return;
    if (this.input.pressed('left')) { this.page = (this.page + TABS.length - 1) % TABS.length; this.lock = 4; this.audio.playMenuMove(); }
    if (this.input.pressed('right')) { this.page = (this.page + 1) % TABS.length; this.lock = 4; this.audio.playMenuMove(); }
    if (this.input.pressed('hp')) { this.context.exportDiagnostics(); this.message = 'DIAGNOSTICS EXPORTED'; this.audio.playUiConfirm(); }
    if (this.input.pressed('mp') && this.page === 0) { this.context.exportRepro(); this.message = 'ERROR REPRO PACKAGE EXPORTED'; this.audio.playUiConfirm(); }
    if (this.input.pressed('mk') && this.page === 0) { this.context.clearErrors(); this.message = 'CURRENT RC CRASH LOG CLEARED'; this.audio.playUiConfirm(); }
    if (this.input.pressed('lp') && this.page === 5) { const result = this.context.approveRelease(); this.message = result.message; this.audio.playUiConfirm(); }
    if (this.input.pressed('mk') && this.page === 5) { this.context.revokeApproval(); this.message = 'RELEASE APPROVAL REVOKED'; this.audio.playUiConfirm(); }
    if (this.input.pressed('back') || this.input.pressed('lk') || this.input.touchPressed('start')) { this.audio.playUiConfirm(); this.onBack(); }
  }

  render({ ctx, width, height }: RenderContext): void {
    ctx.save(); ctx.scale(width / 1280, height / 720);
    const bg = ctx.createLinearGradient(0, 0, 1280, 720); bg.addColorStop(0, '#151827'); bg.addColorStop(1, '#080a11'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'left'; ctx.fillStyle = '#f0ba45'; ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillText('RC DIAGNOSTICS / APPROVAL', 76, 58);
    ctx.fillStyle = 'rgba(226,233,243,.56)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText('DEVICE HISTORY • RC REGRESSION • REPRO PACKAGE • FINAL RELEASE APPROVAL', 78, 82);
    this.drawTabs(ctx);
    if (this.page === 0) this.drawCrash(ctx); else if (this.page === 1) this.drawRecovery(ctx); else if (this.page === 2) this.drawHistory(ctx); else if (this.page === 3) this.drawComparison(ctx); else if (this.page === 4) this.drawSummary(ctx); else this.drawApproval(ctx);
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,228,240,.55)'; ctx.font = '700 10px Arial, sans-serif';
    const pageHelp = this.page === 0 ? 'MP REPRO PACKAGE • MK CLEAR CRASH' : this.page === 5 ? 'LP APPROVE WHEN READY • MK REVOKE' : '';
    ctx.fillText(`← → PAGE  •  HP EXPORT ALL${pageHelp ? `  •  ${pageHelp}` : ''}  •  START/LK BACK`, 640, 686);
    if (this.message) { ctx.fillStyle = '#8be0b4'; ctx.font = '900 11px Arial Black, sans-serif'; ctx.fillText(this.message, 640, 660); }
    ctx.restore();
  }

  private drawTabs(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < TABS.length; i += 1) {
      const row = i >= 3 ? 1 : 0; const col = i % 3; const x = 78 + col * 260; const y = 100 + row * 42; const active = i === this.page;
      ctx.fillStyle = active ? 'rgba(240,186,69,.14)' : 'rgba(255,255,255,.03)'; ctx.strokeStyle = active ? '#f0ba45' : 'rgba(255,255,255,.08)'; ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, 238, 34, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = active ? '#fff0bd' : 'rgba(225,232,242,.5)'; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(TABS[i]!, x + 14, y + 22);
    }
  }

  private drawCrash(ctx: CanvasRenderingContext2D): void {
    const snap = this.context.errors(); this.drawStat(ctx, 78, 194, 'FATAL', String(snap.fatal), snap.fatal ? '#ff7488' : '#8be0b4'); this.drawStat(ctx, 268, 194, 'ERROR', String(snap.errors), snap.errors ? '#ffd071' : '#8be0b4'); this.drawStat(ctx, 458, 194, 'WARNING', String(snap.warnings), '#8fc9ff'); this.drawStat(ctx, 648, 194, 'TOTAL', String(snap.total), '#e7edf6');
    const entries = [...snap.entries].reverse().slice(0, 6); let y = 282;
    if (!entries.length) { ctx.fillStyle = '#8be0b4'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText('NO CURRENT-CANDIDATE ERRORS', 80, y); return; }
    for (const entry of entries) { const color = entry.severity === 'fatal' ? '#ff7488' : entry.severity === 'error' ? '#ffd071' : '#8fc9ff'; this.row(ctx, y, `${entry.severity.toUpperCase()} • ${entry.kind.toUpperCase()}`, entry.message.slice(0, 120), color, entry.occurredAt); y += 58; }
  }

  private drawRecovery(ctx: CanvasRenderingContext2D): void {
    const snap = this.context.recovery(); this.drawStat(ctx, 78, 194, 'SUCCESS', String(snap.success), '#8be0b4'); this.drawStat(ctx, 268, 194, 'CHECK', String(snap.checks), '#ffd071'); this.drawStat(ctx, 458, 194, 'FAILED', String(snap.failed), snap.failed ? '#ff7488' : '#8be0b4'); this.drawStat(ctx, 648, 194, 'TOTAL', String(snap.total), '#e7edf6');
    const entries = [...snap.entries].reverse().slice(0, 6); let y = 282; if (!entries.length) { ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText('NO RECOVERY EVENTS YET', 80, y); return; }
    for (const entry of entries) { const color = entry.outcome === 'success' ? '#8be0b4' : entry.outcome === 'failed' ? '#ff7488' : '#ffd071'; this.row(ctx, y, `${entry.outcome.toUpperCase()} • ${entry.kind.toUpperCase().replaceAll('-', ' ')}`, entry.detail.slice(0, 115), color, entry.occurredAt); y += 58; }
  }

  private drawHistory(ctx: CanvasRenderingContext2D): void {
    const snap = this.context.history(); this.drawStat(ctx, 78, 194, 'RECORDS', String(snap.total), '#e7edf6'); this.drawStat(ctx, 268, 194, 'DEVICES', String(snap.devices), '#8fc9ff'); this.drawStat(ctx, 458, 194, 'CANDIDATES', String(snap.candidates), '#f0ba45');
    let y = 282; if (!snap.entries.length) { ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText('NO HISTORICAL DEVICE CERTIFICATION YET', 80, y); return; }
    for (const entry of snap.entries.slice(0, 6)) { const summary = certificationSummary(entry.record); this.row(ctx, y, `${entry.candidate} • ${entry.source.toUpperCase()}`, `${entry.deviceLabel} • ${summary.passed}/${summary.total} PASS • P95 ${entry.record.touchLatency.p95Ms ?? '—'}ms`, '#8fc9ff', entry.capturedAt); y += 58; }
  }

  private drawComparison(ctx: CanvasRenderingContext2D): void {
    const value = this.context.comparison(); const color = value.regression ? '#ff7488' : value.previous ? '#8be0b4' : '#ffd071';
    ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(78, 194, 1125, 80, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = color; ctx.font = '900 23px Arial Black, sans-serif'; ctx.fillText(value.detail, 100, 230); ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText(value.deviceLabel, 100, 252);
    this.compareCard(ctx, 78, 304, 'CURRENT', value.currentCandidate, value.current.passed, value.current.total, value.current.status, value.current.p95Ms);
    if (value.previous && value.previousCandidate) this.compareCard(ctx, 660, 304, 'PREVIOUS', value.previousCandidate, value.previous.passed, value.previous.total, value.previous.status, value.previous.p95Ms); else { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(660, 304, 543, 150, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffd071'; ctx.font = '900 16px Arial Black, sans-serif'; ctx.fillText('NO PRIOR CERT FOR THIS DEVICE', 686, 350); }
  }

  private drawSummary(ctx: CanvasRenderingContext2D): void {
    const summary = this.context.summary(); const color = summary.status === 'ready' ? '#8be0b4' : summary.status === 'blocked' ? '#ff7488' : '#ffd071';
    ctx.fillStyle = 'rgba(255,255,255,.045)'; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(78, 194, 1125, 66, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = color; ctx.font = '900 24px Arial Black, sans-serif'; ctx.fillText(summary.headline, 100, 234); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(225,232,242,.5)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText(summary.candidate, 1180, 231); ctx.textAlign = 'left'; let y = 296;
    for (const row of summary.rows.slice(0, 7)) { const rowColor = row.status === 'pass' ? '#8be0b4' : row.status === 'block' ? '#ff7488' : '#ffd071'; ctx.fillStyle = 'rgba(255,255,255,.032)'; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.roundRect(78, y - 20, 1125, 38, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(225,232,242,.55)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText(row.label, 96, y + 3); ctx.fillStyle = rowColor; ctx.font = '900 12px Arial Black, sans-serif'; ctx.fillText(row.value, 330, y + 3); y += 42; }
  }

  private drawApproval(ctx: CanvasRenderingContext2D): void {
    const approval = this.context.approval(); const integrity = this.context.integrity(); const color = approval.verdict === 'approved' || approval.verdict === 'ready-for-approval' ? '#8be0b4' : approval.verdict === 'blocked' ? '#ff7488' : '#ffd071';
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(150, 206, 980, 270, 18); ctx.fill(); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillText(approval.verdict.toUpperCase().replaceAll('-', ' '), 640, 266); ctx.fillStyle = '#edf2f7'; ctx.font = '900 17px Arial Black, sans-serif'; ctx.fillText(approval.candidate, 640, 304); ctx.fillStyle = 'rgba(225,232,242,.62)'; ctx.font = '700 12px Arial, sans-serif'; ctx.fillText(approval.deviceLabel, 640, 334); ctx.fillStyle = 'rgba(225,232,242,.5)'; ctx.font = '800 10px ui-monospace, monospace'; ctx.fillText(`EVIDENCE ${approval.evidenceFingerprint ?? 'UNSEALED'}`, 640, 359); ctx.fillText(`DEPLOY ${integrity.status.toUpperCase()} • ${integrity.manifestRoot?.slice(0, 16) ?? 'NO ROOT'} • ${integrity.checked}/${integrity.total} FILES`, 640, 381); ctx.fillStyle = color; ctx.font = '800 12px Arial, sans-serif'; ctx.fillText(approval.detail.slice(0, 110), 640, 410);
    ctx.fillStyle = 'rgba(225,232,242,.42)'; ctx.font = '700 10px Arial, sans-serif'; ctx.fillText(approval.verdict === 'ready-for-approval' ? 'LP seals device evidence + deployed SHA-256 root and exports final proof.' : approval.verdict === 'approved' ? 'Fingerprint + deploy root match current evidence. MK revokes the seal.' : 'Complete the indicated checks before approval becomes available.', 640, 448); ctx.textAlign = 'left';
  }

  private compareCard(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, candidate: string, passed: number, total: number, status: string, p95: number | null): void { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(x, y, 543, 150, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(225,232,242,.45)'; ctx.font = '800 10px Arial, sans-serif'; ctx.fillText(label, x + 24, y + 30); ctx.fillStyle = '#f0ba45'; ctx.font = '900 18px Arial Black, sans-serif'; ctx.fillText(candidate, x + 24, y + 60); ctx.fillStyle = '#e7edf6'; ctx.font = '900 14px Arial Black, sans-serif'; ctx.fillText(`${passed}/${total} PASS • ${status.toUpperCase()}`, x + 24, y + 96); ctx.fillStyle = 'rgba(225,232,242,.58)'; ctx.font = '700 11px ui-monospace, monospace'; ctx.fillText(`TOUCH P95 ${p95 == null ? '—' : `${p95.toFixed(1)}ms`}`, x + 24, y + 123); }
  private row(ctx: CanvasRenderingContext2D, y: number, title: string, detail: string, color: string, occurredAt: string): void { ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(78, y - 24, 1125, 50, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = color; ctx.font = '900 10px Arial Black, sans-serif'; ctx.fillText(title, 96, y - 5); ctx.fillStyle = 'rgba(230,236,245,.7)'; ctx.font = '700 10px ui-monospace, monospace'; ctx.fillText(detail, 410, y - 5); ctx.fillStyle = 'rgba(230,236,245,.4)'; ctx.font = '700 8px Arial, sans-serif'; ctx.fillText(occurredAt.replace('T', ' ').slice(0, 19), 96, y + 13); }
  private drawStat(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string, color: string): void { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.roundRect(x, y, 166, 64, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(225,232,242,.46)'; ctx.font = '800 9px Arial, sans-serif'; ctx.fillText(label, x + 14, y + 20); ctx.fillStyle = color; ctx.font = '900 23px Arial Black, sans-serif'; ctx.fillText(value, x + 14, y + 50); }
}
