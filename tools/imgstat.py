import numpy as np
from PIL import Image

def lum(hexs):
    h = hexs.lstrip('#')
    r, g, b = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    f = lambda v: v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)

def ratio_hex(a, b):
    L1, L2 = lum(a), lum(b)
    return round((max(L1, L2)+0.05)/(min(L1, L2)+0.05), 2)

def hexof(rgb):
    return '#%02X%02X%02X' % tuple(int(round(c)) for c in rgb[:3])

for name, path in [('DESKTOP', 'desktop.png'), ('MOBILE', 'mobile.png')]:
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    H, W, _ = a.shape
    print(f'\n{"="*70}\n{name}  {W}x{H}  ratio {W/H:.3f}:1')

    # overall brightness — the previous version failed on being too dark
    gray = a @ [0.2126, 0.7152, 0.0722]
    print(f'  luma: mean {gray.mean():.1f}  median {np.median(gray):.1f}  '
          f'p5 {np.percentile(gray,5):.1f}  p95 {np.percentile(gray,95):.1f}')
    print(f'  share of pixels below luma 60 (reads as "dark"): {(gray<60).mean()*100:.1f}%')

    # where is the subject? the ground is pale wood/plaster, objects are darker or saturated
    mx = a.max(axis=2); mn = a.min(axis=2)
    sat = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1), 0)
    subject = (sat > 0.30) | (gray < 120)          # red fabric, brass, or any dark mass
    colsum = subject.mean(axis=0)
    rowsum = subject.mean(axis=1)
    cols = np.where(colsum > 0.04)[0]
    rows = np.where(rowsum > 0.04)[0]
    if len(cols):
        print(f'  subject mass spans x {cols.min()}..{cols.max()} '
              f'({cols.min()/W*100:.0f}%..{cols.max()/W*100:.0f}% of width)')
        print(f'                    y {rows.min()}..{rows.max()} '
              f'({rows.min()/H*100:.0f}%..{rows.max()/H*100:.0f}% of height)')
    # centre of mass of the subject
    ys, xs = np.nonzero(subject)
    print(f'  subject centre of mass: x {xs.mean()/W*100:.1f}%  y {ys.mean()/H*100:.1f}%')
    # how much subject lives in each fifth of the width
    fifths = [subject[:, int(W*i/5):int(W*(i+1)/5)].mean()*100 for i in range(5)]
    print('  subject density per fifth (L->R): ' + '  '.join(f'{v:.1f}%' for v in fifths))

    # sampled ground + key colours
    print(f'  top-left 60x60 avg      {hexof(a[:60,:60].reshape(-1,3).mean(axis=0))}')
    print(f'  bottom-left 60x60 avg   {hexof(a[-60:,:60].reshape(-1,3).mean(axis=0))}')
    # the reddest cluster = the shirts
    red = (a[:,:,0] > 110) & (a[:,:,0] - a[:,:,1] > 45) & (a[:,:,0] - a[:,:,2] > 40)
    if red.sum() > 500:
        print(f'  fabric red avg          {hexof(a[red].mean(axis=0))}  ({red.mean()*100:.1f}% of frame)')
    # the yellow accent
    yel = (a[:,:,0] > 160) & (a[:,:,1] > 120) & (a[:,:,2] < 110) & (a[:,:,0]-a[:,:,2] > 70)
    if yel.sum() > 200:
        print(f'  yellow accent avg       {hexof(a[yel].mean(axis=0))}  ({yel.mean()*100:.2f}% of frame)')
