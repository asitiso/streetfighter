# Jump motion v2 — all ten characters

Built-in imagegen created80 replacement runtime drawings,8 per character: Alex/Dudley16, Makoto/Yun/Ibuki24 Ryu/Ken/Chun-Li24 and Urien/Gill16. Previous distinct-pose counts are recorded below. Runtime strips remain384×448×8. Existing FPS, frame weights, physical jump height/time, controls and decoded texture memory are unchanged. Existing download caps remain Alex18MB, Dudley13MB, Makoto15MB, Yun17MB and Ibuki17MB, Ryu18MB, Ken19MB Chun-Li20MB, Urien14MB and Gill17MB.

| Character | Accepted source | Exact prompt | Unique poses | Maximum adjacent centroid step | RGB packing |
|---|---|---|---|---|---|
| Alex | [v1](alex/generated-sheet-v1.png) | [prompt](alex/prompt-v1.txt) | 4→8 | 68.090650→46.631993 (31.51%) | quality96,39.003dB |
| Dudley | [v1](dudley/generated-sheet-v1.png) | [prompt](dudley/prompt-v1.txt) | 4→8 | 57.120191→26.816440 (53.05%) | lossless |
| Makoto | [v1](makoto/generated-sheet-v1.png) | [prompt](makoto/prompt-v1.txt) | 4→8 | 63.246937→29.376048 (53.55%) | quality96,40.151dB |
| Yun | [v1](yun/generated-sheet-v1.png) | [prompt](yun/prompt-v1.txt) | 4→8 | 69.269606→33.247500 (52.00%) | quality100,37.434dB |
| Ibuki | [v2](ibuki/generated-sheet-v2.png) | [prompt](ibuki/prompt-v2.txt) | 6→8 | 75.138034→34.972390 (53.46%) | quality100,39.349dB |
| Ryu | [v1](ryu/generated-sheet-v1.png) | [prompt](ryu/prompt-v1.txt) | 8→8 | 72.817376→36.893473 (49.33%) | lossless |
| Ken | [v1](ken/generated-sheet-v1.png) | [prompt](ken/prompt-v1.txt) | 8→8 | 47.204835→31.134025 (34.04%) | lossless |
| Chun-Li | [v2](chunli/generated-sheet-v2.png) | [prompt](chunli/prompt-v2.txt) | 8→8 | 86.456547→34.852911 (59.69%) | lossless |
| Urien | [v3](urien/generated-sheet-v3.png) | [prompt](urien/prompt-v3.txt) | 4→8 | 48.758390→27.160146 (44.30%) | quality99,38.671dB |
| Gill | [v1](gill/generated-sheet-v1.png) | [prompt](gill/prompt-v1.txt) | 4→8 | 68.245666→29.471866 (56.82%) | quality100,38.623dB |

All alpha streams are exact. Alex RGB is lossy WebP at quality96 to retain the original entry cap; visible RGB PSNR is39.003dB (minimum35dB). Dudley/Ryu/Ken/Chun-Li RGB is lossless. Original PNGs and exact prompts are preserved here, and default generated originals remain in the imagegen directory.

All ten accepted source PNGs are1024×1536 with12 complete figures in a3×4 grid. Cell1 is the neutral anatomy calibration; cells2..9 become8runtime frames; cells10..12 are unused neutral references. Input references were installed idle.webp (identity/anatomy), previous jump.webp (jump phases), and installed landing.webp (closing contact pose).

Technical processing extracts whole bodies, applies one idle-reference anatomical scale and one neutral-foot horizontal offset. No joint/shape warps or per-pose fit shrinking. Launch/descent feet share the installed idle baseline. Foot-root mixing across the8frames is [1,1,1,.5,0,.5,1,1]: intermediate rise/descent blends foot-root placement with the centered apex (cell centerY220). Fighter still supplies the full physical jump height separately. The measured centroid improvement comes from BOTH the new drawings and the more gradual within-cell root placement; it is not a player-perception study. This is a non-looping action, so no walking-style cyclic-step claim is made.

Each folder retains previous-jump.webp, previous-manifest.json, generated-sheet-v1.png, prompt-v1.txt, candidate-jump.png and qa.json. Installation is atomic after all selected candidates pass. Gates require8 unique complete drawings, no clipping, uniform anatomical scale, original jump pose/semantic thresholds, original idle→jump→installed-landing bridges, strict adjacent-step improvement, original caps, exact alpha and exact source-to-runtime byte reconstruction. Runtime packing uses the accepted encoding via the existing motion helper.

