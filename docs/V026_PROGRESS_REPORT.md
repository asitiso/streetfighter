# Side-Scroll Chronicles — v0.0.26-rc.1 Progress Report

## Focus
Release-candidate resilience and recovery: portable save transfer, cache-upgrade simulation, offline campaign transition checks, automated release report export, and RC packaging.

## Implemented
- Added **SAVE TOOLS** to the title menu.
- Portable JSON save export with app id, schema version, timestamp, checksum, and normalized save data.
- Portable save import rejects malformed JSON, unsupported packages, and checksum mismatch.
- Import keeps the current valid save as the backup record before replacing primary.
- Added five explicit offline transition checks: Stage 1→2, 2→3, 3→4, 4→5, and Stage 5→Ending.
- Added cache update policy simulation covering v024/v025 → v026 while preserving non-game caches and keeping IndexedDB save storage isolated.
- Expanded Release Gate with SAVE TRANSFER, OFFLINE TRANSITIONS, UPDATE MIGRATION, and RELEASE REPORT readiness.
- Release Check HP action exports a JSON release report containing verdict, blockers/warnings, device profile, telemetry, save health, offline status, transition status, update plan, and environment state.
- Advanced package version to **0.0.26-rc.1** and cache to **game-cache-v026**.
- Initial App Shell includes SaveToolsScene, ReleaseReport, and UpdatePolicy; Stage 2–5 and Ending remain deferred/dynamic imports.
- Adjusted title menu spacing for the new eighth menu item.

## Verification
Full `npm run verify` passed, including all previous combat/campaign tests and the new v026 RC test.

Key retained values:
- Ryu Heavy: 92 damage
- Ken SA I: 3 hits / 327 damage
- Juggle: 2 hits
- BELT active attackers: 2
- Stage 1→5 campaign: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Continue / Stage Select / Options / 8 Endings / Battle Record: PASS
- 50-minute virtual marathon: PASS

New RC checks:
- Portable save checksum validation: PASS
- Tampered portable save rejection: PASS
- v024 + v025 stale cache migration plan: PASS
- Save DB / game cache separation: PASS
- Offline campaign transitions: 5/5
- Deferred offline campaign files: 7/7
- Automated Release Gate fixture: READY
- Release report JSON generation: PASS
- Service Worker cache version: game-cache-v026
- Service Worker does not access IndexedDB: PASS
- Stage 1–5 + Ending remain dynamic imports: PASS

## HTTP deployment check
HTTP 200 confirmed for:
- `/`
- `/assets/main.js`
- `/assets/save/SaveManager.js`
- `/assets/scenes/SaveToolsScene.js`
- `/assets/core/ReleaseReport.js`
- `/assets/core/UpdatePolicy.js`
- `/assets/scenes/ReleaseCheckScene.js`
- `/assets/scenes/Stage5Scene.js`
- `/assets/scenes/EndingScene.js`
- `/sw.js`
- `/manifest.webmanifest`

## Release status
This is a **release candidate**, not V0.1 COMPLETE. Remaining acceptance work is primarily real-device PWA installation/update testing, airplane-mode full-campaign testing on actual phones, touch/input latency and thermal/frame testing across device classes, and final production-grade visual/audio asset quality.
