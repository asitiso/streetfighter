# Produced game audio v2

Local production on 2026-11-14. Nine original sampled-instrument arrangements replace the old procedural music at runtime; sixteen mastered effects replace electronic chirps. Original /public/audio/*.ogg files are preserved.

## Music

The MIDI scores here were composed for this project and rendered with FluidSynth 2.6.2 and GeneralUser GS 2.0.3. They use sampled acoustic drum kits, electric bass, rhythm/lead guitars, brass, Rhodes, strings and taiko. Tracks include humanized note timing/velocity, fills, different keys/tempos/arrangements and wrapped release tails at loop boundaries. Runtime plays rendered Ogg files, with no MIDI or synthesizer dependency. See score-cues.json for exact tempo/bar/arrangement data.

Instrument source: https://github.com/mrbumpy409/GeneralUser-GS and https://www.schristiancollins.com/generaluser.php . The author's complete License v2.0, including sample-origin qualifications, is preserved as GeneralUser-GS-LICENSE.txt. The 32 MB SoundFont and renderer are build-only inputs kept outside the game/repository.

## Effects

Kenney Impact Sounds (https://kenney.nl/assets/impact-sounds), CC0; original license and 800 KB source archive are included. Punch/soft-body/wood/metal/glass/bell recordings are layered and resampled into three light hits, three heavy hits, two guards, two parries, KO, UI and victory effects.

The cloth/air kick source kick-whoosh-generated.mp3 was generated using Mirelo Text to Audio through Higgsfield, job 3427a11f-982a-45b0-a65e-744fa7c04385; duration about two seconds. It is used for whoosh, super-start and super-impact layers. All sound sources are nonverbal; no cloned voices or existing game soundtrack samples were used.

External music generation was attempted but no music job was submitted because credits were insufficient. The attempted generated heavy punch was rejected by rate limiting and is not an input. Do not label the locally arranged music or Kenney recordings as AI-generated.

## Reproduction

See scripts/produce-audio-v2.py. Arguments: production-work-directory repository-directory. The work directory needs GeneralUser-GS.sf2, fluidsynth/ (official Windows x64 release), deps/ (mido, numpy and imageio-ffmpeg available on Python path), impact/ (unpacked Kenney archive), and kick-whoosh-generated.mp3. The script rewrites only the v2 score/effect outputs plus their source MIDI/metrics, not existing character art or original music.

## Runtime and checks

Effects preload/decode during audio unlock and play synchronously; missed loads never queue stale hits. Ready variants remain playable after partial failure; unlock can retry only missing samples. Effect voices are capped at eight, decoded music buffers at three. Music/ambience/SFX buses, impact ducking, pause/background suspension and screen ownership remain in use; an output compressor provides headroom. No continuous oscillator pad or frame-driven synth beat runs over the score. Offline preparation includes all v2 files.

Music files are mastered toward -14 LUFS / -2 dBTP before game bus attenuation, to leave a mobile-game mix near -18 to -22 LUFS with effects. Per-file measured decoded peaks/duration/RMS are in production-metrics.json. Mixed-game measurements and all QA artifacts are under ../outputs; measured results, not targets, determine the final report. Headphone/speaker listening preference remains a user check.
