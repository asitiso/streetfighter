# Forward walk motion v2 — all ten characters

Built-in imagegen produced120 new runtime drawings,12 per character: Ibuki/Makoto24, Ryu/Ken/Dudley36, Chun-Li/Alex/Yun36 and Urien/Gill24. Original unique-pose counts are recorded below. Runtime strips remain384×448×12, with existing FPS, frame weights, movement physics, decoded texture memory and character download caps unchanged (Ibuki17MB, Makoto15MB, Ryu18MB, Ken19MB, Dudley13MB, Chun-Li20MB, Alex18MB, Yun17MB, Urien14MB, Gill17MB).

| Character | Accepted source | Exact prompt | Unique poses | Maximum adjacent centroid step | RGB packing |
|---|---|---|---|---|---|
| Ibuki | [v1](ibuki/generated-sheet-v1.png) | [prompt](ibuki/prompt-v1.txt) | 8→12 | 30.952817→15.502989 (49.91%) | quality100,38.717dB |
| Makoto | [v1](makoto/generated-sheet-v1.png) | [prompt](makoto/prompt-v1.txt) | 8→12 | 30.675508→27.660786 (9.83%) | lossless |
| Ryu | [v1](ryu/generated-sheet-v1.png) | [prompt](ryu/prompt-v1.txt) | 12→12 | 36.570077→15.127763 (58.63%) | quality100,38.826dB |
| Ken | [v2](ken/generated-sheet-v2.png) | [prompt](ken/prompt-v2.txt) | 11→12 | 20.061824→17.767934 (11.43%) | lossless |
| Dudley | [v1](dudley/generated-sheet-v1.png) | [prompt](dudley/prompt-v1.txt) | 8→12 | 17.097637→12.816631 (25.04%) | lossless |
| Chun-Li | [v2](chunli/generated-sheet-v2.png) | [prompt](chunli/prompt-v2.txt) | 12→12 | 22.204073→12.056181 (45.70%) | lossless |
| Alex | [v2](alex/generated-sheet-v2.png) | [prompt](alex/prompt-v2.txt) | 8→12 | 16.524694→11.855569 (28.26%) | lossless |
| Yun | [v1](yun/generated-sheet-v1.png) | [prompt](yun/prompt-v1.txt) | 8→12 | 15.628902→11.922097 (23.72%) | lossless |
| Urien | [v3](urien/generated-sheet-v3.png) | [prompt](urien/prompt-v3.txt) | 8→12 | 8.995710→8.569032 (4.74%) | lossless |
| Gill | [v1](gill/generated-sheet-v1.png) | [prompt](gill/prompt-v1.txt) | 8→12 | 14.768774→11.261741 (23.75%) | quality100,39.052dB |

All alpha streams are exact. Ibuki, Ryu and Gill RGB use lossy WebP at quality100 to remain inside the existing cap; original PNGs are retained. Visible RGB PSNR must be at least35dB. Makoto/Ken/Dudley/Chun-Li/Alex/Yun/Urien RGB is lossless. Centroid changes measure silhouettes, not player-perceived smoothness; Makoto's measured reduction is modest, alongside the concrete8→12 pose increase. The initial all-roster audit used a different standalone alpha threshold; acceptance and reported reductions use the original walking semantic gate and its matching baseline.

All ten accepted source PNGs are1254×1254, with16 complete bodies in a4×4 grid. Cell1 neutral guard calibrates body scale; cells2..13 are the12 runtime poses; cells14..16 are unused anatomy references. Extract whole connected bodies in reading order, preserve original alpha, use a single neutral-height scale and a single neutral-foot horizontal offset, align feet to the installed idle ground. No creative joint/shape warps, per-pose fit shrinking or painted technical frames. References were each installed idle.webp and previous walk.webp; generated defaults remain in the original imagegen directory and project copies live here.

Each character folder retains previous-walk.webp, previous-manifest.json, generated source/prompt, candidate-walk.png and qa.json. Installation is atomic after all selected candidates pass. Import demands12 unique drawings,16 complete unclipped source bodies, strict improvement of adjacent AND cyclic centroid-step maxima, unchanged original walking pose/semantic/idle+backward handoff gates, existing download caps, exact alpha and exact accepted source-to-runtime reconstruction.

