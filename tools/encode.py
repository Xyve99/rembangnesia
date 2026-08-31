from PIL import Image
import os

SRC = '/home/zenith/Documents/rmbg'
OUT = '/home/zenith/Documents/rmbg/media'

jobs = [
    ('desktop.png', 'bonus-wide',   2240),   # keep native 2243 -> 2240 (even)
    ('mobile.png',  'bonus-square', 1200),   # 1254 -> 1200, the documented target
]

for src, stem, target_w in jobs:
    im = Image.open(os.path.join(SRC, src)).convert('RGB')
    w, h = im.size
    if w != target_w:
        nh = round(h * target_w / w)
        im = im.resize((target_w, nh), Image.LANCZOS)
    print(f'\n{src}  {w}x{h} -> {im.size[0]}x{im.size[1]}')
    orig_kb = os.path.getsize(os.path.join(SRC, src)) / 1024
    print(f'  source PNG            {orig_kb:8.0f} KB')

    for q in (78, 84, 90):
        p = os.path.join(OUT, f'{stem}-q{q}.webp')
        im.save(p, 'WEBP', quality=q, method=6)
        print(f'  WebP q{q}              {os.path.getsize(p)/1024:8.0f} KB')

    for q in (80, 86):
        p = os.path.join(OUT, f'{stem}-q{q}.jpg')
        im.save(p, 'JPEG', quality=q, optimize=True, progressive=True,
                subsampling=1)
        print(f'  JPEG q{q} progressive  {os.path.getsize(p)/1024:8.0f} KB')
