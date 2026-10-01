# RC31 HD Character Texture Pipeline

## Logical registration
- Combat sprite logical frame: 192×224
- HD combat source: 384×448
- Attack atlas logical frame: 192×224
- Lite attack atlas: 960×896 (5 columns × 4 rows)
- HD attack atlas: 1920×1792

The world-space destination rectangle stays 192×224. HD changes source density, not gameplay scale.

## Runtime selection
`CharacterTextureManager` resolves HD first in `HD` mode and in eligible `AUTO` mode. If HD is not loaded or unavailable, it immediately falls back to Lite.

`AUTO` rules:
- LOW runtime quality → Lite
- BALANCED with reported device memory < 4 GB → Lite
- otherwise → HD

## Cache policy
Lite character textures stay in the install shell. HD textures are not install-shell pinned. They are loaded on character focus/selection and the service worker runtime cache stores successful requests.

## Sampling
HD uses Canvas smoothing with `imageSmoothingQuality = high`. Balanced Lite uses smoothing; LOW keeps the fastest path.

## Memory policy
The texture manager keeps a small recent-character working set and releases older decoded HD images. Stage entry explicitly focuses the player and preloads the current opponent.

## Source quality note
The RC31 generated pack is a 2× alpha-safe reconstruction from the current source art. It improves sampling headroom and edge stability but cannot invent detail absent from the original. Future hand-authored or source-rendered HD images can replace these files without code changes if dimensions and registration remain identical.
