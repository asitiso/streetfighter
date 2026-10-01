import type { AcceptanceMatrix } from './AcceptanceMatrix.js';
import type { DeviceCertificationRecord } from './DeviceCertification.js';
import { certificationSummary } from './DeviceCertification.js';
import type { ReleaseGateResult } from './ReleaseGate.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';

export type FinalCandidateVerdict = 'rc-ready' | 'device-cert-required' | 'blocked';

export interface FinalCandidateDecision {
  verdict: FinalCandidateVerdict;
  blockers: string[];
  checks: string[];
  label: string;
}

export function decideFinalCandidate(input: {
  gate: ReleaseGateResult;
  matrix: AcceptanceMatrix;
  certification: DeviceCertificationRecord | null;
  errors: RuntimeErrorSnapshot;
  sessionRecoveryReady: boolean;
  updateRecoveryReady: boolean;
}): FinalCandidateDecision {
  const blockers = [...input.gate.blockers];
  const checks = [...input.gate.warnings];
  if (input.matrix.blocked > 0) blockers.push('ACCEPTANCE MATRIX');
  if (input.errors.fatal > 0) blockers.push('RUNTIME FATAL ERROR');
  else if (input.errors.errors > 0) checks.push('RUNTIME ERROR LOG');
  if (!input.sessionRecoveryReady) blockers.push('SESSION RECOVERY');
  if (!input.updateRecoveryReady) blockers.push('UPDATE AUTO-RECOVERY');

  const cert = input.certification ? certificationSummary(input.certification) : null;
  if (!cert || cert.status !== 'pass') checks.push('REAL DEVICE CERTIFICATION');

  const uniqueBlockers = Array.from(new Set(blockers));
  const uniqueChecks = Array.from(new Set(checks));
  if (uniqueBlockers.length) return { verdict: 'blocked', blockers: uniqueBlockers, checks: uniqueChecks, label: 'RC BLOCKED' };
  if (uniqueChecks.length || input.matrix.checks > 0) return { verdict: 'device-cert-required', blockers: [], checks: uniqueChecks, label: 'DEVICE CERT REQUIRED' };
  return { verdict: 'rc-ready', blockers: [], checks: [], label: 'RC READY' };
}
