import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_CANDIDATE } from '../dist/assets/core/ReleaseReport.js';
import { GAME_CACHE_NAME } from '../dist/assets/core/AssetManager.js';

const root = new URL('../dist/', import.meta.url);
const rootPath = fileURLToPath(root);

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

function digest(buffer) { return createHash('sha256').update(buffer).digest('hex').toUpperCase(); }

const files = [];
for (const full of (await walk(rootPath)).sort()) {
  const rel = relative(rootPath, full).split(sep).join('/');
  if (rel === 'release-integrity.json' || rel.endsWith('.map')) continue;
  const data = await readFile(full);
  files.push({ path: `/${rel}`, bytes: data.byteLength, sha256: digest(data) });
}
const rootDigest = digest(Buffer.from(files.map((file) => `${file.path}\0${file.bytes}\0${file.sha256}`).join('\n')));
const manifest = { schema: 1, candidate: RELEASE_CANDIDATE, cache: GAME_CACHE_NAME, generatedAt: new Date().toISOString(), rootSha256: rootDigest, files };
await writeFile(new URL('../dist/release-integrity.json', import.meta.url), JSON.stringify(manifest, null, 2));
console.log(`RELEASE_INTEGRITY ${RELEASE_CANDIDATE} ${files.length} FILES ${rootDigest.slice(0, 16)}`);
