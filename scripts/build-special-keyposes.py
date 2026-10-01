"""Package transparent special-move key art for the 384x448 combat canvas."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POSES = {
    'ken': ('hadoken', 'shoryuken', 'tatsumaki', 'super-rush'),
    'chunli': ('kikoken', 'spinning-bird-kick'),
}
AIRBORNE = {'shoryuken', 'tatsumaki', 'spinning-bird-kick'}


def package(character: str, kind: str) -> None:
    source = ROOT / 'art-source' / character / 'special-keyposes'
    output = ROOT / 'public/art/special-keyposes' / character
    image = Image.open(source / f'{kind}.png').convert('RGBA')
    alpha = image.getchannel('A')
    alpha = alpha.point(lambda value: value if value >= 32 else 0)
    image.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f'{kind}: empty image')
    image = image.crop(bbox)
    scale = min(360 / image.width, 336 / image.height)
    width = round(image.width * scale)
    height = round(image.height * scale)
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    frame = Image.new('RGBA', (384, 448), (0, 0, 0, 0))
    x = (384 - width) // 2
    y = (448 - height) // 2 if kind in AIRBORNE else 423 - height
    frame.alpha_composite(image, (x, y))
    output.mkdir(parents=True, exist_ok=True)
    frame.save(output / f'{kind}.webp', 'WEBP', lossless=True, method=6)
    print(f'{character}/{kind}: {width}x{height} at ({x},{y})')


if __name__ == '__main__':
    for character, kinds in POSES.items():
        for kind in kinds:
            package(character, kind)