Commands use project Python dependencies and an external POSE_ECC_CACHE_PATH:

- python scripts/build-jump-motion-v2.py — source QA; --install installs; --runtime recomputes gates and exact bytes.
- python scripts/verify-jump-source-order.py —12-cell reading order and missing/clipped negative cases.
- node scripts/verify-character-jump-motion-v2.mjs — provenance/caps/memory, actual jump input in2modes×2facings×3directions, all8jump+6landing frames, apex hitstop and ground/air light-punch transitions.

Historical movement, landing and parry validators accept only separately source/runtime-hash-and-QA-verified Alex/Dudley/Makoto/Yun/Ibuki/Ryu/Ken/Chun-Li/Urien/Gill jump records through verify-jump-peer.mjs. All other motion pins remain enforced; unreplaced jump peers keep their old hashes. The new jump verifier pins every non-jump record against its immediate previous manifest. Existing walking, landing and all other artwork/provenance remain byte-identical.

First evidence: ../outputs/jump-first-v2-local-verification.json. Second evidence: ../outputs/jump-second-v2-local-verification.json. Third: ../outputs/jump-third-v2-local-verification.json; jump-third-v2-{ryu,ken,chunli}.png each show16poses from actual jump input with actual jump height retained (canvas x/y relocated only for the contact sheet). Physics baseline: jump-motion-v2-physics-before.json,120runs/8400rows. Local only; no commit, push or deployment. All10jump-art targets are complete; other action families are outside this batch. Latest evidence: ../outputs/jump-fourth-v2-local-verification.json and jump-fourth-v2-{urien,gill}.png (32 actual-height browser cells).

Ibuki v1 is retained rejected: apex silhouette IoU0.297453 fell below the unchanged0.30minimum. Built-in v2 slightly relaxes the apex knee/ankle tuck at sourcecell6; all original gates were recomputed because other poses also changed in generation. Makoto/Yun v1 passed directly. Makoto uses quality96 RGB40.151dB; Yun quality10037.434dB; Ibuki quality10039.349dB. All alpha exact. Previous Alex/Dudley sources/runtime/QA remain byte-identical.

A separate timing bug was reproduced during actual-height browser review: Ibuki displayed frame7 atheight145.4, shortly after the148.05physicalpeak, because an ease-out curve was applied on top of velocity-normalized flight progress. Ryu/Ken/Chun-Li had the same extra curve. Only those four jump sequence timing fields changed from ease-out to linear; FPS, frame weights, anchors, other sequence definitions and physical flight remain unchanged. After the fix Ibuki frame4 firstappears atheight147.6 and frame7 at75.6. The before-fix screenshot/HTML are retained as jump-second-v2-ibuki-before-phase-fix.*.

- node scripts/verify-jump-phase-timing.mjs —120 actualWorld cases across all10characters/2modes/2facings/3directions, physicalapex aligned toframe3/4, landing-ready frame only during descent below80%peak, all8frames monotonic and360hitstop freezes. A failing pre-fix test and passing post-fix output are preserved. Included in npm verify.

Ryu/Ken/Chun-Li retain8unique poses each; these are replacement originals refining articulation and transitions, not a count increase. All three latest RGB/alpha streams are lossless. Chun-Li v1 is retained rejected: sourcecell6 apex body237px was below the unchanged240px source minimum. Built-in v2 relaxes the apex knee/ankle tuck to extend the drawn body naturally, without technical scaling/stretching or lowering resolution gates. Other figures also changed during generation, so every original gate was rerun. Ryu/Ken v1 passed directly.

Ryu had no prior semantic metadata; its72.817376 baseline is computed from checksum-verified previous pixels using the same jump semantic evaluator. The initial standalone roster audit used a different alpha threshold and is not the acceptance baseline. The four-character linear jump timing fix, physical flight, frame weights and all other sequence definitions remain byte-identical in this batch. Prior five jump sources/runtime/QA, all walking and landing/defense art remain preserved.

Urien v1 is retained rejected: preparation/landing-ready silhouette IoU0.905206 exceeded the unchanged0.90maximum. Built-in v2 changed the pose but returned invalid background alpha215..251, so it was rejected without masking or threshold relaxation. Built-in v3 redraws the earlier, shallower preparation with genuine transparent gutters; every original gate was rerun because generation may change other figures. Gill v1 passed directly. Urien quality99 RGB38.671dB and Gill quality100 RGB38.623dB, both exact alpha; download caps unchanged. Existing8jump sources/runtime/QA, all walking/landing/defense assets and the sequence registry remain byte-identical in this batch.
