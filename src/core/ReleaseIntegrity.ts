import { GAME_CACHE_NAME } from './AssetManager.js';
import { RELEASE_CANDIDATE } from './ReleaseReport.js';

export type ReleaseIntegrityStatus = 'untested' | 'checking' | 'pass' | 'fail';

export interface ReleaseIntegrityFileEntry {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ReleaseIntegrityManifest {
  schema: 1;
  candidate: string;
  cache: string;
  generatedAt: string;
  rootSha256: string;
  files: ReleaseIntegrityFileEntry[];
}

export interface ReleaseIntegritySnapshot {
  status: ReleaseIntegrityStatus;
  checkedAt: string | null;
  candidate: string | null;
  cache: string | null;
  manifestRoot: string | null;
  checked: number;
  total: number;
  mismatches: string[];
  message: string;
}

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function sha256(data: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('WEB CRYPTO SHA-256 UNAVAILABLE');
  return hex(await globalThis.crypto.subtle.digest('SHA-256', data));
}

function clone(snapshot: ReleaseIntegritySnapshot): ReleaseIntegritySnapshot {
  return { ...snapshot, mismatches: [...snapshot.mismatches] };
}

export class ReleaseIntegrityVerifier {
  private state: ReleaseIntegritySnapshot = {
    status: 'untested', checkedAt: null, candidate: null, cache: null, manifestRoot: null,
    checked: 0, total: 0, mismatches: [], message: 'NOT CHECKED',
  };
  private pending: Promise<ReleaseIntegritySnapshot> | null = null;

  snapshot(): ReleaseIntegritySnapshot { return clone(this.state); }

  verify(): Promise<ReleaseIntegritySnapshot> {
    if (this.pending) return this.pending;
    this.pending = this.run().finally(() => { this.pending = null; });
    return this.pending;
  }

  private async run(): Promise<ReleaseIntegritySnapshot> {
    this.state = { ...this.state, status: 'checking', checked: 0, mismatches: [], message: 'VERIFYING DEPLOYED BUILD' };
    try {
      const response = await fetch('/release-integrity.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`INTEGRITY MANIFEST HTTP ${response.status}`);
      const manifest = await response.json() as ReleaseIntegrityManifest;
      if (manifest.schema !== 1 || !Array.isArray(manifest.files) || !manifest.rootSha256) throw new Error('INVALID INTEGRITY MANIFEST');
      const mismatches: string[] = [];
      if (manifest.candidate !== RELEASE_CANDIDATE) mismatches.push(`CANDIDATE ${manifest.candidate} != ${RELEASE_CANDIDATE}`);
      if (manifest.cache !== GAME_CACHE_NAME) mismatches.push(`CACHE ${manifest.cache} != ${GAME_CACHE_NAME}`);
      this.state = { ...this.state, candidate: manifest.candidate, cache: manifest.cache, manifestRoot: manifest.rootSha256, total: manifest.files.length };

      const concurrency = 8;
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < manifest.files.length) {
          const index = cursor++;
          const entry = manifest.files[index]!;
          try {
            const asset = await fetch(entry.path, { cache: 'reload' });
            if (!asset.ok) { mismatches.push(`${entry.path} HTTP ${asset.status}`); continue; }
            const bytes = await asset.arrayBuffer();
            if (bytes.byteLength !== entry.bytes) { mismatches.push(`${entry.path} SIZE ${bytes.byteLength} != ${entry.bytes}`); continue; }
            const digest = await sha256(bytes);
            if (digest !== entry.sha256) mismatches.push(`${entry.path} SHA256 ${digest.slice(0, 12)} != ${entry.sha256.slice(0, 12)}`);
          } catch (error) {
            mismatches.push(`${entry.path} ${error instanceof Error ? error.message : 'VERIFY FAILED'}`);
          } finally {
            this.state = { ...this.state, checked: this.state.checked + 1 };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, manifest.files.length || 1) }, () => worker()));
      const status: ReleaseIntegrityStatus = mismatches.length ? 'fail' : 'pass';
      this.state = {
        status,
        checkedAt: new Date().toISOString(),
        candidate: manifest.candidate,
        cache: manifest.cache,
        manifestRoot: manifest.rootSha256,
        checked: manifest.files.length,
        total: manifest.files.length,
        mismatches,
        message: mismatches.length ? `${mismatches.length} DEPLOYED FILE MISMATCH(ES)` : `${manifest.files.length}/${manifest.files.length} FILES SHA-256 MATCH`,
      };
    } catch (error) {
      this.state = {
        ...this.state,
        status: 'fail',
        checkedAt: new Date().toISOString(),
        mismatches: [error instanceof Error ? error.message : 'INTEGRITY VERIFY FAILED'],
        message: error instanceof Error ? error.message : 'INTEGRITY VERIFY FAILED',
      };
    }
    return this.snapshot();
  }
}