Commands use project Python dependencies and an external POSE_ECC_CACHE_PATH:

- python scripts/build-walk-forward-motion-v2.py — source QA; --install installs; --runtime recomputes gates and exact packed bytes.
- python scripts/verify-walk-forward-source-order.py —16-cell row order plus missing/clipped negative cases.
- node scripts/verify-character-walk-forward-motion-v2.mjs — provenance, caps, memory, all12 drawn frames from actual forward input in both modes/facings; hitstop, loop, reverse, idle and attack controls.

The shared verify-walk-forward-peer.mjs permits only Ibuki/Makoto/Ryu/Ken/Dudley/Chun-Li/Alex/Yun/Urien/Gill's independently hash/QA-verified forward records to differ in historical dash/backdash/backward-walk snapshots. All unrelated records remain pinned. The forward verifier separately pins every other record against the immediate pre-change manifest. All10 backward strips and provenance remain byte-identical.

First evidence: ../outputs/walk-forward-first-v2-local-verification.json. Second evidence: ../outputs/walk-forward-second-v2-local-verification.json. Third evidence: ../outputs/walk-forward-third-v2-local-verification.json. Latest: ../outputs/walk-forward-fourth-v2-local-verification.json and walk-forward-fourth-v2-{urien,gill}.png (24cells each). Local only; no commit, push or deployment. All ten forward-walk replacement targets are complete. Other motions require separate assessment.

Ryu had no previous semantic metadata: its36.570077 baseline is computed from checksum-verified previous installed pixels through the same original semantic evaluator. Its unique count stays12; these are replacement originals with smoother measured centroid steps. Dudley loop-inclusive maximum28.185088→12.816631 improves54.53%, differing from adjacent25.04%. Ken v1 is retained rejected: high knee/crouch poses caused a21.493px jump, worse than20.061824; generated v2 redraws cells5/6 with a low grounded passing step. Other source poses also changed during generation, so every gate was rerun.

Runtime reconstruction uses the accepted manifest encoding explicitly. A smaller forward strip freed download headroom and exposed a bug where greedy repacking switched an unchanged backward strip from accepted quality100 RGB to lossless, breaking byte reconstruction. Both forward/backward importers now retain accepted RGB mode/quality during --runtime, while source QA/installation still selects packing under the original cap. Alpha exactness, RGB PSNR>=35dB, quality95..100 and entry caps remain enforced; an accepted stream that no longer fits is rejected. No existing backward files were rewritten.

- python scripts/verify-motion-packing-stability.py — both importers preserve accepted bytes when headroom changes; lossless remains exact, invalid caps/quality/alpha settings are rejected. Included in npm verify; also executed directly with the project Python dependencies.

Chun-Li v1 is retained rejected: high passing knees in cells6/7/10 produced a maximum step about22.376px, above the previous22.204073. Generated v2 redraws those low passing poses. Alex v1 is retained rejected: foot travel149.507244 exceeded145, and backward-to-forward foot delta81.642252 exceeded58. Generated v2 moderates stance widths and redraws sourcecell2 with the rear boot planted, matching the installed backward closing phase. Other poses also changed during generation, so all original gates were recomputed. Yun v1 passed directly. All three latest RGB/alpha streams are lossless.

Alex adjacent reduction28.26% differs from cyclic17.050151→11.855569 (30.47%). Yun adjacent23.72% differs from cyclic15.681355→11.922097 (23.97%). Chun-Li remains12unique replacement originals; its gain is smoother measured transitions. No player-perception study is implied.

Urien v1/v2 are retained rejected sources: the abrupt narrowing from sourcecell5 to6 produced an11.236286px step, above the previous8.995710; the v2 heel extension moved that change to sourcecell7 at15.175px. Accepted v3 redraws cell6 with a smaller quarter-foot-length earlier heel-lift. Other figures also changed during generation, so all original gates were recomputed. Gill v1 passed directly. Both increase8→12 distinct poses.

Urien adjacent reduction4.74% is modest; cyclic maximum12.000895→8.569032 improves28.60%. Do not conflate the two or claim a measured player-perception gain. Urien RGB/alpha are lossless; Gill RGB uses quality100 lossy WebP with visible PSNR39.052dB and exact alpha. All ten backward strips and earlier eight forward sources/runtime/QA remain byte-identical in this final batch.
