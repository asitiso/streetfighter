# Alex / Dudley base identity v1

The prior LITE/HD base WebPs have another fighter silhouette. Reuse the existing approved per-character `../throw-escape-motion-v1/{alex,dudley}/reference-idle.png` source bytes without generating, editing, recolouring or resampling images. Each source is copied to separate LITE and HD versioned runtime PNG paths to retain offline and deferred-quality ownership. The original WebPs remain unchanged. Attack atlases and authored motion-family selection are outside this fix.

Regression: `node scripts/verify-alex-dudley-base-identity.mjs`. Browser coverage forces authored motion loading off to exercise the actual base fallback at both qualities, orientations, and ten states.
