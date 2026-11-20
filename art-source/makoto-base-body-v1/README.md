# Makoto base identity v1

Reuse approved `../throw-escape-motion-v1/makoto/reference-idle.png` raw bytes for LITE/HD fallback, replacing the wrong-character legacy silhouette. No generation, image editing, recolour, alpha processing or resampling. Versioned paths keep quality/offline ownership separate; old assets preserved. Attacks and authored motion families remain unchanged.

`node scripts/verify-makoto-base-identity.mjs` verifies source bytes, quality selection, failed HD fallback and retry, app-shell/offline references. Native browser QA forces authored motion loading off to test real base fallback in10states,2facings,2qualities.
