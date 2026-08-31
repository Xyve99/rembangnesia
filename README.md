# Rembangnesia

Halaman profil **konveksi & sablon Rembangnesia** — Sale, Kabupaten Rembang, Jawa Tengah.

**Live:** <https://xyve99.github.io/rembangnesia/>

Satu berkas HTML, tanpa build step dan tanpa dependensi runtime. Semua CSS dan JS
inline di `index.html`; aset media dilayani dari CDN jsDelivr.

---

## Melanjutkan proyek ini di komputer lain

Yang wajib ada: **git** dan **Node.js 18+**. Python 3 hanya perlu kalau kamu mau
menjalankan ulang pengukuran gambar banner.

```bash
git clone https://github.com/Xyve99/rembangnesia.git
cd rembangnesia
```

Untuk sekadar melihat atau menyunting halaman, itu sudah cukup — buka
`index.html` langsung di peramban. Untuk menjalankan suite verifikasi:

```bash
npm install              # playwright
npx playwright install chromium
npm run check            # audit index.html lokal
npm run check:live       # audit URL produksi
```

Hasil audit ditulis ke `out/` (di-ignore git): `rmbcheck.json` plus ratusan PNG.

Menyunting lalu deploy:

```bash
# sunting index.html
npm run check            # pastikan masih 0 pelanggaran
git add index.html && git commit -m "..." && git push
```

GitHub Pages membangun ulang otomatis dari branch `main` dalam ~1 menit.

---

## Struktur

| Berkas | Isi |
|---|---|
| `index.html` | Seluruh halaman: 7 blok `<style>` di `<head>`, 2 blok `<script>` di akhir `<body>`. |
| `tools/check.js` | Suite verifikasi: axe-core, kontras, overflow, focus ring, form, drawer, tema, reduced-motion. |
| `tools/banner.js`, `bg.js`, `contrast.py` | Mengukur banner `#bonus` di 10 viewport dan kontras teks terhadap piksel latar sungguhan. |
| `tools/imgstat.py`, `crop.py`, `encode.py`, `quality.py` | Pipeline foto: statistik luma, crop cover-fit, sweep kualitas WebP/JPEG, PSNR. |
| `assets-src/` | Foto banner asli (`desktop.png`, `mobile.png`) sebelum di-crop dan di-encode. |
| `docs/` | Catatan keputusan desain dan aksesibilitas. |

`index.html` ditandai komentar `<!-- CHUNK:… -->` (CSS2–CSS6, HERO, ORDERS,
BANNER, TENTANG, KEUNGGULAN, ALUR, WORKSHOP, KONTAK, FOOT, JS, VIDEO) supaya
mudah menemukan bagian yang mau disunting di berkas sepanjang ~1900 baris.

---

## Aset media

Video hero dan foto banner **tidak** disimpan di repo ini — ukurannya besar dan
GitHub Pages bukan CDN video. Semuanya ada di repo terpisah
[`Xyve99/rembangnesia-assets`](https://github.com/Xyve99/rembangnesia-assets)
dan dilayani lewat jsDelivr dengan `cache-control: immutable`:

```
https://cdn.jsdelivr.net/gh/Xyve99/rembangnesia-assets@v1/rembangnesia-hero.webm
https://cdn.jsdelivr.net/gh/Xyve99/rembangnesia-assets@v1/rembangnesia-hero.mp4
https://cdn.jsdelivr.net/gh/Xyve99/rembangnesia-assets@v1/poster.jpg
https://cdn.jsdelivr.net/gh/Xyve99/rembangnesia-assets@v2/bonus-wide.webp    (2240x700)
https://cdn.jsdelivr.net/gh/Xyve99/rembangnesia-assets@v2/bonus-square.webp  (1200x1200)
```

Mengganti aset: push berkas baru ke repo aset itu, buat **tag baru** (`v3`, dst),
lalu perbarui URL di `index.html`. Jangan menimpa tag lama — jsDelivr meng-cache
tag secara permanen, jadi perubahan di tag yang sama tidak akan pernah terlihat.

---

## Kontak yang tertanam di halaman

WhatsApp `6281228775353`. Form pesanan **tidak** mengirim apa pun ke server; ia
menyusun teks lalu membuka `wa.me` di tab baru supaya pengunjung bisa memeriksa
pesannya sebelum menekan kirim. Tidak ada backend, tidak ada cookie pelacak.
