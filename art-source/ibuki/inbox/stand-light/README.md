# Ibuki grounded light punch (7F)

Built-in imagegen generated four full-body jab poses using the authored character reference. Sequence A-B-C-D-C-B-A deliberately reuses recovery poses. Only grounded 5LP maps to this strip; other normals, specials and airborne attacks stay excluded. Active frame index3 follows unchanged combat timing. Ibuki now has64 enabled frames across8 records.

Initial contact reach12px failed the unchanged24px minimum. An overextended-arm candidate was rejected for anatomy and foot travel. The final natural jab still exposed bbox centering shifting the feet as the fist widened the silhouette. Ibuki stand-light now aligns each normalized foot center to guard before applying the original character root offset. This preserves planted stance without changing quality thresholds or drawing stretched limbs. All pose/semantic/master handoff gates pass; candidate/runtime hashes match.

The mapping test failed before promotion and passes afterward. Real updatePlayer LP input reaches all7 frames, contact and idle return in both facings. Other normals/crouch/air exclusions, Chun-Li jab, hit-clock, combat, registry/assets and build checks pass. Isolated first-install failure removes the new attack runtime and restores registry/manifest; successful install totals64F. Both browser facings render7/7 with actual moveFrame/currentMove and correct scale, no warnings/errors. Read-only review found no actionable issues. No manual stage playthrough claimed. Cachev090 preloads the new strip; clean production builds remove the developer fixture.

Generation brief: adult beige masked ninja, four transparent full-body poses with identical planted stance: guard, anticipation, halfway jab, full straight jab to right; consistent scale, intact hair/fingers/toes, no effects/background. Final contact edit uses modest shoulder turn and natural arm proportions, fist slightly beyond front toe. Source PNGs, candidate/runtime, preview and QA retained.

Run `python3 scripts/install-authored-chunli-walk.py stand-light --character IBUKI --runtime` and `node scripts/verify-ibuki-light-attack.mjs` after building.
