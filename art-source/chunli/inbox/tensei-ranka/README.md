# Chun-Li Tensei Ranka / SA3 (12 frames)

Only CHUNLI_SA3 uses the separate tensei-ranka strip. Other specials, Super Arts and air normals remain distinct. Combat timing, meter, damage and launch data are unchanged. Its own ground-initiated launch retains the authored mapping during flight, and Canvas rendering follows actual jumpHeight, like the existing anti-air special.

The installer reuses the existing shoryuken pose/semantic/master-handoff gates through the quality_kinds alias table. Kikosho retains its hadoken alias. No thresholds changed. Seven new poses from two built-in imagegen sheets provide compression, knee drive, vertical extension, airborne leg switch, rising extension, apex finisher and descent withdrawal. Whole-sheet alpha components preserve complete bodies. Initial generated neutral brace failed foot continuity; endpoints were replaced with the existing rising guard instead of relaxing limits. Sources are [existing guard,1,2,3,3,4,5,6,7,existing guard,existing guard,existing guard]. Duplicate extension and guard hold frames are deliberate. All cells are 384x448 with unchanged half-source render scale.

Startup art 0-3, active 4-7, recovery 8-11 follows the existing move phases. Actual gameplay flight/landing is followed by Fighter.updatePlayer regression; the sprite stays present through attack flight. Other air attacks remain excluded. A renderer test verifies both facings and the exact gameplay height translation.

Fresh TypeScript, production build, combat, Super Art distinctness, existing Chun-Li action checks, registry/assets, renderer sizing/height, runtime pose/semantic/handoff/checksum and isolated install-failure rollback checks passed. SA3 mapping regression failed before implementation and passed afterward. Read-only review found no actionable issues. Ten attacks in both facings (20 combinations) passed actual browser asset/render/phase/scale checks without warnings/errors. SA3 reaches 10/12 stored poses because unchanged two-tick startup skips two preparation poses; reachable phases and endpoints are covered. Screenshot inspected. This does not claim manual command entry or every combat interaction. Clean production builds remove the developer fixture.

```sh
python3 scripts/install-authored-chunli-walk.py tensei-ranka --install
python3 scripts/install-authored-chunli-walk.py tensei-ranka --runtime
node scripts/verify-chunli-tensei-ranka.mjs
npm run prepare:chunli-browser-check
```
