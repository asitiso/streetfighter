# Original combat impact atlas v1

Generated with built-in imagegen. Exact prompt: [prompt.txt](prompt.txt). Original PNG remains unchanged; build-combat-impact-assets.py performs only lossless WebP encoding and QA.

Four rows: gold hit, cobalt guard, mint parry, red-orange counter. Four distinct authored drawings per row. Native1254×1254RGBA; rendering samples exact fractional313.5px cells. QA checks distinct drawings, transparent pixels, bright cores inside cell bounds, and lossless alpha/visiblepixel preservation.

Runtime: public/art/fx/combat-impact-v1.webp (1,406,262bytes,6,290,064 decodedbytes shared across roster). No existing character art overwritten.

Game integration: TTL-driven four-frame animation on active belt/duel/final-duel impacts; keep existing text labels, effect fallback and frozen result-phase behavior. Same pack for all10characters/five stages/allqualitytiers.

Preview: /combat-impact-qa.html, actual game rendering; screenshot ../outputs/combat-impact-v1-qa.png. Local only; no publish/deploy.
