import numpy as np
from PIL import Image
import os

OUT = '/home/zenith/Documents/rmbg/media'
pairs = [
    ('desktop.png', 'bonus-wide', (2240, 700)),
    ('mobile.png',  'bonus-square', (1200, 1200)),
]
for src, stem, size in pairs:
    ref = Image.open(f'/home/zenith/Documents/rmbg/{src}').convert('RGB').resize(size, Image.LANCZOS)
    r = np.asarray(ref).astype(float)
    print(f'\n{stem} — deviation from the resized source')
    for f in sorted(os.listdir(OUT)):
        if not f.startswith(stem) or not (f.endswith('.webp') or f.endswith('.jpg')):
            continue
        t = np.asarray(Image.open(os.path.join(OUT, f)).convert('RGB')).astype(float)
        diff = np.abs(t - r)
        mse = (diff ** 2).mean()
        psnr = 10 * np.log10(255 * 255 / mse) if mse > 0 else 99
        kb = os.path.getsize(os.path.join(OUT, f)) / 1024
        print(f'  {f:26} {kb:6.0f} KB   PSNR {psnr:5.1f} dB   '
              f'max channel error {diff.max():5.0f}   mean {diff.mean():4.2f}')
