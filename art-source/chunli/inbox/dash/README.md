# Chun-Li authored dash (7 frames)

The built-in image generation tool drew these poses using the approved Chun-Li master as the character reference. The motion progresses from guarded launch through forward drive to planted braking and recovery. Frames `01.png` through `07.png` are full-body source poses with transparent alpha.

The existing Chun-Li movement installer checks authored pose changes, dash semantics, and transitions to/from the master before enabling the strip. It uses the existing dash transition limits without relaxing the quality gates.

```sh
python3 scripts/install-authored-chunli-walk.py dash --install
python3 scripts/install-authored-chunli-walk.py dash --runtime
```

Walk and walk-back commands remain compatible. Idle, jump, landing, and hit are still staging candidates.
