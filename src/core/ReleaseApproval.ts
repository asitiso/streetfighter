import { certificationSummary, type DeviceCertificationRecord } from './DeviceCertification.js';
import type { CertificationComparison } from './DeviceCertificationHistory.js';
import type { RuntimeErrorSnapshot } from './RuntimeErrorJournal.js';
import type { AcceptanceMatrix } from './AcceptanceMatrix.js';
import { buildReleaseEvidenceFingerprint } from './ReleaseEvidenceFingerprint.js';
import type { ReleaseIntegritySnapshot } from './ReleaseIntegrity.js';

export const RELEASE_APPROVAL_KEY = 'ssc-release-approval-v1';
export type ReleaseApprovalVerdict = 'ready-for-approval' | 'requires-device-cert' | 'requires-release-check' | 'blocked' | 'approved';

export interface ReleaseApprovalRecord {
  candidate: string;
  verdict: ReleaseApprovalVerdict;
  approvedAt: string | null;
  deviceLabel: string;
  detail: string;
  evidenceFingerprint: string | null;
}

export function evaluateReleaseApproval(input: {
  candidate: string;
  acceptance: AcceptanceMatrix | null;
  certification: DeviceCertificationRecord;
  comparison: CertificationComparison;
  errors: RuntimeErrorSnapshot;
  previouslyApproved?: boolean;
  storedApproval?: ReleaseApprovalRecord | null;
  currentFingerprint?: string;
  integrity?: ReleaseIntegritySnapshot | null;
}): ReleaseApprovalRecord {
  const cert = certificationSummary(input.certification);
  const fingerprint = input.currentFingerprint ?? buildReleaseEvidenceFingerprint({ candidate: input.candidate, certification: input.certification, errors: input.errors, integrity: input.integrity });
  if (input.integrity && input.integrity.status !== 'pass') return { candidate: input.candidate, verdict: 'blocked', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: input.integrity.status === 'checking' ? 'DEPLOY INTEGRITY CHECK RUNNING' : input.integrity.status === 'untested' ? 'RUN DEPLOY SHA-256 INTEGRITY CHECK' : `${input.integrity.mismatches.length} DEPLOYED FILE MISMATCH(ES)`, evidenceFingerprint: fingerprint };
  if (input.errors.fatal > 0 || (input.acceptance?.blocked ?? 0) > 0) return { candidate: input.candidate, verdict: 'blocked', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: input.errors.fatal ? 'FATAL RUNTIME ERROR RECORDED' : `${input.acceptance?.blocked ?? 0} ACCEPTANCE BLOCKER(S)`, evidenceFingerprint: fingerprint };
  if (input.errors.errors > 0) return { candidate: input.candidate, verdict: 'blocked', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: `${input.errors.errors} CURRENT RUNTIME ERROR(S) REQUIRE REVIEW`, evidenceFingerprint: fingerprint };
  if (!input.acceptance) return { candidate: input.candidate, verdict: 'requires-release-check', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: 'RUN RELEASE CHECK AND SAVE ACCEPTANCE MATRIX', evidenceFingerprint: fingerprint };
  if (cert.status !== 'pass') return { candidate: input.candidate, verdict: 'requires-device-cert', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: `${cert.passed}/${cert.total} DEVICE CHECKS PASS`, evidenceFingerprint: fingerprint };
  if (input.acceptance.checks > 0) return { candidate: input.candidate, verdict: 'blocked', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: `${input.acceptance.checks} ACCEPTANCE CHECK(S) REMAIN`, evidenceFingerprint: fingerprint };
  if (input.comparison.regression) return { candidate: input.candidate, verdict: 'blocked', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: input.comparison.detail, evidenceFingerprint: fingerprint };
  const stored = input.storedApproval;
  if (stored?.approvedAt) {
    if (stored.evidenceFingerprint === fingerprint) return { ...stored, verdict: 'approved', detail: 'SEALED EVIDENCE MATCH • OPERATOR APPROVAL CURRENT', evidenceFingerprint: fingerprint };
    return { candidate: input.candidate, verdict: 'ready-for-approval', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: 'EVIDENCE CHANGED • RE-APPROVAL REQUIRED', evidenceFingerprint: fingerprint };
  }
  if (input.previouslyApproved) return { candidate: input.candidate, verdict: 'approved', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: 'OPERATOR APPROVAL RECORDED', evidenceFingerprint: fingerprint };
  return { candidate: input.candidate, verdict: 'ready-for-approval', approvedAt: null, deviceLabel: input.certification.deviceLabel, detail: 'AUTOMATED + DEVICE CHECKS PASS • OPERATOR APPROVAL AVAILABLE', evidenceFingerprint: fingerprint };
}

export class ReleaseApprovalStore {
  constructor(private readonly candidate: string) {}
  isApproved(): boolean { return !!this.read()?.approvedAt; }
  approve(deviceLabel: string, evidenceFingerprint: string): ReleaseApprovalRecord {
    const record: ReleaseApprovalRecord = { candidate: this.candidate, verdict: 'approved', approvedAt: new Date().toISOString(), deviceLabel, detail: 'SEALED EVIDENCE MATCH • OPERATOR APPROVAL CURRENT', evidenceFingerprint };
    if (typeof localStorage !== 'undefined') try { localStorage.setItem(RELEASE_APPROVAL_KEY, JSON.stringify(record)); } catch { /* best effort */ }
    return record;
  }
  revoke(): void { if (typeof localStorage !== 'undefined') try { localStorage.removeItem(RELEASE_APPROVAL_KEY); } catch { /* best effort */ } }
  snapshot(): ReleaseApprovalRecord | null { return this.read(); }
  private read(): ReleaseApprovalRecord | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const value = JSON.parse(localStorage.getItem(RELEASE_APPROVAL_KEY) ?? 'null') as Partial<ReleaseApprovalRecord> | null;
      if (!value || value.candidate !== this.candidate || !value.approvedAt || !value.deviceLabel) return null;
      return { candidate: this.candidate, verdict: 'approved', approvedAt: value.approvedAt, deviceLabel: value.deviceLabel, detail: value.detail ?? 'OPERATOR APPROVAL RECORDED', evidenceFingerprint: typeof value.evidenceFingerprint === 'string' ? value.evidenceFingerprint : null };
    } catch { return null; }
  }
}
