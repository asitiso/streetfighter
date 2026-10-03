import { access, readFile, writeFile } from 'node:fs/promises';
await access(new URL('../dist/assets/render/Visuals.js',import.meta.url));
await writeFile(new URL('../dist/__ibuki-browser-check.html',import.meta.url),await readFile(new URL('./ibuki-browser-check.html',import.meta.url)));
console.log('Open /__ibuki-browser-check.html on the local dist server; clean production builds remove this developer page.');
