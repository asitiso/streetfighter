# Ryu / Ken / Chun-Li / Ibuki base fallback continuity

Reuse existing approved `../throw-escape-motion-v1/{ryu,ken,chunli,ibuki}/reference-idle.png` raw bytes as separate versioned LITE/HD runtime PNGs. This aligns fallback bodies with authored attack identities and fixes Ken white-pants / Ibuki raised-knee legacy body switches. No image generation, editing, alpha removal, recolour or resampling. Legacy WebPs, approved HQ paths/files, authored animation priorities and all attack atlases preserved.

Manifest lists source SHA/size and runtime paths. `node scripts/verify-hq-roster-base-identity.mjs` checks both quality modes, simulated HQ+HD failure, LITE fallback, HD retry and original HQ recovery/priority. Native browser also blocks HQ only in a private helper, then restores it to compare untouched HQ rendering, plus actual attack frame landmarks. LITE decoded memory delta for four384x448 originals vs192x224 bodies:2064384bytes.
