import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sha = data => createHash('sha256').update(data).digest('hex').toUpperCase();
// Historical motion snapshots may differ only for this separately verified replacement.
export async function verifyForwardWalkPeer(id, manifest) {
  if (!['IBUKI', 'MAKOTO', 'RYU', 'KEN', 'DUDLEY', 'CHUNLI', 'ALEX', 'YUN', 'URIEN', 'GILL'].includes(id)) return false;
  const slug = id.toLowerCase();
  const read = path => readFile(new URL('../' + path, import.meta.url));
  const record = manifest.records.find(row => row.id === 'walk');
  const qa = JSON.parse(await read('art-source/walk-forward-motion-v2/' + slug + '/qa.json'));
  assert.equal(record.motionRevision, 'walk-forward-motion-v2');
  assert.equal(record.frames, 12);
  assert.equal(record.uniqueDrawings, 12);
  assert(record.enabled && record.poseAuthored);
  assert.equal(sha(await read('public/art/animation-hq/' + slug + '/walk.webp')), record.sha256);
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
  assert(qa.cyclicCentroidStepMax < qa.previousCyclicCentroidStepMax);
  assert.equal(qa.decodedMemoryDelta, 0);
  return true;
}
