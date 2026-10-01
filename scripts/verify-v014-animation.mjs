import assert from 'node:assert/strict';
import { animationKeyframeCount, characterMotionSignature } from '../dist/assets/render/AnimationPoseLibrary.js';

const minimums = { idle: 6, walk: 8, jump: 7, hit: 6, parry: 5, special: 8, super: 10 };
for (const [clip, minimum] of Object.entries(minimums)) {
  const count = animationKeyframeCount(clip);
  assert.ok(count >= minimum, `${clip} needs >= ${minimum} key poses, got ${count}`);
  console.log(`[v014 animation] ${clip}: ${count} key poses`);
}
const roster = ['RYU','KEN','CHUNLI','ALEX','DUDLEY','MAKOTO','IBUKI','YUN'];
const signatures = new Set(roster.map(characterMotionSignature));
assert.equal(signatures.size, roster.length, 'all 8 playable characters should have distinct motion signatures');
console.log(`[v014 animation] distinct playable motion signatures: ${signatures.size}`);
