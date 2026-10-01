# SIDE-SCROLL CHRONICLES — V057 / RC32 Progress Report

## Candidate
- Version: `0.0.57-rc.32`
- Cache: `game-cache-v057`
- Focus: **HD CHARACTER REMASTER / IN-GAME CHARACTER IMAGE CLARITY**

## Why RC32 exists
RC31 proved the HD/Lite architecture and exact 2× asset path, but the original neutral combat sprites are very small pixel sources (`192×224`). A plain Lanczos upscale can look soft, while a nearest/pixel-preserving upscale can look blocky. RC32 changes the HD production pipeline itself rather than only increasing resolution.

## HD remaster pipeline
Updated:
- `scripts/generate-hd-character-assets.py`

New method:
1. **premultiplied-alpha Lanczos 2× upscale** — prevents dark/bright fringe around transparent edges.
2. **Scale2x-style edge-intent reconstruction** — preserves diagonal and silhouette intent from pixel art.
3. **55% premultiplied Lanczos + 45% edge-preserving reconstruction** — balances smoothness and crispness.
4. **restrained micro-contrast pass** — improves costume/body separation without heavy sharpening halos.
5. **high-quality WebP output** — combat sprites quality 99, attack atlases quality 96.

Attack atlases use a premultiplied-alpha high-quality upscale with restrained sharpening. The atlas path remains exact 2× and retains the same logical frame registration, so hitboxes and animation timings are unchanged.

## New quality manifest
Added:
- `public/art/character-quality-manifest.json`

The manifest records all 16 HD assets:
- 8 combat sprites
- 8 attack atlases

For every file it stores:
- source/output dimensions
- output byte size
- source/output SHA-256
- alpha coverage
- soft-alpha coverage
- edge score

This makes the HD build reproducible and verifiable rather than relying on visual inspection alone.

## Runtime image stability
Updated:
- `src/render/CharacterTextureManager.ts`
- `src/render/Visuals.ts`

### HD REMASTER label
The quality UI now reports:
- `HD REMASTER`
- `LITE`

### Static/low-motion pixel alignment
HD textures can still look soft if drawn at fractional logical coordinates. RC32 adds stable-position snapping only when motion is sufficiently low:
- High quality: 0.5 logical-pixel grid
- Balanced: 1 logical-pixel grid
- moving / jumping / follow-through: no snap, preserving smooth movement

This reduces idle/crouch/slow-startup shimmer without making dashes or jumps jerky.

## Lazy loading preserved
The 16 HD files and the quality manifest remain outside the initial App Shell.

`character-hd` asset group now contains 17 entries:
- quality manifest
- 8 HD combat sprites
- 8 HD attack atlases

The initial install continues to use Lite assets and the selected character can be upgraded through the existing HD preload/fallback path.

## Source-master extraction trial
The older RC17 visual master was also tested as a possible higher-detail source for full-body characters. Ryu/Ken/Chun-Li could be extracted partially, but automated matte separation left stage-background contamination and inconsistent transparency, especially for darker costumes such as Ibuki.

Those experimental extractions were **not shipped in the runtime** because they did not meet the quality bar. RC32 therefore keeps the clean, reproducible remaster path rather than replacing working sprites with contaminated source cutouts.

## Automated validation
Full `npm run verify` completed successfully.

Preserved combat baselines include:
- Ryu Heavy: **92 DAMAGE**
- Ken SA I: **3 HIT / 327 DAMAGE**
- Juggle: **2 HIT**
- BELT active attackers: **2**
- Stage 1→5: **PASS**
- Urien / Gill: **PASS**
- 24 Super Arts: **PASS**
- 48 Air Normals: **PASS**
- 50-minute Virtual Marathon: **PASS**
- Offline / Save / Update / Diagnostics: **PASS**
- Final Proof / Release Seal: **PASS**

RC32-specific validation:
- 8 HD combat sprites: **PASS**
- 8 HD attack atlases: **PASS**
- exact 2× dimensions: **PASS**
- quality manifest: **16/16 records PASS**
- HD payload remains under 7 MB: **PASS**
- HD assets remain outside initial App Shell: **PASS**
- Lite fallback: **PASS**
- AUTO / HD / LITE: **PASS**
- HD static pixel alignment: **PASS**
- high-quality sampling: **PASS**

Verdict:
`HD_REMASTER_QUALITY_PASS`

## Build integrity
- Distribution files: **166**
- Root SHA-256:
  `76CA565233D6EEF84A919757CB67E936D4364351FF0A69C834B13BC6303DB7EE`
- HD payload: approximately **6578 KB**

## HTTP deployment check
The following current-build paths returned HTTP 200:
- `/`
- `/assets/main.js`
- `/assets/render/CharacterTextureManager.js`
- `/assets/render/Visuals.js`
- `/art/combat-sprites-hd/ryu.webp`
- `/art/combat-sprites-hd/chunli.webp`
- `/art/attack-atlases-hd/ken.webp`
- `/art/character-quality-manifest.json`
- `/sw.js`
- `/manifest.webmanifest`
- `/release-integrity.json`

## What RC32 does not claim
RC32 improves reconstruction, edge quality, transparency, compression quality, and in-game sampling. It does **not** invent semantic detail that did not exist in the original 192×224 sprite source.

The next truly larger leap in visual fidelity requires either:
- newly authored transparent high-resolution full-body source sprites, or
- a dedicated high-resolution sprite-generation/remaster source with clean alpha and matching animation registration.

RC32 deliberately avoids shipping lower-quality automatic background-removal results merely to claim a new source.
