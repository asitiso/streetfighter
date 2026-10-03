import { access, readFile, writeFile } from 'node:fs/promises';
const template = new URL('./chunli-browser-check.html', import.meta.url);
const target = new URL('../dist/__chunli-browser-check.html', import.meta.url);
try { await access(new URL('../dist/assets/render/Visuals.js', import.meta.url)); }
catch { throw new Error('Build the game before preparing the browser check: npm run build'); }
await writeFile(target, await readFile(template));
console.log('Open /__chunli-browser-check.html on the local dist server. This check page is not part of a production build.');
