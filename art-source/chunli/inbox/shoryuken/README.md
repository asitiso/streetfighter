# Chun-Li Tensyo Kyaku / rising kick (12 frames)

Only CHUNLI_ANTI_AIR uses CHUNLI_RISING_KICK_HQ, reusing the existing `shoryuken` kind and its unchanged pose/semantic/handoff gates. Startup occupies 0–3, contact 4–7, recovery 8–11. Normal air attacks, Kikoken, spinning kick, and all Super Arts remain distinct.

The built-in imagegen tool authored eight full-body poses: compression, knee chamber, vertical leg extension, airborne extension, apex kick, descending withdrawal, landing-ready brace, and neutral guard. Initial sheets were rejected for edge framing and redrawn with complete boots/hair and transparent margins. Whole-sheet alpha components preserve complete poses. Sources select poses [8,1,2,3,3,4,5,5,6,7,8,8]; repeated extension/apex frames hold contact and repeated guard frames settle recovery. Clothing matches the spinning strip's blue/gold tunic, opaque dark brown leggings and white boots.

The game launches this ground-initiated attack into the air. Its authored mapping therefore stays active during flight, and its sprite follows the actual jumpHeight. Other Chun-Li airborne attacks retain their old mapping rules. A real Fighter.updatePlayer regression reproduced the old airborne mapping rejection; a renderer regression reproduced the missing height translation. Both passed after the fix. The actual flight can outlast the move's recovery; existing jump/landing animations then resume until ground contact. The trajectory test continues through that contact instead of assuming the move ends on the ground.

Browser checks now advance the real Fighter state and retain each sampled pose's airborne flag and height. Rising kick and five previous attacks passed in both facings, without console warnings/errors. This covers actual browser asset/render integration; manual command entry and every combat interaction are separate. First-install failure rollback, successful install, runtime checksum, unchanged quality gates, TypeScript, build, combat, registry and existing action tests also passed.

```sh
python3 scripts/install-authored-chunli-walk.py shoryuken --install
python3 scripts/install-authored-chunli-walk.py shoryuken --runtime
node scripts/verify-chunli-rising-kick.mjs
npm run prepare:chunli-browser-check
```
