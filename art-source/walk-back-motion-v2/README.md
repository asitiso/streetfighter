# Backward walk motion v2 — all ten characters

Built-in imagegen created100replacement runtime drawings: Chun-Li10, Ibuki/Makoto/Yun30, Ken/Alex/Dudley30 and Ryu/Urien/Gill30. Runtime remains384x448x10 per character with unchanged FPS/frame weights/gameplay/decoded texture memory. Existing download caps remain Chun-Li20MB,Ibuki17MB,Makoto15MB,Yun17MB,Ken19MB,Alex18MB,Dudley13MB,Ryu18MB,Urien14MB,Gill17MB.

|Character|Accepted source|Exact prompt|Old→new unique poses|Adjacent centroid-step reduction|RGB packing|
|---|---|---|---|---|---|
|Chun-Li|[v1](chunli/generated-sheet-v1.png)|[prompt](chunli/prompt-v1.txt)|10→10|58.95%|lossless|
|Ibuki|[v3](ibuki/generated-sheet-v3.png)|[prompt](ibuki/prompt-v3.txt)|5→10|73.65%|quality100,37.879dB|
|Makoto|[v1](makoto/generated-sheet-v1.png)|[prompt](makoto/prompt-v1.txt)|6→10|61.81%|quality100,41.501dB|
|Yun|[v1](yun/generated-sheet-v1.png)|[prompt](yun/prompt-v1.txt)|6→10|35.53%|quality100,36.189dB|
|Ken|[v1](ken/generated-sheet-v1.png)|[prompt](ken/prompt-v1.txt)|9→10|27.32%|lossless|
|Alex|[v2](alex/generated-sheet-v2.png)|[prompt](alex/prompt-v2.txt)|6→10|43.94%|quality100,40.626dB|
|Dudley|[v1](dudley/generated-sheet-v1.png)|[prompt](dudley/prompt-v1.txt)|6→10|37.04%|lossless|
|Ryu|[v2](ryu/generated-sheet-v2.png)|[prompt](ryu/prompt-v2.txt)|6→10|12.14%|quality100,38.554dB|
|Urien|[v2](urien/generated-sheet-v2.png)|[prompt](urien/prompt-v2.txt)|6→10|39.47%|lossless|
|Gill|[v4](gill/generated-sheet-v4.png)|[prompt](gill/prompt-v4.txt)|6→10|6.95%|lossless|

All alpha packing is exact/lossless. Ibuki/Makoto/Yun/Alex/Ryu use lossy WebP RGB at highest quality100 to stay within existing caps; original generated PNGs are preserved. RGB PSNR measured on visible pixels must remain>=35dB. Metrics are silhouette-centroid measures, not a player study. Yun adjacent step24.462627→15.769953 differs from loop-inclusive27.673112→15.769953 (43.01%); both are recorded in QA.

Ryu/Urien v1 are retained rejected candidates: adjacent jumps exceeded their previous strips. Accepted v2 redraws middle weight transfer and extended rear-leg stance. Gill v1 failed strict cyclic improvement; v2/v3 reduced lateral body travel below the original6px minimum. Accepted v4 applies a small generated rear-leg correction to v1. All generated candidates and exact prompts remain. Ryu adjacent12.260868→10.772128 differs from cyclic19.194515→10.772128; Urien adjacent11.940778→7.227667 differs from cyclic20.193025→7.227667. Gill both6.789275→6.317555: modest6.95% change; concrete pose gain is6→10, not a measured player-perception gain.

Source grid [columns,rows]=[3,4]. Cell1 neutral guard calibrates anatomy, cells2..11 are runtime, cell12 is closing reference only. Extract entire bodies in reading order; use one neutral-height anatomical scale, single neutral-foot horizontal offset and ground alignment. No joint/shape/color warps in technical processing. Input images are installed idle.webp and previous walk-back.webp for each character. Default generated originals remain; project copies/prompts are here.

Alex v1 is retained as a rejected candidate: final forward-walk foot handoff67.862286 exceeded58. Built-in v2 redraws the closing support-foot pose; accepted foot delta8.640828. Other source poses also changed during generation, so every pose/semantic/handoff/loop gate was rerun. Ken/Dudley use lossless RGB; Alex uses quality100 RGB.

Ibuki v1/v2 are retained rejected candidates: horizontal retreat shape travel was too small. Generated v3 redraws rear-foot loading/hip/shoulder changes at cells4..6; original gates are unchanged.

Each folder retains previous-walk-back.webp, previous-manifest.json, candidate-walk-back.png and qa.json. Importer demands ten unique drawings, no clipping/anatomical fit shrink, strict reduction of adjacent AND loop-inclusive max centroid step, original walking pose/semantic/idle+forward handoff gates, existing caps, and exact installed byte reconstruction.

Commands use project Python dependencies plus external POSE_ECC_CACHE_PATH:
- python scripts/build-walk-back-motion-v2.py: source QA; --install atomic write after allselectedpass; --runtime recompute/reconstruct.
- python scripts/verify-walk-back-source-order.py: twelve-cell order plus missing/clipped negatives.
- node scripts/verify-character-walk-back-motion-v2.mjs: hashes/metadata/caps/memory and actual held-back input in both modes/facings/two loops, hitstop/reverse/idle/attack controls.

Historical peer pins in forward/backdash verification permit only these independently hash/QA-verified walking records; unrelated records remain pinned. Current batch leaves all Chun-Li/Ibuki/Makoto/Yun/Ken/Alex/Dudley source/runtime/QA files and other motion artwork byte-identical.

First evidence: ../outputs/walk-back-art-v2-local-verification.json. Second batch: ../outputs/walk-back-second-v2-local-verification.json. Third batch: ../outputs/walk-back-third-v2-local-verification.json. Latest: ../outputs/walk-back-fourth-v2-local-verification.json, walk-back-fourth-v2-{ryu,urien,gill}.png. No commit,push,deployment. All ten backward-walk original-art targets complete; further motion work requires separate targeted assessment.
