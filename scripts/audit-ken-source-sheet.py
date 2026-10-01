from __future__ import annotations

from argparse import ArgumentParser
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path
from PIL import Image, ImageDraw
import json
import statistics

ROOT = Path(__file__).resolve().parents[1]
INSTALLER = ROOT / 'scripts/install-authored-ken-sequence.py'
spec = spec_from_file_location('ken_installer', INSTALLER)
mod = module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(mod)


def audit(source: Path, layout: Path, output: Path, preview: Path):
    config = json.loads(layout.read_text(encoding='utf-8'))
    image = Image.open(source).convert('RGBA')
    results = []
    preview_tiles = []
    for name, entry in config['sequences'].items():
        x, y, w, h = entry['crop']
        cols, rows = entry['grid']
        count = entry['frames']
        region = image.crop((x, y, x + w, y + h))
        frames = mod.load_frames_from_image(region, count, cols, rows, dark_bg=True) if hasattr(mod, 'load_frames_from_image') else None
        if frames is None:
            cw, ch = region.width / cols, region.height / rows
            frames = []
            for i in range(count):
                r, c = divmod(i, cols)
                cell = region.crop((round(c*cw), round(r*ch), round((c+1)*cw), round((r+1)*ch)))
                frames.append(mod.remove_dark_background(cell))
        heights = []
        widths = []
        nonempty = 0
        for i, frame in enumerate(frames):
            bbox = mod.alpha_bbox(frame)
            if bbox:
                nonempty += 1
                widths.append(bbox[2] - bbox[0])
                heights.append(bbox[3] - bbox[1])
                crop = frame.crop(bbox)
            else:
                crop = Image.new('RGBA', (80,80), (0,0,0,0))
            tile = Image.new('RGBA', (160,160), (22,24,30,255))
            if crop.width and crop.height:
                scale = min(140/crop.width, 130/crop.height)
                sized = crop.resize((max(1,round(crop.width*scale)), max(1,round(crop.height*scale))), Image.Resampling.NEAREST)
                tile.alpha_composite(sized, ((160-sized.width)//2, 20))
            d = ImageDraw.Draw(tile)
            d.text((6,5), f'{name} {i+1:02d}', fill=(255,255,255,255))
            preview_tiles.append(tile)
        min_h = min(heights) if heights else 0
        median_h = statistics.median(heights) if heights else 0
        source_pass = nonempty == count and min_h >= mod.MIN_SOURCE_BODY_HEIGHT
        results.append({
            'sequence': name,
            'runtimeTarget': entry.get('runtimeTarget'),
            'referenceFrames': count,
            'runtimeTargetFrames': entry.get('runtimeTargetFrames'),
            'crop': entry['crop'],
            'grid': entry['grid'],
            'nonEmptyFrames': nonempty,
            'sourceBodyHeightMin': min_h,
            'sourceBodyHeightMedian': median_h,
            'sourceBodyWidthMedian': statistics.median(widths) if widths else 0,
            'requiredBodyHeight': mod.MIN_SOURCE_BODY_HEIGHT,
            'sourceResolutionPass': source_pass,
            'runtimeFrameCountMatch': count == entry.get('runtimeTargetFrames'),
            'verdict': 'HQ_SOURCE_CANDIDATE' if source_pass else 'REFERENCE_ONLY_LOW_RES',
        })
    cols = 4
    rows = (len(preview_tiles)+cols-1)//cols
    sheet = Image.new('RGBA',(160*cols,160*rows),(14,16,20,255))
    for i,tile in enumerate(preview_tiles):
        sheet.alpha_composite(tile,((i%cols)*160,(i//cols)*160))
    sheet.save(preview)
    report = {
        'character':'KEN',
        'source':str(source.relative_to(ROOT) if source.is_relative_to(ROOT) else source),
        'sourceSize':list(image.size),
        'gate':{'minimumBodyHeight':mod.MIN_SOURCE_BODY_HEIGHT,'productionRuntimeFrameSize':[mod.FRAME_W,mod.FRAME_H]},
        'records':results,
        'allSourceResolutionPass':all(r['sourceResolutionPass'] for r in results),
        'safeToAutoPromote':all(r['sourceResolutionPass'] and r['runtimeFrameCountMatch'] for r in results),
        'recommendation':'Use this overview only for pose/style reference. Generate dedicated per-motion HQ sheets with body height >= 240 px before runtime promotion.'
    }
    output.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(report,indent=2,ensure_ascii=False))
    return 0 if report['safeToAutoPromote'] else 2


def main():
    p=ArgumentParser()
    p.add_argument('--source',type=Path,default=ROOT/'art-source/ken/reference/ken-motion-overview-rc39.png')
    p.add_argument('--layout',type=Path,default=ROOT/'art-source/ken/reference/overview-layout.json')
    p.add_argument('--output',type=Path,default=ROOT/'public/art/animation-hq/ken/source-audit.json')
    p.add_argument('--preview',type=Path,default=ROOT/'public/art/animation-hq/ken/source-audit-preview.png')
    p.add_argument('--allow-reference-only',action='store_true')
    args=p.parse_args()
    code=audit(args.source,args.layout,args.output,args.preview)
    if code and not args.allow_reference_only:
        raise SystemExit(code)

if __name__=='__main__':
    main()
