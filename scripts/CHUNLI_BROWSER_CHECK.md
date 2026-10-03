# Chun-Li browser render check

After building the game, run `npm run prepare:chunli-browser-check`, serve `dist` locally with the existing `npm run serve`, and open `/__chunli-browser-check.html` on that server.

The generated check page uses the actual browser image decoder, animation texture manager, Fighter move entry, timing mapper, and game canvas renderer. Select Spinning Bird Kick, normal/EX Kikoken, standing light punch or standing heavy palm and either facing. It draws every reachable source frame at its actual combat tick, checks the drawn source/destination pixel scale, and displays start/active/recovery coverage. This makes short actions repeatable without manual command entry or combat interruptions. PNG export uses the browser's standard download feature.

Before each move entry the fixture replenishes its own meter, and it checks the selected move was accepted. The initial fixture consumed its meter while switching/facing checks, causing EX entry to be rejected and an older move to remain; this was fixed before recording results. A fast variant may legitimately skip source poses, so the check requires every reachable pose to render correctly, both endpoints and all three phases, instead of requiring every stored pose at every move speed. Texture readiness is derived from the registry, not a fixed count.

The check is generated into `dist` only when requested. A clean production build removes it; it is absent from public assets, offline preload and the normal game UI. No new runtime dependency is required. The temporary fixture uses HD/high quality for repeatable capture.

2026-10-03 verification: normal/EX Kikoken, Spinning Bird Kick, standing light and heavy punch passed in both facings (10 combinations). Every currently stored action pose was reachable: 12F/12F/12F/7F/10F respectively. No warning/error browser console entries. Chun-Li character selection and stage entry also succeeded. This covers browser rendering and asset loading; full manual special command input and every combat interaction are separate from this render check.

2026-10-03 rising-kick increment: the page adds Tensyo Kyaku and advances real Fighter.updatePlayer state, retaining each sampled pose's airborne flag and jumpHeight. This also replaces direct frame assignment for the previous five attacks. Six moves in both facings passed (12 combinations), all expected reachable frames present and no warning/error console entries. The fixture grid has additional vertical room to keep lifted sprites clear of labels. The separate trajectory regression follows rising kick through flight and actual landing, which can occur after the move recovery ends. Manual command input and all combat interactions remain outside this browser render fixture.

## Houyokusen extension (2026-10-03)

Generic super and SA2 added: eight moves in both facings (16 combinations) passed without console warnings/errors. Their unchanged startup allows 15/16 and 14/16 stored art frames respectively; all reachable frames, contact/recovery phases and endpoints passed. Chun-Li now has 126 enabled authored frames in 13 records, cache v080.
