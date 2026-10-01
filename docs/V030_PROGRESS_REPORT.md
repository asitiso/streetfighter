# Side-Scroll Chronicles — v0.0.30-rc.5

## Focus
RC5 concentrates on release diagnostics and operational recovery without changing the fixed-60Hz combat rules.

## Implemented
- Device Certification JSON import with candidate validation.
- Recovery History journal for session recovery, load retry/back, update apply/auto-recovery, rollback/restore, and certification import.
- New DIAGNOSTICS screen with three pages:
  - Crash Report
  - Recovery History
  - Final Release Summary
- Diagnostics JSON export and current-candidate crash-log clear action.
- Final one-page release summary combining save health, device certification, touch P95, crash journal, recovery history, FPS/memory, PWA state, and network state.
- Title menu reorganized into a two-column layout when 12 entries are present.
- PWA update manager now records update and rollback recovery history.
- Stage load Retry / Back choices are recorded in recovery history.
- PWA cache bumped to game-cache-v030 and new diagnostic modules added to App Shell.

## Verification
`npm run verify`: PASS.

Preserved regression baselines include:
- Ryu heavy 92 damage.
- Ken SA I 3 hits / 327 damage.
- Juggle 2 hits.
- BELT active attackers 2.
- Stage 1 through Stage 5 flow PASS.
- Urien/Gill, 24 Super Arts, 48 air normals, Continue, Stage Select, Options, endings, save recovery, offline campaign, and 50-minute virtual marathon PASS.

RC5-specific checks:
- Same-candidate Device Certification import: PASS.
- Candidate mismatch rejection: PASS.
- Recovery History aggregation: PASS.
- Diagnostics 3-page surface: PASS.
- Final Release Summary fixture: READY.
- 12-item title menu uses 2-column layout: PASS.
- HTTP delivery for RC5 modules / Stage 5 / SW / manifest: all 200.
- Stage 1–5 and Ending remain dynamic imports: PASS.

## Remaining before V0.1 COMPLETE
Automated RC checks are not a substitute for real-phone certification. Remaining completion work still includes real device PWA install/update/offline testing, touch latency and sustained thermal/FPS observation on phones, plus final production-grade visual/audio asset quality review.
