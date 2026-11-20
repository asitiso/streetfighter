# Authored arcade stage backgrounds v2

Five original panoramas generated with the built-in image generation tool for the requested Street Fighter III era arcade mood. Each stage has a PNG source and exact prompt. No game screenshot or extracted game artwork was used.

Runtime siblings live in public/art/stage-backgrounds-v2; existing stage PNGs remain unchanged. Build with scripts/build-stage-backgrounds-v2.py (Pillow). Conversion preserves original2172×724 composition; WebPquality85/method6. qa.json records dimensions, encoded and decoded sizes, source/runtimeSHA256. Total runtime1986980bytes.

Renderer scrolls a full panorama through belt mode and frames its middle for duels. Floor remains open behind actors; existing block geometry is used only before the art becomes ready. No combat/input/timing behavior changed.

## Exact generation prompts

- [newyork](newyork.prompt.txt)
- [hongkong](hongkong.prompt.txt)
- [japan](japan.prompt.txt)
- [london](london.prompt.txt)
- [society](society.prompt.txt)
