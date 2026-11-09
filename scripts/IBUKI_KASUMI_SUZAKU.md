# Kasumi Suzaku authored throw reuse

IBUKI_SUPER and IBUKI_SA1 reuse the verified IBUKI_KUNAI_HQ throwing strip under their own combat phase clocks. This adds moving presentation without new source art, runtime strips, quality aliases or manifest records. Existing110 authored frames/12 records remain unchanged. SA2/SA3 and arbitrary airborne attacks stay excluded. Cachev095 refreshes the mapping change; no combat data or projectile effects changed.

Regression failed before mapping, then passed both variants/facings, every phase boundary, actual Fighter move progression and idle return. Existing two-tick startup reaches [0,4,5,6,7,8,9,10,11],9/12 stored poses; release/recovery endpoints remain visible. Real CombatWorld updates verify the existing4-projectile generic burst and5-projectile SA1 burst in both directions, with authored contact at projectile emission. Other specials, Super Art24, Canvas scale, registry/assets, combat and build/offline checks pass.

Browser generic/SA1 in both facings passes all reachable poses and actual image/render/scale checks without failures or console warnings/errors. Screenshot inspected. This does not claim manual command input or every combat interaction. Read-only review found no actionable issues. Clean production builds remove the temporary fixture.

Run `node scripts/verify-ibuki-kasumi-suzaku.mjs` after building.
