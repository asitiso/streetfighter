# Forward dash motion v2 — seven characters

Built-in imagegen produced seven distinct runtime drawings each for Ibuki, Alex, Dudley, Makoto, Yun, Urien and Gill (49 total). This replaces repeated drawings without changing the existing seven-cell strip size, eight-tick movement or decoded texture memory. All alpha packing is lossless. Alex/Dudley/Makoto/Yun/Urien/Gill RGB is lossless; Ibuki uses quality100 WebP RGB to stay below its original17MB entry cap (visible RGB PSNR recorded in QA).

| Character | Accepted source | Exact prompt | Maximum centroid-step reduction |
|---|---|---|---|
| Ibuki | [v1](ibuki/generated-sheet-v1.png) | [prompt](ibuki/prompt-v1.txt) | 51.83% |
| Alex | [v2](alex/generated-sheet-v2.png) | [prompt](alex/prompt-v2.txt) | 22.30% |
| Dudley | [v6 primary](dudley/generated-sheet-v6.png) | [prompt](dudley/prompt-v6.txt) | 16.87% |
| Makoto | [v3](makoto/generated-sheet-v3.png) | [prompt](makoto/prompt-v3.txt) | 18.64% |
| Yun | [v4](yun/generated-sheet-v4.png) | [prompt](yun/prompt-v4.txt) | 1.49% |
| Urien | [v1](urien/generated-sheet-v1.png) | [prompt](urien/prompt-v1.txt) | 11.81% |
| Gill | [v1](gill/generated-sheet-v1.png) | [prompt](gill/prompt-v1.txt) | 57.89% |
| Dudley preparation override | [v4 cell3](dudley/generated-sheet-v4.png) | [prompt](dudley/prompt-v4.txt) | included above |

These reductions measure silhouette-centroid step, not a player study. Other generated variants remain for provenance, not runtime use. Original generated-image files are preserved at their default location; this folder contains project copies.

Source grid is [columns, rows] = [4,2]. Cell1 is neutral anatomical reference; cells2..8 are launch, acceleration, two genuinely different drive poses, braking and settling. Dudley keeps the v6 sequence with only source cell3 replaced by the already-generated v4 preparation. Uniform neutral-height calibration is 398/405; no drawn joint, color or shape is edited during extraction. This selection avoids unintended redraws of unrelated cells. Both source hashes and the override target/source pose/reference/factor are recorded and checked.

Every directory retains previous-dash.webp, previous-manifest.json, candidate-dash.png and qa.json. Runtime files are public/art/animation-hq/<character>/dash.webp. The importer uses uniform anatomical scaling from neutral reference, a single reference-foot horizontal offset and per-frame ground alignment. It refuses clipping, per-pose fit shrinkage, duplicates, unchanged or worse maximum centroid steps, broken idle handoffs, original pose/dash semantic failures, and existing character download-cap breaches. Existing gates are unchanged.

Commands (use the existing project Python dependencies and an external POSE_ECC_CACHE_PATH):
- python scripts/build-dash-motion-v2.py: source QA only.
- --install: write selected characters only after all pass.
- --runtime: check installed hashes/gates and reconstruct exact runtime bytes from accepted sources plus override.
- python scripts/verify-dash-source-order.py: eight-cell reading order, missing/clipped rejection.
- node scripts/verify-character-dash-motion-v2.mjs: metadata, source/override hashes, original peers and memory/cap checks.
- node scripts/verify-dash-frame-coverage.mjs: actual double tap, all seven frames in both modes/facings/directions, hitstop and interruptions.

The prior parry verifier now pins its own source/runtime QA instead of freezing other historical manifest records. New dash verification and the batch baseline prove every non-dash record unchanged.

Local evidence: ../outputs/dash-motion-v2-local-verification.json and dash-motion-v2-both-facings.png. No commit, push or deployment. All ten characters now have seven distinct forward-dash drawings; Ryu/Ken/ChunLi already had seven. Yun’s main benefit is removing a duplicate, not its small centroid-step reduction. Remaining original-art work: ten duplicated backward-dash strips.

Latest local evidence: ../outputs/roster-forward-dash-v2-local-verification.json, roster-forward-dash-v2-group-0.png and roster-forward-dash-v2-group-1.png. The additional four characters contribute 28 new drawings; first three v2 source/runtime/QA files remain byte-identical.
