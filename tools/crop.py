import numpy as np
from PIL import Image

PANELS = [(2560, 558), (1920, 558), (1440, 558), (1366, 558), (768, 533)]
im = Image.open('/home/zenith/Documents/rmbg/desktop.png').convert('RGB')
a = np.asarray(im).astype(float)
H, W, _ = a.shape
gray = a @ [0.2126, 0.7152, 0.0722]
mx = a.max(axis=2); mn = a.min(axis=2)
sat = np.where(mx > 0, (mx-mn)/np.maximum(mx, 1), 0)
subj = (sat > 0.30) | (gray < 120)
total = subj.sum()

STOPS = [(0.00, 1.00), (0.40, 1.00), (0.52, 0.88), (0.66, 0.40), (0.80, 0.00), (1.00, 0.00)]

def opacity(frac):
    for (p0, o0), (p1, o1) in zip(STOPS, STOPS[1:]):
        if p0 <= frac <= p1:
            t = 0 if p1 == p0 else (frac-p0)/(p1-p0)
            return o0 + (o1-o0)*t
    return 0.0

print(f'desktop.png {W}x{H} — subject pixels {total:,}\n')
print(f'{"panel":>11} {"scale":>6} {"cropL":>6} {"visible":>14} {"clean@":>7} '
      f'{"kept":>6} {"CLEAN":>7} {"washed":>7}')
for pw, ph in PANELS:
    s = max(pw/W, ph/H)
    sw = W*s
    x0 = (sw - pw)/s
    vis = subj[:, int(x0):]
    kept = vis.sum()
    cols = np.arange(int(x0), W)
    panel_frac = (cols - x0)*s/pw
    op = np.array([opacity(f) for f in panel_frac])
    per_col = vis.sum(axis=0)
    clean = (per_col*(1-op)).sum()
    x_clean = x0 + 0.80*pw/s
    print(f'{pw:>6}x{ph:<4} {s:>6.3f} {int(x0):>6} {int(x0):>5}..{W:<6} {int(x_clean):>7} '
          f'{kept/total*100:>5.0f}% {clean/total*100:>6.0f}% {(kept-clean)/total*100:>6.0f}%')

print()
for pw, ph in PANELS:
    s = max(pw/W, ph/H)
    sh = H*s
    cut = (sh-ph)/s/2 if sh > ph else 0
    print(f'  {pw}x{ph}: vertical crop {cut:.0f}px top + {cut:.0f}px bottom of {H} '
          f'({2*cut/H*100:.0f}% of height lost)')
