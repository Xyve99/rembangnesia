from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

PUTIH_MIN = 228
ABU_MAKS = 18
RASIO_PUTIH = 0.98
MARGIN = 4
BATAS_ATAS = 0.30
BATAS_BAWAH = 0.85
RASIO_CADANGAN = 1.547
LEBAR_BESAR = 1600
LEBAR_GALERI = 800
MUTU_BESAR = 86
MUTU_GALERI = 80


@dataclass
class Garis:
    baris: int
    tinggi: int
    otomatis: bool
    catatan: str

    @property
    def persen(self) -> float:
        return self.baris / self.tinggi * 100


def _baris_kosong(im: Image.Image) -> np.ndarray:
    arr = np.asarray(im.convert("RGB")).astype(np.int16)
    terendah = arr.min(axis=2)
    tertinggi = arr.max(axis=2)
    putih = (terendah >= PUTIH_MIN) & (tertinggi - terendah <= ABU_MAKS)
    return putih.mean(axis=1) >= RASIO_PUTIH


def _naik_selama(kosong: np.ndarray, mulai: int, nilai: bool) -> int:
    y = mulai
    while y >= 0 and bool(kosong[y]) is nilai:
        y -= 1
    return y

def cari_garis(im: Image.Image) -> Garis:
    kosong = _baris_kosong(im)
    tinggi = im.height

    akhir_margin_bawah = _naik_selama(kosong, tinggi - 1, True)
    atas_panel = _naik_selama(kosong, akhir_margin_bawah, False) + 1
    baris = atas_panel - MARGIN

    if BATAS_ATAS * tinggi <= baris <= BATAS_BAWAH * tinggi:
        return Garis(baris, tinggi, True, f"panel terdeteksi di baris {atas_panel}")

    cadangan = max(1, min(round(im.width / RASIO_CADANGAN), tinggi))
    return Garis(cadangan, tinggi, False,
                 f"panel tidak terdeteksi, dipakai rasio template {RASIO_CADANGAN}")


def potong(im: Image.Image, baris: int) -> Image.Image:
    return im.crop((0, 0, im.width, max(1, min(baris, im.height))))


def panel(im: Image.Image, baris: int) -> Image.Image:
    atas = max(0, min(baris, im.height - 1))
    return im.crop((0, atas, im.width, im.height))


def simpan_webp(im: Image.Image, tujuan: Path, lebar: int, mutu: int) -> int:
    keluar = im.convert("RGB")
    if keluar.width > lebar:
        tinggi = round(keluar.height * lebar / keluar.width)
        keluar = keluar.resize((lebar, tinggi), Image.LANCZOS)
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    keluar.save(tujuan, "WEBP", quality=mutu, method=6)
    return tujuan.stat().st_size


def olah(sumber: Path, kode: str, akar: Path, geser: int = 0) -> dict:
    im = Image.open(sumber)
    garis = cari_garis(im)
    baris = max(1, min(garis.baris + geser, im.height))
    atas = potong(im, baris)
    besar = akar / "img" / "desain" / f"{kode}.webp"
    kecil = akar / "img" / "desain" / "galeri" / f"{kode}.webp"
    return {
        "kode": kode,
        "garis": garis,
        "baris": baris,
        "lebar": atas.width,
        "tinggi": atas.height,
        "byte_besar": simpan_webp(atas, besar, LEBAR_BESAR, MUTU_BESAR),
        "byte_kecil": simpan_webp(atas, kecil, LEBAR_GALERI, MUTU_GALERI),
    }

def _cli() -> None:
    import argparse

    p = argparse.ArgumentParser(description="Potong lembar desain lalu simpan dua versi WebP.")
    p.add_argument("berkas", type=Path)
    p.add_argument("--kode", default="CONTOH")
    p.add_argument("--akar", type=Path, default=Path(__file__).resolve().parent.parent)
    p.add_argument("--geser", type=int, default=0)
    p.add_argument("--panel", type=Path)
    p.add_argument("--banding", type=Path)
    a = p.parse_args()

    im = Image.open(a.berkas)
    hasil = olah(a.berkas, a.kode, a.akar, a.geser)
    garis: Garis = hasil["garis"]
    rasio = hasil["lebar"] / hasil["tinggi"]

    print(f"lembar      : {im.width} x {im.height}")
    print(f"garis potong: baris {hasil['baris']} ({hasil['baris'] / im.height * 100:.1f}% tinggi)")
    print(f"deteksi     : {'otomatis' if garis.otomatis else 'CADANGAN'} - {garis.catatan}")
    print(f"hasil       : {hasil['lebar']} x {hasil['tinggi']}  rasio {rasio:.4f}")
    print(f"berkas      : galeri {hasil['byte_kecil'] / 1024:.0f} KB, "
          f"penuh {hasil['byte_besar'] / 1024:.0f} KB")

    if a.banding:
        b = Image.open(a.banding)
        rasio_b = b.width / b.height
        print(f"pembanding  : {b.width} x {b.height}  rasio {rasio_b:.4f}  "
              f"selisih {abs(rasio - rasio_b) / rasio_b * 100:.2f}%")

    if a.panel:
        bawah = panel(im, hasil["baris"])
        byte = simpan_webp(bawah, a.panel, LEBAR_BESAR, MUTU_BESAR)
        print(f"panel       : {bawah.width} x {bawah.height} -> {a.panel} ({byte / 1024:.0f} KB)")


if __name__ == "__main__":
    _cli()
