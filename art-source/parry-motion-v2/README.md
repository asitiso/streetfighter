# Parry motion v2 — complete ten-character roster

Ten characters × six individually drawn chronological poses =60original drawings. Final local completion adds42drawings for seven remaining characters; prior Ryu/Dudley/Gill WebP, manifests and QA remain byte-identical. Built-in imagegen created/redrew all art; exact prompts and original PNG copies are preserved here. Rejected source variants are retained for provenance and never installed.

| Character | Accepted source | Exact prompt | Old unique runtime drawings | Maximum centroid-step reduction | Runtime RGB |
|---|---|---|---|---|---|
| ryu | [v2](ryu/generated-sheet-v2.png) | [prompt](ryu/prompt-v2.txt) | 4 → 6 | 58.78% | lossless |
| dudley | [v2](dudley/generated-sheet-v2.png) | [prompt](dudley/prompt-v2.txt) | 4 → 6 | 10.88% | lossless |
| gill | [v1](gill/generated-sheet-v1.png) | [prompt](gill/prompt-v1.txt) | 4 → 6 | 59.59% | lossy q100 |
| ken | [v1](ken/generated-sheet-v1.png) | [prompt](ken/prompt-v1.txt) | 5 → 6 | 32.4% | lossless |
| chunli | [v1](chunli/generated-sheet-v1.png) | [prompt](chunli/prompt-v1.txt) | 4 → 6 | 28.68% | lossless |
| ibuki | [v2](ibuki/generated-sheet-v2.png) | [prompt](ibuki/prompt-v2.txt) | 4 → 6 | 1.65% | lossless |
| alex | [v1](alex/generated-sheet-v1.png) | [prompt](alex/prompt-v1.txt) | 4 → 6 | 13.1% | lossy q100 |
| makoto | [v5](makoto/generated-sheet-v5.png) | [prompt](makoto/prompt-v5.txt) | 4 → 6 | 20.03% | lossy q100 |
| yun | [v1](yun/generated-sheet-v1.png) | [prompt](yun/prompt-v1.txt) | 4 → 6 | 32.54% | lossless |
| urien | [v2](urien/generated-sheet-v2.png) | [prompt](urien/prompt-v2.txt) | 4 → 6 | 40.47% | lossy q100 |

Old runtime unique counts describe actual pixel content (Ken5, other9each4); new6drawings come directly from6source cells. Maximum centroid-step reduction is a silhouette metric, not a player study; Ibuki's metric gain is modest but it now has two additional independently drawn in-betweens.

Each directory includes previous-parry.webp, previous-manifest.json, candidate-parry.png and qa.json. Accepted sourceGrid=[columns,rows]=[3,2], row-major sourceOrder1..6. Technical importer extracts complete connected bodies, applies a shared uniform idle-recovery scale and per-frame foot anchoring. No joint warps or creative raster changes outside imagegen. Existing pose/semantic/idle-handoff thresholds and character download caps unchanged. All alpha lossless. RGB may use quality100 within existing entry caps; actual PSNR recorded in QA (minimum35dB).

Runtime stays six384×448cells, zero decoded-memory delta; normal parry8ticks, red10ticks, hitstop and input rules unchanged. Local cache advances to game-cache-v340 for new asset bytes.

Validation commands:
- python scripts/build-parry-motion-v2.py (read-only source QA), --install (atomic after all selected candidates pass), --runtime (installed hash and gates).
- python scripts/verify-parry-source-order.py checks row-major order with different pose heights and rejects missing/clipped poses.
- node scripts/verify-character-parry-motion-v2.mjs checks all10source/runtime hashes, only-parry manifest differences, memory/caps and40normal/red/facing runtime scenarios with360draws80hitstop checks40next-attacks.
- public/character-parry-qa.html?group=0..3 renders120frame/facing cells using production drawCombatFighter.

Use an external POSE_ECC_CACHE_PATH and existing project Python dependency environment when running Python checks; preserve root RC39_POSE_ECC_CACHE.json.

Local evidence: ../outputs/roster-parry-motion-v2-local-verification.json, roster-parry-motion-v2-group-{0,1,2,3}.png and roster-parry-motion-v2-validation/summary.json. No commit, push or deploy. Remaining work concerns other motion families/gameplay polish; this parry roster is complete.
