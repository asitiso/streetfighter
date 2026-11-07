# Ibuki grounded heavy punch (10F)

Built-in imagegen supplied four complete heavy-punch poses from the authored character reference: anticipation, shoulder drive, contact and withdrawal. Order [jab guard,1,1,2,3,3,4,4,jab guard,jab guard] deliberately holds preparation/contact/recovery. Only grounded5HP maps to this strip. Startup0..3, active4..5 and recovery6..9 follow unchanged combat timing. Other normals, specials, crouch and air attacks retain distinct visuals.

Shared Ibuki planted-foot normalization now covers both standing punches, followed by original-root alignment. No quality limits changed. Pose/semantic/master-handoff gates pass and candidate/runtime hashes match. Ibuki totals74 enabled frames across9 records; cachev091 preloads the new strip.

Regression failed before promotion, then passed both facing directions and every phase boundary. Real HP input reaches all10 frames, contact and idle return. Existing jab, Chun-Li heavy, hit clock, combat, build and asset checks pass. Isolated ingestion tests first-install write-failure removal/registry-manifest rollback for both standing attacks, then successful totals64/74. Browser bothfacings passes10/10 with correct source/output scale and no render failures or console warnings/errors. Read-only review found no actionable issues. No manual stage playthrough claimed. Clean production builds remove the developer fixture.

Generation brief: four transparent full-body adult beige masked ninja heavy straight-punch poses, facing right: rear-fist windup, shoulder rotation, full natural punch slightly beyond front toe, elbow withdrawal. Identical planted stance/scale, full hair/fingers/toes and generous margins; no effects, shadow, text or opponent. Source PNGs, candidate/runtime, preview and QA retained.
