# Character guard motion v2

Created with the built-in imagegen tool from local character references. Creative pose drawing uses imagegen; Python only extracts complete bodies, applies uniform size/foot alignment, validates and packs WebP. No Python creative redrawing or interpolation.

All ten characters have five distinct original runtime guard poses, using source cells 2–6. Existing five 384×448 frames, timing, FPS and decoded memory are unchanged. Eight characters retain lossless RGB. Urien uses quality97 and Gill quality100 RGB compression to satisfy their existing 14MB/17MB entry limits; alpha is lossless for all characters. Encoded RGB PSNR exceeds37dB for both compressed characters. Source originals remain unchanged. Old runtime strips and manifests remain in each character folder. Unaccepted source attempts remain available for audit.

| Character | Accepted source | Exact prompt | Old unique → new | Max centroid step reduction |
| --- | --- | --- | --- | --- |
| ken | [generated-sheet-v1.png](ken/generated-sheet-v1.png) | [prompt.txt](ken/prompt.txt) | 4 → 5 | 38.71% |
| ryu | [generated-sheet-v1.png](ryu/generated-sheet-v1.png) | [prompt.txt](ryu/prompt.txt) | 3 → 5 | 28.3% |
| chunli | [generated-sheet-v1.png](chunli/generated-sheet-v1.png) | [prompt.txt](chunli/prompt.txt) | 3 → 5 | 8.08% |
| alex | [generated-sheet-v3.png](alex/generated-sheet-v3.png) | [prompt-v3.txt](alex/prompt-v3.txt) | 3 → 5 | 15.25% |
| dudley | [generated-sheet-v1.png](dudley/generated-sheet-v1.png) | [prompt.txt](dudley/prompt.txt) | 3 → 5 | 1.01% |
| makoto | [generated-sheet-v2.png](makoto/generated-sheet-v2.png) | [prompt-v2.txt](makoto/prompt-v2.txt) | 3 → 5 | 18.37% |
| ibuki | [generated-sheet-v1.png](ibuki/generated-sheet-v1.png) | [prompt.txt](ibuki/prompt.txt) | 3 → 5 | 25.46% |
| yun | [generated-sheet-v1.png](yun/generated-sheet-v1.png) | [prompt.txt](yun/prompt.txt) | 3 → 5 | 6.5% |
| urien | [generated-sheet-v3.png](urien/generated-sheet-v3.png) | [prompt-v3.txt](urien/prompt-v3.txt) | 2 → 5 | 48.18% |
| gill | [generated-sheet-v1.png](gill/generated-sheet-v1.png) | [prompt.txt](gill/prompt.txt) | 3 → 5 | 37.87% |

References: Ken/Ryu/Chun-Li/Ibuki use `public/art/combat-sprites-hq/<id>.webp`; Alex/Dudley/Makoto/Yun/Urien/Gill use the first complete installed `public/art/animation-hq/<id>/idle.webp` character. Original reference costume/style and proportions are retained.

Source QA: `python3 scripts/build-guard-motion-v2.py` (Pillow, NumPy and existing roster/pose pipeline dependencies). Atomic installation after all candidates pass: append `--install`. Installed-image QA: append `--runtime`. Optional single-character work: `--character <lowercase-id>`. Existing production pose/semantic/idle handoff limits are unchanged, plus five unique drawings, no clipping and a smaller maximum centroid step than the backed-up sequence. Metrics describe runtime frames 1–5 with sourceFrame 2–6; sourceMetrics and sourceShifts describe all six source cells.

Each character folder includes `qa.json`, candidate PNG, previous guard WebP/manifest and exact source/prompt. Runtime output: `public/art/animation-hq/<id>/guard.webp`; complete provenance recorded in its manifest. Browser QA: `/character-guard-qa.html?group=0` and `?group=1`; use the play button to inspect motion.
