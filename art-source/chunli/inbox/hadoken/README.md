# Chun-Li Kikoken and EX Kikoken (12 frames)

Kikoken uses the existing generic projectile-casting sequence kind `hadoken`; its registry identity is CHUNLI_KIKOKEN_HQ. No new sequence type or quality gate is needed.

The built-in imagegen tool drew eight charge/release/recovery poses using the authored idle design. An initial startup sheet was rejected because hair/boots approached its boundaries; the replacement preserves the full body. Frames 2–5 show gathering and coiling, 6–7 two-hand release, 8–9 withdrawal. Frames 10/11 deliberately reuse 5/2 for the returning hands; 1/12 reuse the standing light attack's neutral guard source.

Only grounded CHUNLI_PRIMARY and CHUNLI_EX_PRIMARY use this strip. Super Arts, rising kick and spinning bird kick retain their own presentation. Existing projectile effects and combat data are preserved; body frames track each move's startup/contact/recovery time, including the faster EX variant. Tests check both facings, boundaries, exclusions and normal/idle recovery.

Unchanged projectile pose/semantic and base handoff gates are required. First-install write failure and successful reinstall are regression-tested with the shared installer.

```sh
python3 scripts/install-authored-chunli-walk.py hadoken --install
python3 scripts/install-authored-chunli-walk.py hadoken --runtime
node scripts/verify-chunli-kikoken.mjs
```
