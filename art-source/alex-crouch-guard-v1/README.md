# Alex crouch guard v1

Six authored low-guard poses generated with the built-in imagegen tool from the preserved Alex idle reference. Exact prompt: generation-prompt.txt. Original generation: generated-sheet-v1.png. The realistic textured rendering, wrestler proportions and costume follow the existing reference.

The standalone Pillow packer scripts/pack-alex-crouch-guard-v1.py performs only silhouette crops, shared uniform scaling, boot-sole alignment and lossless packing. It imports no project pose-analysis modules and does not write the root pose cache. Source/runtime hashes are recorded in manifest.json.

Runtime: public/art/animation-hq/alex/crouch-guard-v1.webp, six 384×448 cells,531386bytes. Grounded Alex low blocks in HD select the supplement through the existing generic crouch-guard renderer; no renderer or gameplay source changed. Standing guard, parry, Lite, other characters and missing-texture fallback retain prior routes. Previous Ken/Ryu/Chun-Li/Ibuki assets remain byte-identical. Legacy Alex stage-entry art17989750bytes plus supplement531386 totals18521136bytes, bounded below19MB. The new strip is separately bounded below600KB.

Validation: scripts/verify-alex-crouch-guard-v1.mjs checks source/runtime hashes, payload budgets, frame selection, stance weights, one shadow, caller opacity, no fighter mutation, preparation/release and failed-load retry. Hidden native Chrome compares72newframes and1272existingcontrols,24actualguardticks,6hitstop ticks,67818opaqueoverlap pixels,loadedLite and404/retry. Independent DPR2 reference compares161538solid pixels; maximum premultiplied color/alpha difference is1.9765/255 and no channel exceeds3/255. All328JS/build checks pass on this batch's final source.

Actual game evidence verifies Alex selection, three accepted specials, pause and retry after natural defeat restoring Alex maxHp1120. No combat state mutation or balance changes.

Reports and screenshots are in sibling outputs/alex-crouch-guard-* files and outputs/live-game-flow-v437-alex-verification.json. Full campaign completion and human playthrough remain unverified. No commit, push or deployment.
