# Arcade stage props v1

Built-in imagegen produced2 original transparent PNG source sheets:10intact props and10matching destroyed remnants. Exact prompts: [intact](intact.prompt.txt), [broken](broken.prompt.txt). Source sheets are preserved.

Kinds in row order: trash, stall, vending, lantern, bag, bin, console, tank, crate, hydrant. The extractor uses the actual transparent gap between rows, preserves RGBA components and antialiased edges, scales each complete sprite into a192pxcell with a shared baseline, and stores20sprites in one960×768 lossless WebP. Pillow exact=True keeps transparent RGB stable.

Rebuild with scripts/build-stage-props-v1.py using Pillow, NumPy and SciPy. Outputs runtime public/art/stage-props-v1/atlas.webp, generated src/render/StagePropAtlasData.ts, and qa.json. Current runtime562404bytes; decodedRGBA2949120bytes. qa.json records SHA256 and source/packed bounds.

World owns collisions, damage, HP, solidity and broken state; rendering only selects intact/debris artwork. Existing vector fallback, damage bars and shadows remain. Shared atlas and helper modules are deferred stage assets and included in offline preparation.
