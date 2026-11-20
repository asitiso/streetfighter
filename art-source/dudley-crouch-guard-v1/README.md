# Dudley crouch guard v1

Six authored low boxing-guard poses generated and edited with the built-in imagegen tool from the preserved Dudley idle reference. Exact initial prompt: generation-prompt.txt. Exact targeted edit: identity-edit-prompt.txt. Both generated-sheet-v1.png and selected generated-sheet-v2.png are preserved. The selected sheet restores smooth side-part hair and removes an unwanted watch-chain accessory while retaining the six poses and reference costume.

The standalone Pillow packer scripts/pack-dudley-crouch-guard-v1.py selects v2 and performs only silhouette crops, shared uniform scaling, shoe-sole alignment and lossless packing. It imports no project pose-analysis modules and does not write the root pose cache. manifest.json hashes both generations, both prompts, the identity reference and runtime strip, and records selectedSource/tool.

Runtime: public/art/animation-hq/dudley/crouch-guard-v1.webp, six 384×448 cells,355604bytes. Grounded Dudley low blocks in HD select the supplement through the unchanged generic crouch-guard renderer. Standing guard, parry, Lite, other characters and failed-texture fallback retain prior routes. All previous low-guard assets remain byte-identical. Legacy Dudley stage-entry art12975778bytes plus supplement355604 totals13331382bytes, bounded below14MB. The new strip is separately bounded below450KB.

Validation: scripts/verify-dudley-crouch-guard-v1.mjs checks source/runtime hashes, selected-source provenance, payload budgets, frame selection, stance weights, one shadow, caller opacity, no fighter mutation, preparation/release and failed-load retry. Hidden native Chrome compares72newframes and1272existingcontrols,24actualguardticks,6hitstop ticks,39374opaqueoverlap pixels,loadedLite and404/retry. Independent DPR2 reference compares94728solid pixels; maximum premultiplied color/alpha difference is1.4942/255 with no channel above3/255. All329JS/build checks pass on this batch's final source.

Actual game verifies Dudley selection, three accepted specials, pause and retry after natural defeat restoring maxHp1000; no combat state mutation or balance changes.

Reports/screenshots are in sibling outputs/dudley-crouch-guard-* and outputs/live-game-flow-v438-dudley-verification.json. Full campaign completion and human playthrough remain unverified. No commit, push or deployment.
