# Character landing motion v2 — complete roster

Ten characters now use six original contact/compression/recovery drawings each (60drawings). Built-in imagegen created the character art from local identity and previous landing endpoint references. This batch adds42drawings for Ken/Ryu/Chun-Li/Ibuki/Dudley/Makoto/Yun; completed Alex/Urien/Gill runtime strips and manifests remain byte-identical.

| Character | Accepted original source | Exact prompt | Max centroid step reduction | Runtime bytes |
| --- | --- | --- | ---: | ---: |
| alex | [generated-sheet-v3.png](alex/generated-sheet-v3.png) | [prompt-v3.txt](alex/prompt-v3.txt) | 21.59% | 478610 |
| urien | [generated-sheet-v2.png](urien/generated-sheet-v2.png) | [prompt-v2.txt](urien/prompt-v2.txt) | 21.97% | 405712 |
| gill | [generated-sheet-v2.png](gill/generated-sheet-v2.png) | [prompt-v2.txt](gill/prompt-v2.txt) | 29.04% | 545574 |
| ken | [generated-sheet-v1.png](ken/generated-sheet-v1.png) | [prompt.txt](ken/prompt.txt) | 34.03% | 436212 |
| ryu | [generated-sheet-v2.png](ryu/generated-sheet-v2.png) | [prompt-v2.txt](ryu/prompt-v2.txt) | 30.36% | 529002 |
| chunli | [generated-sheet-v1.png](chunli/generated-sheet-v1.png) | [prompt.txt](chunli/prompt.txt) | 14.67% | 427138 |
| ibuki | [generated-sheet-v2.png](ibuki/generated-sheet-v2.png) | [prompt-v2.txt](ibuki/prompt-v2.txt) | 33.69% | 474208 |
| dudley | [generated-sheet-v1.png](dudley/generated-sheet-v1.png) | [prompt.txt](dudley/prompt.txt) | 10.67% | 293418 |
| makoto | [generated-sheet-v1.png](makoto/generated-sheet-v1.png) | [prompt.txt](makoto/prompt.txt) | 5.44% | 407176 |
| yun | [generated-sheet-v2.png](yun/generated-sheet-v2.png) | [prompt-v2.txt](yun/prompt-v2.txt) | 8.85% | 444844 |

All ten runtime RGB and alpha encodings are lossless. Source originals/earlier attempts remain unaltered; each folder contains exact prompt, previous-landing.webp, previous-manifest.json, candidate-landing.png and qa.json. New seven folders also preserve previous-qa.json baseline measurements. Legacy Ryu lacked stored semanticQa, so its comparison is computed from the exact SHA-verified saved runtime.

References: Ken/Ryu/Chun-Li/Ibuki use individual `public/art/combat-sprites-hq/<id>.webp`; other characters use the first complete installed idle.webp pose. The old landing.webp strip guides contact/recovery endpoints. Every six-cell2×3source drawing is used exactly once, without duplicates, procedural body morphing or new interpolation. Python only extracts complete bodies, uses uniform idle-recovery-height scaling/ground alignment and packs images.

Fixed a separate visual playback defect: Ken/Ryu/Chun-Li/Ibuki landing ease-out curves previously exposed only poses1/2/4/5 and reached the final pose early. Only their landing registry curves changed to linear, matching the six other characters. All six0–5poses now appear during actual gameplay timers7,6,5,4,3,2,1. FPS,frame counts,Fighter timers,input priority,damage and decoded memory remain unchanged. The dedicated real-jump/hitstop regression verifies40cases/60freezechecks. Existing Ibuki air/browser checks now require all six poses; historical report text is retained with a dated update.

Source QA: `python3 scripts/build-landing-motion-v2.py`; add `--install` for atomic passing-batch install or `--runtime` for actual decoded QA. Optional `--character <lowercase-id>`. Uses existing Pillow/NumPy/pose dependencies, unchanged guard encoder and roster air_bridges. Production pose/landing semantic/air-handoff thresholds and existing download caps remain unchanged, plus six unique drawings/no clipping/strictly lower centroid step. All existing guard/hit/jump files remain untouched.

Runtime: `public/art/animation-hq/<id>/landing.webp`; manifest source/runtime SHA256, direct sourceOrder1–6, normalization and encoding. Independent source resolutions normalize to the installed idle recovery-height target; legacy paired-source equality and current per-frame anatomical-scale/air bridges remain verified. Original six-character `build-roster-motions.py --kind air --runtime` passes.

Browser preview: `/character-landing-qa.html`; group dropdown covers3/3/3/1characters, play/stop previews movement. Real browser snapshots cover120frame/facing cells. Focused asset verifier exercises20actualjump/facing cases,140draws,60hitstopchecks,20recovery and20immediateattackinterrupts. Full isolated build/typecheck/JavaScript regression:243/243.
