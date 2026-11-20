# Ibuki crouch guard v1

Six authored low-guard poses generated with the built-in imagegen tool from the preserved Ibuki idle reference. Exact prompt: generation-prompt.txt. Original generation: generated-sheet-v1.png.

The standalone Pillow packer scripts/pack-ibuki-crouch-guard-v1.py performs only silhouette crops, shared uniform scaling, foot alignment and lossless packing. It imports no project pose-analysis modules and does not write the root pose cache. Source and runtime hashes are recorded in manifest.json.

Runtime: public/art/animation-hq/ibuki/crouch-guard-v1.webp, six 384×448 cells, 500742 bytes. Grounded Ibuki low blocks in HD select this supplement through the existing generic crouch-guard renderer; no renderer or gameplay code changed. Standing guard, parry, Lite, other characters and missing-texture fallback retain prior routes. Existing Ken, Ryu and Chun-Li assets remain byte-identical. Legacy Ibuki stage-entry art is16950756bytes; supplement raises actual total to17451498bytes, explicitly bounded by17.5MB. New-strip payload is separately bounded below550KB.

Validation: scripts/verify-ibuki-crouch-guard-v1.mjs checks source/runtime hashes, frame selection, stance weights, a single shadow, caller opacity, no fighter mutation, resource preparation/release and failed-load retry. Hidden native Chrome compares72newframes and1272existingcontrols,24actualguardticks,6hitstop ticks,26672opaqueoverlap pixels,loadedLite and404/retry. Independent DPR2 reference compares81252solid pixels; maximum premultiplied color/alpha difference is1.9922/255 and no channel exceeds3/255. All327JS/build checks pass on this batch's final source.

Actual game flow verifies Ibuki selection, three accepted specials, pause and retry after natural defeat. Initial private QA assumed every character has1000HP; corrected predicate observes Fighter.maxHp and verifies Ibuki's actual920HP, preserving balance and production code. The failed diagnostic is retained with a resolution note and link to the passing report.

Reports and screenshots are in sibling outputs/ibuki-crouch-guard-* files; actual game evidence is outputs/live-game-flow-v436-ibuki-verification.json. Full campaign completion and human playthrough remain unverified. No commit, push or deployment.
