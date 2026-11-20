import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sha = data => createHash('sha256').update(data).digest('hex').toUpperCase();
// Historical motion snapshots may differ only for this separately verified replacement.
export async function verifyJumpPeer(id, manifest) {
  if (!['ALEX', 'DUDLEY', 'MAKOTO', 'YUN', 'IBUKI', 'RYU', 'KEN', 'CHUNLI', 'URIEN', 'GILL'].includes(id)) return false;
  const slug = id.toLowerCase();
  const read = path => readFile(new URL('../' + path, import.meta.url));
  const record = manifest.records.find(row => row.id === 'jump');
  const qa = JSON.parse(await read('art-source/jump-motion-v2/' + slug + '/qa.json'));
  assert.equal(record.motionRevision, 'jump-motion-v2');
  assert.equal(record.frames, 8);
  assert.equal(record.uniqueDrawings, 8);
  assert(record.enabled && record.poseAuthored);
  assert.equal(sha(await read('public/art/animation-hq/' + slug + '/jump.webp')), record.sha256);
  assert.equal(record.sha256, qa.runtimeSha256);
  assert.equal(record.bytes, qa.runtimeBytes);
  assert.equal(sha(await read(record.source)), record.sourceSha256);
  assert.equal(record.sourceSha256, qa.sourceSha256);
  for (const key of ['poseQa', 'semanticQa', 'handoffQa', 'normalization', 'metrics', 'encoding', 'sourceGrid', 'sourceOrder', 'sourceOverrides']) {
    assert.deepEqual(record[key], qa[key]);
  }
  assert(record.poseQa.poseAuthoredPass && record.semanticQa.semanticQaPass);
  assert(Object.values(record.handoffQa).every(bridge => bridge.pass));
  assert(qa.centroidStepReductionPercent > 0);
  assert.equal(qa.decodedMemoryDelta, 0);
  return true;
}
