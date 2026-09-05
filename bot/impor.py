from __future__ import annotations

import argparse
import json
import random
import re
import sys
from datetime import date
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gambar import (LEBAR_BESAR, LEBAR_GALERI, MUTU_BESAR, MUTU_GALERI,
                    cari_garis, potong, simpan_webp)

POLA_TANGGAL = re.compile(r"(20\d{2})(\d{2})(\d{2})")
JENIS = {".jpg", ".jpeg", ".png", ".webp"}


def kode_baru(terpakai: set) -> str:
    while True:
        kode = "RMBG-%04d" % random.randint(1000, 9999)
        if kode not in terpakai:
            terpakai.add(kode)
            return kode


def tanggal_berkas(nama: str, bawaan: str) -> str:
    cocok = POLA_TANGGAL.search(nama)
    if not cocok:
        return bawaan
    return "%s-%s-%s" % (cocok.group(1), cocok.group(2), cocok.group(3))


def muat(berkas: Path) -> dict:
    if berkas.exists():
        return json.loads(berkas.read_text(encoding="utf-8"))
    return {"diperbarui": "", "desain": []}

def main() -> None:
    p = argparse.ArgumentParser(description="Impor lembar desain dari satu folder ke etalase.")
    p.add_argument("folder", type=Path)
    p.add_argument("--akar", type=Path, default=Path(__file__).resolve().parent.parent)
    a = p.parse_args()

    berkas_data = a.akar / "data" / "desain.json"
    data = muat(berkas_data)
    terpakai = {d["kode"] for d in data["desain"]}
    hari_ini = date.today().isoformat()

    sumber = sorted(f for f in a.folder.iterdir() if f.suffix.lower() in JENIS)
    if not sumber:
        raise SystemExit("tidak ada gambar di " + str(a.folder))

    for f in sumber:
        im = Image.open(f)
        garis = cari_garis(im)
        atas = potong(im, garis.baris)
        kode = kode_baru(terpakai)

        besar = a.akar / "img" / "desain" / (kode + ".webp")
        kecil = a.akar / "img" / "desain" / "galeri" / (kode + ".webp")
        b1 = simpan_webp(atas, besar, LEBAR_BESAR, MUTU_BESAR)
        b2 = simpan_webp(atas, kecil, LEBAR_GALERI, MUTU_GALERI)

        data["desain"].append({
            "kode": kode,
            "lebar": atas.width,
            "tinggi": atas.height,
            "ditambah": tanggal_berkas(f.name, hari_ini),
        })
        print("%s  %-28s %4dx%-4d  %s  galeri %3d KB  penuh %3d KB"
              % (kode, f.name[:28], atas.width, atas.height,
                 "oto" if garis.otomatis else "UTUH", b2 / 1024, b1 / 1024))

    data["desain"].sort(key=lambda d: (d.get("ditambah", ""), d["kode"]), reverse=True)
    data["diperbarui"] = hari_ini
    berkas_data.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n",
                           encoding="utf-8")
    print("\ntotal di etalase: %d desain" % len(data["desain"]))


if __name__ == "__main__":
    main()
