import json
import numpy as np
from PIL import Image

import os
OUT = os.environ.get('OUT', 'out')
geo = json.load(open(f'{OUT}/bannergeo.json'))

def srgb_lum(arr):
    """arr: float RGB 0..255 -> relative luminance per pixel"""
    c = arr / 255.0
    c = np.where(c <= 0.03928, c/12.92, ((c+0.055)/1.055)**2.4)
    return c[..., 0]*0.2126 + c[..., 1]*0.7152 + c[..., 2]*0.0722

def lum_hex(rgbstr):
    m = [int(v) for v in rgbstr.replace('rgb(', '').replace(')', '').split(',')[:3]]
    a = np.array(m, dtype=float).reshape(1, 1, 3)
    return float(srgb_lum(a)[0, 0]), m

def cr(l1, l2):
    return (max(l1, l2)+0.05)/(min(l1, l2)+0.05)

print('Kontras teks di atas piksel latar yang benar-benar tampil')
print('(worst = piksel latar paling merugikan di dalam kotak teks)\n')
print(f'{"viewport":10} {"blok":9} {"px":>5} {"w":>4} {"min ratio":>10} {"mean":>7} '
      f'{"butuh":>6} {"lolos":>6}  latar terburuk')

problems = []
for name, g in geo.items():
    im = Image.open(f'{OUT}/{name}-bg.png').convert('RGB')
    a = np.asarray(im).astype(float)
    L = srgb_lum(a)
    for block in ('eyebrow', 'title', 'body', 'cta'):
        b = g[block]
        if b['w'] <= 0 or b['h'] <= 0:
            continue
        if block == 'cta':
            continue  # button paints its own solid ground
        y0, y1 = max(0, b['y']), min(a.shape[0], b['y']+b['h'])
        x0, x1 = max(0, b['x']), min(a.shape[1], b['x']+b['w'])
        patch = L[y0:y1, x0:x1]
        if patch.size == 0:
            continue
        fgl, fgrgb = lum_hex(g['colors'][block])
        size = g['sizes'][block]
        weight = int(g['sizes'][block+'Weight'])
        large = size >= 24 or (size >= 18.66 and weight >= 700)
        need = 3.0 if large else 4.5
        ratios = np.vectorize(lambda x: cr(fgl, x))(patch)
        worst = float(ratios.min())
        mean = float(ratios.mean())
        wy, wx = np.unravel_index(ratios.argmin(), ratios.shape)
        worst_rgb = a[y0+wy, x0+wx].astype(int)
        ok = worst >= need
        if not ok:
            problems.append((name, block, round(worst, 2), need))
        print(f'{name:10} {block:9} {size:5.0f} {weight:>4} {worst:>10.2f} {mean:>7.2f} '
              f'{need:>6.1f} {"OK" if ok else "GAGAL":>6}  '
              f'#{worst_rgb[0]:02X}{worst_rgb[1]:02X}{worst_rgb[2]:02X}')

print()
if problems:
    print('GAGAL:')
    for p in problems:
        print('  ', p)
else:
    print('Semua blok teks lolos ambang WCAG AA di setiap viewport.')
