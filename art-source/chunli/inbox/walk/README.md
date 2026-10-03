# Chun-Li authored forward walk

`01.png` through `12.png` form the guarded forward-step loop. Source frames were generated with the built-in image tool using the approved Chun-Li master as the design reference: blue/gold qipao, brown tights, white boots, white bun covers, compact guard, alternating steps, transparent background, and full-body framing.

Run `npm run ingest:chunli:walk` to preview, gate, and install the source frames. Run `npm run verify:chunli-walk` to check the installed runtime strip. Both reuse the existing pose and walk semantic checks; installation also checks transitions to and from the approved master. The preview and QA report are at the repository root.

Forward walking, backward walking, and dash are enabled. Jump and landing are also enabled and verified as a pair. Idle and hit remain staging candidates. The shared installer accepts `walk-back` for the 10-frame guarded retreat and `dash` for the 7-frame launch, drive, and recovery.
