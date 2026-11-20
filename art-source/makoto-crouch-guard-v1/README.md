# Makoto crouch guard v1

Six low karate-guard poses authored with built-in imagegen from reference-idle.png. Exact instructions: generation-prompt.txt; original: generated-sheet-v1.png. Standalone scripts/pack-makoto-crouch-guard-v1.py performs only technical crops, shared uniform scale, planted-foot alignment and lossless horizontal packing. Manifest hashes source, reference, prompt and runtime.

Runtime public/art/animation-hq/makoto/crouch-guard-v1.webp contains six384×448cells and496926bytes. Grounded HD low blocks reuse the unchanged generic crouch-guard renderer. Legacy14994844bytes plus supplement total15491770, below16MB; new strip bounded below550KB. All previous assets/gameplay code remain intact.

Focused108checks and full330JS/build checks pass. Native72newframes/1272oldcontrols/actualguard+hitstop/loadedLite/404retry/DPR288888pixels max premultiplied channel difference1.9922 pass with0exceptions. Actual game accepts3specials, pauses and retries after natural defeat to maxHp1020. Read-only review found no actionable issue.

Evidence: sibling outputs/makoto-crouch-guard-* and outputs/live-game-flow-v439-makoto-verification.json. Local-only work; no commit/push/deploy. Full campaign/human playthrough and legacy Python asset-builder suite were not run.
