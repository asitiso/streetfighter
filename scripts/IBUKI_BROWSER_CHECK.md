# Ibuki developer browser check

Run a clean game build, then `npm run prepare:ibuki-browser-check` and serve dist. Open `/__ibuki-browser-check.html`. The page loads actual enabled texture assets, advances Fighter.updatePlayer through idle, records each state-clock sample, and draws the game Canvas renderer. Change facing to check both directions. Checks cover all six frames, wrap, source width, decoded strip dimensions and destination pixel scale. It is a renderer integration check; command input and manual stage play are separate.

2026-10-03: both facings passed 6/6 frames, loop=true, rendering failures=0, no browser warning/error entries. Only idle is authored/enabled (6F of 57 staged base frames). A clean production build removes this generated page.

Walk increment: select idle/walk and each facing. Readiness uses enabled registry count; actual state and velocity samples feed the renderer. All four combinations passed (idle 6/6, walk 12/12), loop=true, zero rendering failures and console warnings/errors. Ibuki now has 18 enabled authored frames. This supersedes the idle-only milestone above.

Retreat increment: select idle/walk/walk-back and both facings (six combinations). All 6/12/10 frames and loop wraps passed, zero render failures and console warnings/errors. Arena width avoids clamping during 120 actual input ticks. Three authored records total 28 enabled frames; cache v085. Renderer integration does not claim a manual stage playthrough.

Dash increment: idle/walk/retreat and forward/back dash in both facings passed (10 combinations). Dash uses actual captureInput/updatePlayer doubletap and restores sampled dashFrames in the Canvas renderer. Existing8-tick ease-out reaches6/7 stored frames [0,1,3,4,5,6]; the skipped drive pose duplicates the next. All reachable phases/endpoints pass; looping motions still require every frame and wrap. Four authored records total35F; cachev086.
