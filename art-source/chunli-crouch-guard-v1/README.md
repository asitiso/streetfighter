# Chun-Li crouch guard v1

Six authored low-guard poses generated with the built-in imagegen tool from the preserved Chun-Li idle reference. Exact prompt: generation-prompt.txt. Original generation: generated-sheet-v1.png.

The standalone Pillow packer scripts/pack-chunli-crouch-guard-v1.py performs only silhouette crops, shared uniform scaling, boot-sole alignment and lossless packing. It imports no project pose-analysis modules and does not write the root pose cache. Source and runtime hashes are recorded in manifest.json.

Runtime: public/art/animation-hq/chunli/crouch-guard-v1.webp, six 384×448 cells, 480974 bytes. Grounded Chun-Li low blocks in HD select the supplement through the existing generic crouch-guard renderer; no renderer or gameplay code changed in this batch. Standing guard, parry, other characters, Lite and missing-texture fallback retain prior routes. Ken and Ryu assets remain byte-identical. Legacy Chun-Li stage-entry art is 19494634 bytes; with this supplement it is 19975608 bytes, still below the existing20MB cap.

Validation: scripts/verify-chunli-crouch-guard-v1.mjs checks source/runtime hashes, frame selection, stance weights, a single shadow, caller opacity, no combat mutation, resource preparation/release and failed-load retry. Hidden native Chrome compares72newframes and1272existingcontrols,24actualguardticks,6hitstop ticks,32228opaqueoverlap pixels,loadedLite and404/retry. Independent DPR2 reference compares86484solid pixels; maximum premultiplied channel/alpha difference is1.9608/255 and no channel exceeds3/255. All326JS/build checks pass on this batch's final source. Full actual game flow accepts Chun-Li's three special moves, freezes on pause and retries after natural defeat.

Reports and screenshots are in sibling outputs/chunli-crouch-guard-* files, with actual game evidence in outputs/live-game-flow-v435-chunli-verification.json. Full campaign completion and human playthrough remain unverified. No commit, push or deployment.
