# Ibuki authored retreat (10 frames)

Backward movement now uses its own authored walk-back strip. Idle 6F + forward walk 12F + retreat 10F total 28 enabled frames. Dash, jump, landing and hit remain staged.

Built-in imagegen generated four complete guarded backward-step poses using the existing idle as character/style reference. Source order is [idle01,1,2,3,4,4,3,2,1,idle01]. Contact holds and repeated return poses are intentional. The initial midpoint reused idle, yielding opposite-contact IoU 1.0 and area CV .171038 above .17. Replacing that midpoint with the generated settled-contact pose gives IoU .558961 and area CV .152953. Foot travel is 60.59509px and loop IoU 1.0. No quality limits changed.

The shared installer applies the existing Ibuki original-root offset uniformly. Authored retreat staging anchor offsets are zero; timing weights/fps remain unchanged. Each idle/walk/retreat replacement validates every active installed peer's checksum and dimensions, then both endpoint transitions. This checks all six directed connections rather than trusting source files not installed. Initial idle bootstrap permits inactive locomotion peers. Other character paths remain unchanged.

The real-input regression failed before promotion (missing IBUKI_WALK_BACK_HQ), then passed both facings, every frame, actual loop wrap, release-to-idle and forward switching. Renderer tests confirm actual distinct retreat texture at 192x224 from 384x448 cells. The browser fixture uses enough arena width for 120 input ticks so boundary clamping cannot change the selected gait during a loop test.

Fresh TypeScript/build, combat/offline, animation registry/assets, idle/walk/retreat timing, render size and all three runtime quality checks passed. Isolated ingestion covers bootstrap totals 6/18/28, rollback, character isolation, incomplete-source rejection and six corrupt-peer directions. Browser idle/walk/retreat in both facings passed all 6/12/10 frames with repeat=true, no render failures or console warnings/errors. Screenshot inspected. Read-only review found no actionable issues. Clean production builds remove the developer fixture. Cache/preload v085 includes retreat; a duplicate prior forward-walk preload entry was removed.

## Generation prompt

Use case: stylized-concept. Create a 2 by 2 sprite pose sheet, four completely separated full-body Ibuki poses, transparent background, no text or shadows. Match reference character, beige ninja sleeveless costume, beige mask, brown wraps and open toes, long brown ponytail, same illustrated fighting-game shading. All face RIGHT toward opponent, keep raised open-hand guard, retreating LEFT with low cautious grounded steps, not running or high-knee marching. Top left: rear LEFT foot lifted slightly reaching backward left, front right foot planted, compact bent knees. Top right: rear left foot contacts farther behind, body settles weight left, front foot still right. Bottom left: front right foot lifts a little drawing backward under hip, rear left leg supports, small knee bend. Bottom right: front right foot returns to compact staggered guard stance, rear foot supports. Hands and torso shift subtly with the weight transfer. Moderate stance width, heels/toes at low level, no huge kicks or lunges. Preserve full ponytail, fingers and toes, generous transparent margin on every side and gap between figures. Equal apparent body size.

```sh
python3 scripts/install-authored-chunli-walk.py walk-back --character IBUKI --install
python3 scripts/install-authored-chunli-walk.py walk-back --character IBUKI --runtime
node scripts/verify-ibuki-retreat.mjs
python3 scripts/verify-ibuki-ingest.py
```