# Side-Scroll Chronicles — v0.0.22 Progress Report

## Focus
- Character-specific Ending scenes
- Persistent stage / campaign battle records
- Battle Record menu and archive UI
- Mobile release polish: background suspension, touch release, production debug gating

## Implemented

### 1. Eight character-specific endings
Added `src/game/EndingProfiles.ts` with unique profiles for:
- Ryu
- Ken
- Chun-Li
- Alex
- Dudley
- Makoto
- Ibuki
- Yun

Each profile defines a unique ending title, location, three-beat epilogue, accent, visual motif, and closing line. `EndingScene` now renders the selected character's ending rather than a shared generic ending.

### 2. Persistent battle record system
Added `src/game/StageResult.ts` and save persistence for stage records.
Each cleared stage records:
- Clear time
- Fighters defeated
- Damage dealt
- Damage taken
- Max combo hits
- Max combo damage
- Parry count
- Red Parry count
- Supers used
- Throws landed

CombatWorld now tracks cumulative combat metrics without altering combat timing or move values.

### 3. Stage Clear result panel
Stage Clear now displays the current stage's battle record before the next stage begins.
Stage 5 includes Gill clear data before transferring into the ending.

### 4. Battle Record menu
Added a `BATTLE RECORD` entry to the title menu when at least one stage result exists.
New `ResultsScene` provides:
- Stage-by-stage table for Stages 1–5
- Campaign totals page
- Total clear time
- Total defeated fighters
- Damage dealt/taken
- Best combo
- Parries / Red Parries
- Supers and throws

Stage results are persisted in IndexedDB and survive Continue / PWA restarts.

### 5. Ending campaign record
The ending now reveals the campaign totals after the character-specific epilogue.
Stage Select and Battle Record availability are clearly communicated at the end.

### 6. Mobile release polish
- Debug overlay is production-off by default and enabled only with `?debug=1`.
- When the app is backgrounded, touch inputs are released, the 60 Hz loop is stopped, and Web Audio is suspended.
- On return, audio and the fixed-step loop resume cleanly without a large accumulated frame catch-up.
- Added overscroll / touch-callout containment for mobile standalone use.

### 7. PWA
- Version: `0.0.22`
- Cache: `game-cache-v022`
- New StageResult / EndingProfiles / ResultsScene modules included in App Shell.
- App Shell audit: 50 entries, 0 missing.

## Verification
`npm run verify` — PASS

New v0.0.22 verification:
- 8 ending profiles
- 8 unique ending titles
- 8 unique closing lines
- 3-beat epilogue for every playable character
- Campaign result aggregation
- Stage result callback values
- Existing combat and campaign regression suite unchanged

Important regression values preserved:
- Ryu Heavy: 92 damage
- Ken SA I: 3 HIT / 327 damage
- Juggle: 2 hits
- BELT active attack slots: 2
- Stage 1→5 callbacks: PASS
- Urien / Gill: PASS
- 24 Super Arts: PASS
- 48 Air Normals: PASS
- Multi-hit / Juggle / Bounce: PASS
- Continue / Stage Select / Options: PASS

HTTP deployment check:
- `/` — 200
- `/assets/main.js` — 200
- `/assets/game/StageResult.js` — 200
- `/assets/game/EndingProfiles.js` — 200
- `/assets/scenes/ResultsScene.js` — 200
- `/assets/scenes/EndingScene.js` — 200
- `/assets/core/GameApp.js` — 200
- `/sw.js` — 200
- `/manifest.webmanifest` — 200

## Remaining before V0.1 COMPLETE
- Final production-grade character/art assets rather than procedural/vector-only presentation
- Final authored music/SFX pass
- Real-device PWA installation and long-session mobile performance verification
- Real-device touch latency and safe-area review across multiple aspect ratios
- Final visual QA against the Visual Master set

V0.1 COMPLETE is not declared yet.
