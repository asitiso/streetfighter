# Ibuki developer browser check

Run a clean game build, then `npm run prepare:ibuki-browser-check` and serve dist. Open `/__ibuki-browser-check.html`. The page loads actual enabled texture assets, advances Fighter.updatePlayer through idle, records each state-clock sample, and draws the game Canvas renderer. Change facing to check both directions. Checks cover all six frames, wrap, source width, decoded strip dimensions and destination pixel scale. It is a renderer integration check; command input and manual stage play are separate.

2026-10-03: both facings passed 6/6 frames, loop=true, rendering failures=0, no browser warning/error entries. Only idle is authored/enabled (6F of 57 staged base frames). A clean production build removes this generated page.
