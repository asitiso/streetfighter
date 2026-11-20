# Ibuki developer browser check

Run a clean game build, then `npm run prepare:ibuki-browser-check` and serve dist. Open `/__ibuki-browser-check.html`. The page loads actual enabled texture assets, advances Fighter.updatePlayer through idle, records each state-clock sample, and draws the game Canvas renderer. Change facing to check both directions. Checks cover all six frames, wrap, source width, decoded strip dimensions and destination pixel scale. It is a renderer integration check; command input and manual stage play are separate.

2026-10-03: both facings passed 6/6 frames, loop=true, rendering failures=0, no browser warning/error entries. Only idle is authored/enabled (6F of 57 staged base frames). A clean production build removes this generated page.

Walk increment: select idle/walk and each facing. Readiness uses enabled registry count; actual state and velocity samples feed the renderer. All four combinations passed (idle 6/6, walk 12/12), loop=true, zero rendering failures and console warnings/errors. Ibuki now has 18 enabled authored frames. This supersedes the idle-only milestone above.

Retreat increment: select idle/walk/walk-back and both facings (six combinations). All 6/12/10 frames and loop wraps passed, zero render failures and console warnings/errors. Arena width avoids clamping during 120 actual input ticks. Three authored records total 28 enabled frames; cache v085. Renderer integration does not claim a manual stage playthrough.

Dash increment: idle/walk/retreat and forward/back dash in both facings passed (10 combinations). Dash uses actual captureInput/updatePlayer doubletap and restores sampled dashFrames in the Canvas renderer. Existing8-tick ease-out reaches6/7 stored frames [0,1,3,4,5,6]; the skipped drive pose duplicates the next. All reachable phases/endpoints pass; looping motions still require every frame and wrap. Four authored records total35F; cachev086.

Air increment (2026-10-08): Chrome verified14 combinations. Real jump updates supply airborne/height/velocity/landingFrames to actual render. Jump8/8, landing4/6 reachable[1,2,4,5], no render failures or console warnings/errors. Compression/rebound/recovery are covered. Six active records total49F, cachev087.

Landing update (2026-11-11, local YAKSACOM): six original landing-v2 poses now all appear in real jump playback `[0,1,2,3,4,5]` after correcting the landing visual curve to linear. Gameplay landing timers and early-action priority remain unchanged. The browser helper now requires all6poses; current production-renderer screenshots are recorded in `../outputs/roster-landing-motion-v2-group-2.png` and the roster landing verification report. The2026-10-08 measurement above is historical.

Dash update (2026-11-11, local YAKSACOM): all20roster forward/backdash visual curves now use linear sampling over the unchanged8tick gameplay clock, visiting all7stored frames[0,1,2,3,4,5,6]. Historicalv086measurementabove is retained; the currentbrowserhelper requires7/7. Ibuki source contains duplicate drive drawings; this change improves pacing/coverage and does not claim newdistinctIbukidrawings. Ryu/Ken/Chun-Li forwarddash restores a distinct previously skipped drawing. No art/FPS/framecount/physics changes.
