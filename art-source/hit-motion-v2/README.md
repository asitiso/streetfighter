# Character hit motion v2 — complete roster

Ten characters now use eight original hit-recoil/recovery drawings each (80drawings). Built-in imagegen created character art from local references. The first completed Ibuki/Makoto/Chun-Li assets remain byte-identical; this batch adds56drawings for the other seven. Previous guard v2 and all other motions remain untouched.

| Character | Accepted source | Exact prompt | Max centroid step reduction | Bytes | Runtime RGB |
| --- | --- | --- | ---: | ---: | --- |
| ibuki | [generated-sheet-v1.png](ibuki/generated-sheet-v1.png) | [prompt.txt](ibuki/prompt.txt) | 66.4% | 699236 | lossless |
| makoto | [generated-sheet-v1.png](makoto/generated-sheet-v1.png) | [prompt.txt](makoto/prompt.txt) | 67.49% | 347340 | lossy quality100 |
| chunli | [generated-sheet-v1.png](chunli/generated-sheet-v1.png) | [prompt.txt](chunli/prompt.txt) | 57.64% | 675564 | lossless |
| ken | [generated-sheet-v3.png](ken/generated-sheet-v3.png) | [prompt-v3.txt](ken/prompt-v3.txt) | 8.82% | 725962 | lossless |
| ryu | [generated-sheet-v2.png](ryu/generated-sheet-v2.png) | [prompt-v2.txt](ryu/prompt-v2.txt) | 36.77% | 767776 | lossless |
| alex | [generated-sheet-v1.png](alex/generated-sheet-v1.png) | [prompt.txt](alex/prompt.txt) | 31.98% | 675874 | lossless |
| dudley | [generated-sheet-v3.png](dudley/generated-sheet-v3.png) | [prompt-v3.txt](dudley/prompt-v3.txt) | 3.15% | 474252 | lossless |
| yun | [generated-sheet-v2.png](yun/generated-sheet-v2.png) | [prompt-v2.txt](yun/prompt-v2.txt) | 37.94% | 655630 | lossless |
| urien | [generated-sheet-v1.png](urien/generated-sheet-v1.png) | [prompt.txt](urien/prompt.txt) | 35.24% | 339892 | lossy quality100 |
| gill | [generated-sheet-v1.png](gill/generated-sheet-v1.png) | [prompt.txt](gill/prompt.txt) | 56.13% | 387398 | lossy quality100 |

All alpha is lossless. RGB is lossless unless an existing character entry cap requires bounded high-quality WebP; encoding details and measured PSNR are saved in qa.json and the runtime manifest. Original source PNGs and exact prompts remain unaltered, including unselected earlier attempts.

References: Ken/Ryu/Chun-Li/Ibuki use `public/art/combat-sprites-hq/<id>.webp`; Alex/Dudley/Makoto/Yun/Urien/Gill use the first complete character in installed `public/art/animation-hq/<id>/idle.webp`. Costume, rendering style, face, hair and Gill color split follow these references.

Each character folder contains accepted original source, exact prompt, previous-hit.webp, previous-manifest.json, candidate-hit.png and qa.json. Runtime output: `public/art/animation-hq/<id>/hit.webp`; source/runtime SHA256, grid2×4, direct sourceOrder1–8, normalization and encoding metadata live in its manifest. No duplicated source drawings or procedural body morphing/interpolation.

Technical normalization uses the existing extraction and uniform idle-recovery-height/ground-baseline alignment. Ken v3 additionally preserves source-drawn whole-body root positions relative to the neutral anchors in each column (frames1and8); source_column_roots uses the same connected-body ordering as extraction and records source centers, scale and applied offsets. No new playback system. Other characters retain the existing single recovery-foot offset alignment.

Source QA: `python3 scripts/build-hit-motion-v2.py`. Atomic all-character installation only after every candidate passes: append `--install`. Installed decoded-image QA: append `--runtime`. Optional single-character selector `--character <lowercase-id>`. Requires existing Pillow/NumPy/pose dependencies and unchanged guard encoder helpers. Existing production hit pose/semantic/idle-handoff limits and download caps remain unchanged; each new strip also reduces maximum centroid step versus its saved original.

Runtime keeps exactly8×384×448frames per character, original FPS, hitstun, damage, registry and decoded memory. JavaScript verifier exercises all ten characters/bothfacings, eight-frame actual hit playback, frozen hitstop, repeated-hit restart and recovery counterattack. Real-browser preview: `/character-hit-qa.html`; use the group dropdown for all ten characters and play/stop for motion. Headless snapshots cover160frame/facing combinations.
