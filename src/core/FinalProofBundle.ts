import { certificationSummary, DEVICE_CERT_TESTS, type DeviceCertificationRecord } from './DeviceCertification.js';
import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { RecoveryHistorySnapshot } from './RecoveryHistory.js';
import type { SafeAreaSnapshot } from './SafeAreaProbe.js';
import type { ReleaseApprovalRecord } from './ReleaseApproval.js';
import { buildReleaseEvidenceFingerprint } from './ReleaseEvidenceFingerprint.js';
import type { ReleaseIntegritySnapshot } from './ReleaseIntegrity.js';

export type ProofActionStatus = 'done' | 'action' | 'blocked';

export interface FinalProofAction {
  id: string;
  label: string;
  status: ProofActionStatus;
  instruction: string;
}

const ACTION_GUIDE: Record<string, string> = {
  'landscape': 'Rotate to landscape and confirm HUD/buttons stay inside the safe area.',
  'touch-controls': 'Run the HP real-touch audit and touch D-pad + all six attack buttons once.',
  'audio-unlock': 'Interact once and confirm BGM plus combat audio are audible.',
  'pwa-install': 'Install to the home screen and launch in standalone mode.',
  'offline-launch': 'Launch the installed PWA while the device is offline.',
  'background-resume': 'Background the app for at least 30 seconds, then return.',
  'offline-transition': 'Go offline, then run the HP module-worker Stage 2–5 + Ending import audit.',
  'ten-minute-play': 'Play for 10 active minutes, then confirm physical device heat is acceptable with HP.',
  'production-review': 'Review Stage depth, VFX hierarchy, Gill phase HUD, projectile trails, and final audio/ending transitions on the target device.',
};

export function remainingCertificationActions(record: DeviceCertificationRecord): FinalProofAction[] {
  const actions: FinalProofAction[] = DEVICE_CERT_TESTS.filter((test) => test.required).map((test) => {
    const status = record.tests[test.id]?.status ?? 'untested';
    return {
      id: test.id,
      label: test.label,
      status: status === 'pass' ? 'done' : status === 'fail' ? 'blocked' : 'action',
      instruction: ACTION_GUIDE[test.id] ?? test.detail,
    };
  });
  const latency = record.touchLatency.status;
  actions.push({
    id: 'touch-latency',
    label: 'TOUCH LATENCY',
    status: latency === 'pass' ? 'done' : latency === 'fail' ? 'blocked' : 'action',
    instruction: 'Run the 8-tap pointer→frame latency measurement on the target touchscreen.',
  });
  return actions;
}

export interface FinalProofBundleInput {
  candidate: string;
  certification: DeviceCertificationRecord;
  telemetry: RuntimeTelemetrySnapshot;
  errors: RuntimeErrorSnapshot;
  recovery: RecoveryHistorySnapshot;
  safeArea: SafeAreaSnapshot;
  environment: {
    online: boolean;
    standalone: boolean;
    serviceWorkerControlled: boolean;
    userAgent: string;
    viewport: string;
  };
  approval: ReleaseApprovalRecord | null;
  integrity?: ReleaseIntegritySnapshot | null;
}

export interface FinalProofBundle {
  app: 'SIDE-SCROLL CHRONICLES';
  kind: 'FINAL RELEASE PROOF';
  candidate: string;
  generatedAt: string;
  evidenceFingerprint: string;
  complete: boolean;
  sealed: boolean;
  summary: ReturnType<typeof certificationSummary>;
  remaining: FinalProofAction[];
  certification: DeviceCertificationRecord;
  telemetry: RuntimeTelemetrySnapshot;
  errors: RuntimeErrorSnapshot;
  recovery: RecoveryHistorySnapshot;
  safeArea: SafeAreaSnapshot;
  environment: FinalProofBundleInput['environment'];
  approval: ReleaseApprovalRecord | null;
  integrity?: ReleaseIntegritySnapshot | null;
}

export function buildFinalProofBundle(input: FinalProofBundleInput, now = new Date()): FinalProofBundle {
  const summary = certificationSummary(input.certification);
  const remaining = remainingCertificationActions(input.certification).filter((action) => action.status !== 'done');
  const evidenceFingerprint = buildReleaseEvidenceFingerprint({ candidate: input.candidate, certification: input.certification, errors: input.errors, integrity: input.integrity });
  const complete = summary.status === 'pass' && remaining.length === 0 && input.errors.fatal === 0 && (!input.integrity || input.integrity.status === 'pass');
  const sealed = complete && input.approval?.verdict === 'approved' && input.approval.evidenceFingerprint === evidenceFingerprint;
  return {
    app: 'SIDE-SCROLL CHRONICLES',
    kind: 'FINAL RELEASE PROOF',
    candidate: input.candidate,
    generatedAt: now.toISOString(),
    evidenceFingerprint,
    complete,
    sealed,
    summary,
    remaining,
    certification: JSON.parse(JSON.stringify(input.certification)) as DeviceCertificationRecord,
    telemetry: { ...input.telemetry },
    errors: JSON.parse(JSON.stringify(input.errors)) as RuntimeErrorSnapshot,
    recovery: JSON.parse(JSON.stringify(input.recovery)) as RecoveryHistorySnapshot,
    safeArea: JSON.parse(JSON.stringify(input.safeArea)) as SafeAreaSnapshot,
    environment: { ...input.environment },
    approval: input.approval ? { ...input.approval } : null,
    integrity: input.integrity ? { ...input.integrity, mismatches: [...input.integrity.mismatches] } : null,
  };
}

export function finalProofBundleJson(bundle: FinalProofBundle): string {
  return JSON.stringify(bundle, null, 2);
}
