# Side-Scroll Chronicles — v0.0.46-rc.21 Progress Report

## Focus
RC21 closes the remaining high-value playable-character attack-art gap without replacing proven combat timing or collision logic. It adds baked attack sprite strips for the eight playable fighters while preserving the articulated renderer at the active/contact frames where move-specific silhouettes matter most.

## Attack sprite strip pass
- 8 playable fighters: RYU, KEN, CHUNLI, ALEX, DUDLEY, MAKOTO, IBUKI, YUN
- 4 attack families per fighter: NORMAL / SPECIAL / SUPER / THROW
- 5 baked frames per family
- 160 total attack sprite frames
- Transparent WebP attack atlases under `public/art/attack-atlases/`
- Total attack-atlas payload: about 1363 KB

## Hybrid render rule
- Startup / anticipation: attack atlas sprite strip
- Active / contact: existing articulated move-specific renderer
- Follow-through / recovery: attack atlas sprite strip
- Air attacks: articulated renderer retained
- Throw sync victims and Super victims: existing synchronized articulated animation retained

This prevents a generic sprite strip from flattening the most important hit silhouettes while still moving most of the attack presentation to real image assets.

## Runtime integration
- New `src/render/AttackSpriteProfiles.ts`
- `ImageAssets.ts` now exposes attack atlas keys and playable atlas preload list
- `Visuals.ts` selects sprite-atlas frames before falling back to the articulated renderer
- Stage boot preloads combat sprites + attack atlases for immediate decode
- Pixel rendering keeps image smoothing disabled

## PWA / offline
- Version: `0.0.46-rc.21`
- Cache: `game-cache-v046`
- Eight attack atlases are in the App Shell so any playable fighter works immediately after a completed installation, including offline use.
- Stage 1–5 backgrounds / foregrounds / stage music / Final Boss music / Ending music remain deferred by stage and are not pulled into the initial App Shell.

## Verification
Final `npm run verify`: PASS.

Preserved baselines include:
- Ryu Heavy: 92 DAMAGE
- Ken SA I: 3 HIT / 327 DAMAGE
- Juggle: 2 HIT
- BELT active attackers: 2
- Stage 1→5 flow
- Urien / Gill flow
- 24 Super Arts
- 48 Air Normals
- 50-minute virtual marathon
- Gill 3-phase HUD
- Stage parallax / foreground / VFX timing
- Production OGG music and FINAL crossfade
- PWA / offline / update / diagnostics / evidence seal

RC21-specific acceptance:
- 8 attack atlases present in deploy manifest
- 160 baked attack frames represented
- NORMAL / SPECIAL / SUPER / THROW routing verified
- Active/contact frames verified to use articulated fallback
- Air attacks verified to retain articulated motion
- App Shell includes all playable attack atlases
- Attack atlas total payload < 1.6 MB
- Deploy SHA-256 recheck passes
- Final Proof seal remains valid when evidence matches

## Deploy integrity
- Manifest files: 139
- SHA-256 root: `1023B9B9C70AC5BF18466F3A3654115FC662756CB00F4B0436AF324719C2DC02`
- Direct HTTP checks: PASS for `/`, `main.js`, `AttackSpriteProfiles.js`, `Visuals.js`, representative attack atlases, Stage audio, Stage 5 foreground, service worker, manifest and integrity manifest.

## Master-plan position
PHASE 1 Visual Master, Stage 1–5 background/foreground asset application, production audio pass, and the high-value PHASE 3/6 playable character art conversion are now implemented at the release-candidate level.

The intentional hybrid contact renderer is not considered a missing feature: contact frames retain the higher-fidelity move-specific articulated pose rather than substituting a generic family sprite.

## Remaining V0.1 blocker
The remaining blocker is physical-device certification on an installed real smartphone:
- touch feel / latency
- notch / rounded-corner visual inspection
- airplane-mode Stage transitions on the installed PWA
- 10+ minute heat / throttling observation
- final visual/audio review on the target phone speaker/display

The project already contains the guided Final Cert Run, Proof Bundle, Evidence Seal and deploy-integrity checks for this step. No additional release-check UI is recommended before the real-device run because it would add maintenance without materially reducing the remaining work.
