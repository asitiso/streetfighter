# Backward dash motion v2 — all ten characters

Built-in imagegen created seven distinct runtime drawings each for all ten characters (70 total), replacing six unique drawings duplicated into seven cells. Runtime dimensions remain640x448x7; eight-tick movement and decoded texture memory stay unchanged. All ten use lossless WebP RGB and alpha under original entry caps (Ryu18MB,Ken19MB,Chun-Li20MB,Ibuki17MB,Alex18MB,Dudley13MB,Makoto15MB,Yun17MB,Urien14MB,Gill17MB).

| Character | Accepted source | Exact prompt | Maximum silhouette-centroid step reduction |
|---|---|---|---|
| Ryu | [v2](ryu/generated-sheet-v2.png) | [prompt](ryu/prompt-v2.txt) |41.31%|
| Ken | [v3 primary](ken/generated-sheet-v3.png) | [prompt](ken/prompt-v3.txt) |18.71%|
| Ibuki | [v1](ibuki/generated-sheet-v1.png) | [prompt](ibuki/prompt-v1.txt) |23.24%|
| Alex | [v1](alex/generated-sheet-v1.png) | [prompt](alex/prompt-v1.txt) |9.31%|
| Dudley | [v1](dudley/generated-sheet-v1.png) | [prompt](dudley/prompt-v1.txt) |0.60%|
| Makoto | [v3](makoto/generated-sheet-v3.png) | [prompt](makoto/prompt-v3.txt) |37.64%|
| Yun | [v1](yun/generated-sheet-v1.png) | [prompt](yun/prompt-v1.txt) |18.28%|
| Urien | [v2](urien/generated-sheet-v2.png) | [prompt](urien/prompt-v2.txt) |35.15%|
| Gill | [v1](gill/generated-sheet-v1.png) | [prompt](gill/prompt-v1.txt) |20.50%|
| Ken final recovery | [v2 cell8](ken/generated-sheet-v2.png) | [prompt](ken/prompt-v2.txt) |included above|
| Chun-Li | [v2](chunli/generated-sheet-v2.png) | [prompt](chunli/prompt-v2.txt) |59.82%|

These are silhouette metrics, not measured player-perceived smoothness. Seven original poses eliminate the repeated drive drawing; actual backward double taps and both facings are verified.

Source grid [columns,rows]=[4,2]; cell1 is a neutral anatomical reference, cells2..8 are runtime. Ken uses generated v3 except final raw index7/runtime frame7 from v2 cell8; neutral heights436/436 produce uniform factor1. The final v3 cell drifted toward idle, so the earlier generated recovery is retained. Both source hashes/reference/factor/target index are recorded. No drawn joints, colors, or shapes are edited by extraction. Original generated files are retained at their default location and copied here. Every generation prompt and rejected candidate remains for provenance.

Each folder preserves previous-dash-back.webp and previous-manifest.json, plus candidate-dash-back.png and qa.json. Importer uses uniform anatomical scale, single neutral-foot horizontal offset and ground alignment. Original pose/dash-back semantics and idle handoffs, entry caps, seven unique drawings, no clipping, and a strictly lower maximum centroid step are required.

Commands (project dependencies, external POSE_ECC_CACHE_PATH):
- python scripts/build-backdash-motion-v2.py: candidate QA.
- --install: atomic write only after all selected characters pass.
- --runtime: recompute gates and reconstruct installed bytes from source/override exactly.
- python scripts/verify-backdash-source-order.py: eight-cell order and missing/clipping negatives.
- node scripts/verify-character-backdash-motion-v2.mjs: metadata/hashes/preservation/caps.
- node scripts/verify-dash-frame-coverage.mjs: real double tap in two modes/facings/directions, hitstop and interruption coverage.

Local evidence: ../outputs/backdash-motion-v2-local-verification.json and backdash-motion-v2-both-facings.png. All ten backward-dash strips now have seven distinct drawings. Dudley’s main gain is removing a duplicate drawing; its0.60% centroid-step change is small.

Second-batch evidence: ../outputs/backdash-second-v2-local-verification.json and backdash-second-v2-both-facings.png. The previous three source/runtime/QA files remain unchanged; all forward-dash art stays byte-identical. The forward verifier allows only seven independently hash/QA-verified backward v2 records past its historical peer pin; all unrelated peer pins remain. No commit, push or deployment.

Final roster evidence: ../outputs/backdash-roster-v2-local-verification.json, backdash-roster-v2-group-0.png and backdash-roster-v2-group-1.png. Final four add28originals; prior six backward v2 source/runtime/QA files and all forward art remain byte-identical. Makoto v2 passed but had a rapid low-to-upright recovery; v3 draws a real halfway braking pose, lowering max centroid step from50.416688 to32.573986 (legacy52.234028). All20forward/backward strips contain7distinct frames each (140 total frame cells; this does not mean all140were newly made). No per-pose warp, joint edits or weaker QA.
