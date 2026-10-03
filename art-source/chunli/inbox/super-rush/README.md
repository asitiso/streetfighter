# Chun-Li Houyokusen (16 frames)

CHUNLI_SUPER and CHUNLI_SA2 use the authored super-rush strip. SA1, SA3 and airborne attacks remain distinct. Existing combat data, movement and meter costs are unchanged. SA2's seven hit opportunities sample seven distinct contact frames.

Sixteen 640x448 cells preserve the same body pixel scale as the other strips. Twelve complete transparent poses were generated with the built-in imagegen tool, then arranged as [1,1,2,3,4,5,6,7,8,9,10,11,12,2,1,1]. Grounded low, middle, high and finishing kicks return to guard. Repeated guard frames deliberately hold the start/end pose. Startup is 0-2, active 3-11 and recovery 12-15.

The shared semantic gate's horizontal pixel thresholds scale by 640/384; vertical, overlap, area and deformation limits remain unchanged. Source, candidate, runtime, handoff, installer rollback and checksum checks passed. Runtime and candidate hashes match.

Build, combat, mapping and renderer regression checks passed. Actual browser rendering passed eight moves in both facings with no warnings/errors. Generic super reaches 15/16 stored art frames and SA2 reaches 14/16 because their unchanged two- and one-tick startup skips intermediate preparation poses. All contact/recovery phases and endpoints are covered. This does not claim manual command input or all combat interactions were tested.

```sh
python3 scripts/install-authored-chunli-walk.py super-rush --install
python3 scripts/install-authored-chunli-walk.py super-rush --runtime
node scripts/verify-chunli-houyokusen.mjs
node scripts/verify-animation-render-sizing.mjs
npm run prepare:chunli-browser-check
```
