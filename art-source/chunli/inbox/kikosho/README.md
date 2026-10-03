# Chun-Li Kikosho / SA1 (12 frames)

Only CHUNLI_SA1 maps to the separate kikosho asset and registry kind. The normal/EX Kikoken, Houyokusen, rising/spinning kicks and SA3 remain distinct. Combat data, meter cost and existing projectile effects are unchanged.

The installer reuses the existing planted two-palm charge/release/recovery hadoken gate profile. No second set of motion algorithms is required. The separate asset identity permits stronger two-hand casting poses without replacing normal Kikoken. Horizontal pixel thresholds scale by 640/384 for the wider canvas; vertical, overlap, deformation, area and handoff limits stay unchanged. Actual renderer output retains half source pixel scale.

Initial source release poses failed hand-extension and release-past-gather gates. They were redrawn as stronger forward two-palm lunges before promotion. Source sheets came from the built-in imagegen tool, with an additional transparent cutout edit. Whole-sheet alpha components retain complete limbs; neutral endpoints use the complete second-sheet guard, excluding the first sheet's edge-framed guard. Sources select initial poses [8,3,2,4,4] for startup, redrawn lunge poses [1,2] for active and [3] for withdrawal, followed by initial poses [3,8,8,8]. Neutral/charge holds are deliberate. Startup 0-4, contact 5-6 and recovery 7-11 follow existing combat phase timing.

Pose, semantic, master handoff, runtime checksum and install-failure rollback checks passed. A SA1 mapping regression failed before implementation and passed afterward. TypeScript, production build, combat, existing Chun-Li action checks, registry/assets and Canvas sizing passed. Nine attacks in both facings passed actual browser image loading/render/phase/scale checks with no warnings/errors. SA1 reaches 10/12 stored art frames because its unchanged three-tick startup skips two preparation poses; all reachable frames and phase endpoints are covered. This is browser rendering verification, not manual command entry or every combat interaction. Clean production builds remove the temporary developer fixture.

```sh
python3 scripts/install-authored-chunli-walk.py kikosho --install
python3 scripts/install-authored-chunli-walk.py kikosho --runtime
node scripts/verify-chunli-kikosho.mjs
npm run prepare:chunli-browser-check
```
