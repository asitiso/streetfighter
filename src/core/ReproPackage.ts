import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { RecoveryHistorySnapshot } from './RecoveryHistory.js';
import type { DeviceCertificationRecord } from './DeviceCertification.js';
import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';
import type { SaveHealth } from '../save/SaveManager.js';

export interface ReproPackageInput {
  candidate: string;
  errors: RuntimeErrorSnapshot;
  recovery: RecoveryHistorySnapshot;
  certification: DeviceCertificationRecord;
  telemetry: RuntimeTelemetrySnapshot;
  save: SaveHealth;
  currentRoute: string;
  online: boolean;
  standalone: boolean;
}

export interface ReproPackage {
  app: 'SIDE-SCROLL CHRONICLES';
  kind: 'ERROR REPRO PACKAGE';
  candidate: string;
  generatedAt: string;
  primaryError: RuntimeErrorSnapshot['entries'][number] | null;
  errors: RuntimeErrorSnapshot;
  recovery: RecoveryHistorySnapshot;
  certification: DeviceCertificationRecord;
  telemetry: RuntimeTelemetrySnapshot;
  saveHealth: SaveHealth;
  environment: { route: string; online: boolean; standalone: boolean; userAgent: string; viewport: string };
  reproductionGuide: string[];
}

export function buildReproPackage(input: ReproPackageInput, now = new Date()): ReproPackage {
  const primaryError = [...input.errors.entries].reverse().find((entry) => entry.severity === 'fatal' || entry.severity === 'error') ?? [...input.errors.entries].reverse()[0] ?? null;
  const guide = primaryError
    ? [`Open candidate ${input.candidate}.`, `Navigate to ${input.currentRoute}.`, `Reproduce around: ${primaryError.message.slice(0, 160)}.`, 'Attach this package with the exact device/browser used.']
    : [`Open candidate ${input.candidate}.`, `Navigate to ${input.currentRoute}.`, 'Reproduce the reported visual or runtime issue.', 'Attach this package with the exact device/browser used.'];
  return {
    app: 'SIDE-SCROLL CHRONICLES', kind: 'ERROR REPRO PACKAGE', candidate: input.candidate, generatedAt: now.toISOString(), primaryError,
    errors: JSON.parse(JSON.stringify(input.errors)), recovery: JSON.parse(JSON.stringify(input.recovery)), certification: JSON.parse(JSON.stringify(input.certification)),
    telemetry: { ...input.telemetry }, saveHealth: { ...input.save, issues: [...input.save.issues] },
    environment: { route: input.currentRoute, online: input.online, standalone: input.standalone, userAgent: typeof navigator === 'undefined' ? 'node' : navigator.userAgent, viewport: typeof window === 'undefined' ? 'node' : `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}` },
    reproductionGuide: guide,
  };
}

export function reproPackageJson(value: ReproPackage): string { return JSON.stringify(value, null, 2); }
