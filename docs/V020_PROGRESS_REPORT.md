# v0.0.20 Progress Report

## Implemented
- 8 bespoke playable-character paired throw motion profiles.
- Throw attacker/victim transforms now share the thrower's style through the synchronized 24-frame timeline.
- Super Art victim reactions separated from ordinary hit reactions with motif-specific recoil, lift, twist, body compression, arm opening and leg kick.
- Super victim reactions work for both melee and projectile Super hits through Fighter.receiveHit.
- Stage 5 Urien intro full-body cinematic profile.
- Gill intro, Phase II awakening and Phase III/Final Segment full-body cinematic profiles.
- Gill Phase II/III overlays now render the boss body during transition, not only HUD text.
- Final arena escalation: fire/ice side lighting, phase-dependent floor fractures, seraphic rings and final-phase screen energy.
- Boss closeups use the new cinematic pose profiles.

## Regression status
- Existing fixed 60 Hz combat timings unchanged.
- Existing damage, multi-hit, juggle, bounce, Parry, Stage 1-5 campaign, Urien/Gill patterns, Continue, Stage Select and Options tests retained.

## New verification
- 8/8 unique throw profile signatures.
- 16+ Super victim reaction families and 12+ distinct reaction signatures.
- Super hits arm a 28-frame victim reaction timeline.
- Urien intro: 12 key poses.
- Gill intro/Phase II: 14 key poses each.
- Gill Phase III: 15 key poses.
