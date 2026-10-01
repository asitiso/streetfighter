import type { OfflineCampaignStatus, OfflineTransitionStatus } from './AssetManager.js';
import type { ReleaseGateResult } from './ReleaseGate.js';
import type { ReleaseProfile } from './ReleaseProfiles.js';
import type { RuntimeTelemetrySnapshot } from './RuntimeTelemetry.js';
import type { SaveHealth } from '../save/SaveManager.js';
import type { CacheUpgradePlan } from './UpdatePolicy.js';
import type { AcceptanceMatrix } from './AcceptanceMatrix.js';
import type { DeviceCertificationRecord } from './DeviceCertification.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { FinalCandidateDecision } from './FinalCandidateDecision.js';
import type { ReleaseIntegritySnapshot } from './ReleaseIntegrity.js';

export const RELEASE_CANDIDATE = '0.0.63-rc.38';

export interface ReleaseReportInput {
  gate: ReleaseGateResult;
  profile: ReleaseProfile;
  telemetry: RuntimeTelemetrySnapshot;
  saveHealth: SaveHealth;
  offline: OfflineCampaignStatus | null;
  transitions: OfflineTransitionStatus | null;
  updatePlan: CacheUpgradePlan;
  serviceWorkerControlled: boolean;
  standalone: boolean;
  landscape: boolean;
  online: boolean;
  acceptanceMatrix?: AcceptanceMatrix;
  deviceCertification?: DeviceCertificationRecord | null;
  errorJournal?: RuntimeErrorSnapshot | null;
  finalCandidate?: FinalCandidateDecision | null;
  releaseIntegrity?: ReleaseIntegritySnapshot | null;
}

export interface ReleaseReport {
  app: 'SIDE-SCROLL CHRONICLES';
  candidate: string;
  generatedAt: string;
  verdict: ReleaseGateResult['verdict'];
  blockers: string[];
  warnings: string[];
  profile: { id: string; label: string; quality: string };
  save: SaveHealth;
  offline: OfflineCampaignStatus | null;
  transitions: OfflineTransitionStatus | null;
  update: CacheUpgradePlan;
  runtime: RuntimeTelemetrySnapshot;
  environment: { serviceWorkerControlled: boolean; standalone: boolean; landscape: boolean; online: boolean };
  acceptanceMatrix: AcceptanceMatrix;
  deviceCertification: DeviceCertificationRecord | null;
  errorJournal: RuntimeErrorSnapshot | null;
  finalCandidate: FinalCandidateDecision | null;
  releaseIntegrity: ReleaseIntegritySnapshot | null;
}

export function buildReleaseReport(input: ReleaseReportInput, now = new Date()): ReleaseReport {
  return {
    app: 'SIDE-SCROLL CHRONICLES',
    candidate: RELEASE_CANDIDATE,
    generatedAt: now.toISOString(),
    verdict: input.gate.verdict,
    blockers: [...input.gate.blockers],
    warnings: [...input.gate.warnings],
    profile: { id: input.profile.id, label: input.profile.label, quality: input.profile.recommendedQuality },
    save: { ...input.saveHealth, issues: [...input.saveHealth.issues] },
    offline: input.offline ? { ...input.offline, missing: [...input.offline.missing] } : null,
    transitions: input.transitions ? {
      ...input.transitions,
      transitions: input.transitions.transitions.map((item) => ({ ...item, missing: [...item.missing] })),
    } : null,
    update: { ...input.updatePlan, staleGameCaches: [...input.updatePlan.staleGameCaches], preservedCaches: [...input.updatePlan.preservedCaches] },
    runtime: { ...input.telemetry },
    environment: {
      serviceWorkerControlled: input.serviceWorkerControlled,
      standalone: input.standalone,
      landscape: input.landscape,
      online: input.online,
    },
    acceptanceMatrix: input.acceptanceMatrix ? {
      ...input.acceptanceMatrix,
      items: input.acceptanceMatrix.items.map((item) => ({ ...item })),
    } : {
      status: input.gate.verdict === 'blocked' ? 'block' : input.gate.verdict === 'check' ? 'check' : 'pass',
      passed: input.gate.verdict === 'ready' ? 1 : 0,
      checks: input.gate.verdict === 'check' ? 1 : 0,
      blocked: input.gate.verdict === 'blocked' ? 1 : 0,
      total: 1,
      items: [{ id: 'release-gate', label: 'AUTOMATED RELEASE GATE', status: input.gate.verdict === 'blocked' ? 'block' : input.gate.verdict === 'check' ? 'check' : 'pass', detail: input.gate.verdict.toUpperCase() }],
    },
    deviceCertification: input.deviceCertification ? JSON.parse(JSON.stringify(input.deviceCertification)) as DeviceCertificationRecord : null,
    errorJournal: input.errorJournal ? JSON.parse(JSON.stringify(input.errorJournal)) as RuntimeErrorSnapshot : null,
    finalCandidate: input.finalCandidate ? { ...input.finalCandidate, blockers: [...input.finalCandidate.blockers], checks: [...input.finalCandidate.checks] } : null,
    releaseIntegrity: input.releaseIntegrity ? { ...input.releaseIntegrity, mismatches: [...input.releaseIntegrity.mismatches] } : null,
  };
}

export function releaseReportJson(report: ReleaseReport): string { return JSON.stringify(report, null, 2); }
