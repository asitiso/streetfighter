# Side-Scroll Chronicles — v0.0.34-rc.9

## RC9 focus
- BELT / DUEL / FINAL BOSS HUDs are now separate layouts instead of one shared top bar.
- Stage-specific lighting and fighter floor shadows are driven by five unique lighting profiles.
- Attack afterimages and projectile trails vary by move family/owner (wave, kunai, cold/flame/electric, spiral, rush/heavy).
- Stage loading cards now show a route line describing the upcoming gameplay flow.
- Stage intro adds a concise BELT → DUEL route card; Stage 5 explicitly shows BELT → URIEN → GILL FINAL.
- Audio transitions added for Stage Intro, BELT→DUEL, Stage Clear, Final KO, and Ending.
- Gill FINAL BOSS HUD shows dedicated phase indicators and Seraphic Core label.

## Changed / added files
- `src/render/CombatPresentationProfiles.ts` — HUD mode, stage lighting, attack/projectile trail profiles.
- `src/scenes/Stage1Scene.ts` — three HUD modes, stage lighting/shadows, trail rendering, intro route, audio transition calls.
- `src/core/AudioManager.ts` — stage intro, duel transition, stage clear, final KO, ending transition cues.
- `src/core/LoadingProfiles.ts` — stage/ending route metadata.
- `src/core/GameApp.ts` / `src/styles.css` — loading route UI.
- `public/sw.js` — `game-cache-v034`, CombatPresentationProfiles app-shell cache.
- `scripts/verify-v034-rc9.mjs` — RC9 automated acceptance.
- package/release/title metadata updated to `0.0.34-rc.9` / `game-cache-v034`.

## Automated verification
`npm run verify` — PASS.

Existing gameplay baselines preserved:
- Ryu heavy: 92 damage.
- Ken SA I: 3 hit / 327 damage.
- Juggle: 2 hits.
- BELT active attackers: 2.
- Stage 1→5 campaign, Urien/Gill, 24 Super Arts, 48 Air Normals, save/offline/update/diagnostics: PASS.
- 50-minute virtual marathon: PASS.

RC9-specific checks:
- HUD modes: belt / duel / boss — PASS.
- Five distinct stage-lighting profiles — PASS.
- Projectile trail families — PASS.
- Loading routes Stage 1→5 + Ending — PASS.
- Audio transitions Stage Intro / Duel / Stage Clear / Final KO / Ending — PASS.

## Deployment verification
Local HTTP verification returned 200 for:
- `/`
- `/assets/main.js`
- `/assets/render/CombatPresentationProfiles.js`
- `/assets/render/FinalPresentationProfiles.js`
- `/assets/core/AudioManager.js`
- `/assets/core/LoadingProfiles.js`
- `/assets/scenes/Stage1Scene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

Stage 1–5 and Ending remain dynamic imports.

## Remaining before V0.1 COMPLETE
Automated RC checks are strong, but V0.1 COMPLETE still requires real-device certification and the final production-grade visual/audio asset pass required by the master spec.
