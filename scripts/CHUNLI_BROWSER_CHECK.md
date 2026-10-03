# Chun-Li browser render check

After building the game, run `npm run prepare:chunli-browser-check`, serve `dist` locally with the existing `npm run serve`, and open `/__chunli-browser-check.html` on that server.

The generated check page uses the actual browser image decoder, animation texture manager, Fighter move entry, timing mapper, and game canvas renderer. Select Spinning Bird Kick, normal/EX Kikoken, standing light punch or standing heavy palm and either facing. It draws every reachable source frame at its actual combat tick, checks the drawn source/destination pixel scale, and displays start/active/recovery coverage. This makes short actions repeatable without manual command entry or combat interruptions. PNG export uses the browser's standard download feature.

Before each move entry the fixture replenishes its own meter, and it checks the selected move was accepted. The initial fixture consumed its meter while switching/facing checks, causing EX entry to be rejected and an older move to remain; this was fixed before recording results. A fast variant may legitimately skip source poses, so the check requires every reachable pose to render correctly, both endpoints and all three phases, instead of requiring every stored pose at every move speed. Texture readiness is derived from the registry, not a fixed count.

The check is generated into `dist` only when requested. A clean production build removes it; it is absent from public assets, offline preload and the normal game UI. No new runtime dependency is required. The temporary fixture uses HD/high quality for repeatable capture.

2026-10-03 verification: normal/EX Kikoken, Spinning Bird Kick, standing light and heavy punch passed in both facings (10 combinations). Every currently stored action pose was reachable: 12F/12F/12F/7F/10F respectively. No warning/error browser console entries. Chun-Li character selection and stage entry also succeeded. This covers browser rendering and asset loading; full manual special command input and every combat interaction are separate from this render check.
