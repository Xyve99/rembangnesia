#!/usr/bin/env python3
"""Tulis kartu halaman pertama etalase langsung ke index.html.

Kenapa perlu: seluruh galeri dirender JavaScript dari data/desain.json, jadi
HTML mentah yang dilihat mesin pencari (dan pratinjau media sosial) nyaris
kosong. Skrip ini menyalin 12 kartu pertama — persis markup yang dihasilkan
kartu() di js/etalase.js — ke dalam penanda di index.html, supaya halaman
punya isi nyata sejak byte pertama. JavaScript tetap mengambil alih begitu
jalan, jadi tidak ada yang berubah bagi pengunjung.

Jalankan tiap kali data/desain.json berubah:

    python3 tools/etalase-statis.py
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DATA = AKAR / "data" / "desain.json"
HALAMAN = AKAR / "index.html"
PER_HALAMAN = 12          # samakan dengan PER_HALAMAN di js/etalase.js
LEBAR_MAKS = 760          # samakan dengan ukuran(d, 760)

MULAI = "<!--galeri:mulai-->"
SELESAI = "<!--galeri:selesai-->"


def esc(teks: object) -> str:
    return html.escape(str(teks), quote=True)


def ukuran(d: dict) -> tuple[int, int]:
    w = min(LEBAR_MAKS, d.get("lebar") or LEBAR_MAKS)
    if d.get("lebar") and d.get("tinggi"):
        h = round(w * d["tinggi"] / d["lebar"])
    else:
        h = round(w / 1.55)
    return w, h


def kartu(d: dict, pertama: bool) -> str:
    w, h = ukuran(d)
    kode = esc(d["kode"])
    alt = esc("Mockup desain kaos Rembangnesia, kode " + str(d["kode"]))
    # Gambar pertama dimuat lebih awal supaya jadi LCP yang cepat; sisanya malas.
    muat = ('loading="eager" fetchpriority="high"' if pertama
            else 'loading="lazy"')
    return (
        f'<figure class="kartu masuk" id="{kode}">'
        f'<button class="kartu__buka" type="button" data-buka="{kode}">'
        f'<img data-lambat src="img/desain/galeri/{kode}.webp" alt="{alt}"'
        f' width="{w}" height="{h}" {muat} decoding="async">'
        f'<span class="sr-only">Lihat lebih besar</span>'
        f"</button>"
        f'<figcaption class="kartu__kaki">'
        f'<span class="kartu__kode mono">{kode}</span>'
        f'<button class="tandai" type="button" data-tandai="{kode}"'
        f' aria-pressed="false" aria-label="Tandai desain {kode}">'
        f'<svg viewBox="0 0 24 24" aria-hidden="true">'
        f'<path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></button>'
        f"</figcaption></figure>"
    )


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    desain = data.get("desain", [])
    if not desain:
        print("desain.json kosong, tidak ada yang ditulis", file=sys.stderr)
        return 1

    kartu_html = "".join(
        kartu(d, i == 0) for i, d in enumerate(desain[:PER_HALAMAN])
    )

    isi = HALAMAN.read_text(encoding="utf-8")
    if MULAI not in isi or SELESAI not in isi:
        print("penanda %s / %s tidak ada di index.html" % (MULAI, SELESAI),
              file=sys.stderr)
        return 1

    isi = re.sub(
        re.escape(MULAI) + r".*?" + re.escape(SELESAI),
        MULAI + kartu_html + SELESAI,
        isi, flags=re.S)

    # Jumlah desain ikut ditulis supaya angkanya terbaca tanpa JavaScript.
    isi = re.sub(
        r'(<p class="jml" data-jumlah aria-live="polite">).*?(</p>)',
        r"\g<1>%d desain\g<2>" % len(desain),
        isi, flags=re.S)

    HALAMAN.write_text(isi, encoding="utf-8")
    print("%d kartu ditulis ke index.html (dari %d desain)"
          % (len(desain[:PER_HALAMAN]), len(desain)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
