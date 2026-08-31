# Catatan desain & aksesibilitas

Berkas ini merekam keputusan yang tidak terbaca dari kodenya sendiri, supaya
perubahan berikutnya tidak mengulang kesalahan yang sudah pernah diperbaiki.

## Asal rancangan

Struktur "blade" (bilah bergantian bone / flood / indigo) dan masthead video
mengikuti pola playvalorant.com/id-id, tetapi seluruh implementasinya ditulis
ulang dan memperbaiki cacat yang ditemukan saat audit situs itu: merah di atas
bone yang cuma 2.75:1, `alt` kosong pada gambar bermakna, focus ring hilang,
slide `aria-hidden` yang masih bisa difokus, kolom pencarian tanpa label, dan
`prefers-reduced-motion` yang diabaikan. Header dan footer sengaja dibuat
berbeda.

## Tema tiga keadaan

`:root` telanjang = terang. Mode gelap otomatis lewat
`@media (prefers-color-scheme:dark)` yang **dijaga** `:root:not([data-theme="light"])`,
plus penimpaan manual `:root[data-theme="dark"]`. Urutan ini yang membuat tombol
tema bisa mengalahkan preferensi sistem tanpa `!important`.

## Jebakan kaskade yang sudah menggigit dua kali

Aturan `.banner__scrim` versi sempit **harus** berada setelah aturan dasarnya.
Spesifisitasnya sama, jadi yang menang adalah yang belakangan di sumber. Kalau
media query dipindah ke atas, scrim vertikal untuk mobile tidak akan pernah aktif.

Hal serupa: `.banner__inner` juga ber-class `.shell`, yang punya
`margin-inline:auto`. Memberi `max-width` ke elemen itu akan menengahkannya
kembali; batasi anaknya (`.banner__inner > *`) sebagai gantinya.

## Titik putus banner

Foto lebar (3.2:1) baru dipakai dari `min-width:1100px`, bukan 760px. Panel
setinggi 1.65:1 yang diisi foto 3.2:1 secara cover-fit akan memotong separuh
lebarnya, sehingga rentang 768–1099px dulu hanya menampilkan kain yang
diperbesar. Di bawah 1100px dipakai crop persegi, dan panel diberi pita foto
lewat `padding-block` bawah yang besar supaya gambarnya punya ruang bernapas
di bawah CTA.

## Video hero

Rekaman sumbernya di-grade gelap, jadi elemen videonya sendiri diberi
`filter:brightness(1.26) contrast(1.04) saturate(1.08)`. Scrim-nya **tidak** rata
menutup panel: washnya terkonsentrasi di belakang copy (x 27-73%, y 15-63% di
desktop) dan bersih total ke tepi frame, karena di tepi tidak ada yang perlu
tetap terbaca. Versi `max-width:900px` lebih tinggi dan lebih lebar sebab di
viewport sempit copy-nya melebar hampir penuh dan CTA turun ke y 55-62%.
Hasilnya panel cuma 37% lebih gelap dari rekaman mentah, bukan 50% seperti versi
pertama.

Scrim-nya **bukan** elips terpusat. Versi sebelumnya memakai
`radial-gradient(56% 42% at 50% 38%, ...)` yang falloff-nya berakhir di dalam
frame, dan mata langsung membacanya sebagai gumpalan gelap di belakang copy —
persis keluhan "masih ada shadow di text header". Sekarang: satu band vertikal
rata plus vignette tepi `radial-gradient(140% 120% ...)` yang kedua falloff-nya
terpotong tepi frame, jadi washnya tidak punya batas yang terlihat. Karena tidak
lagi bergantung pada posisi copy, tidak perlu breakpoint terpisah.

Wash rata sepenuhnya (satu alpha untuk seluruh panel) sudah dicoba dan gagal:
pada alpha .58 pun teksnya cuma 2.88:1. Band vertikal perlu, karena copy-nya
memang duduk di paruh atas.

Pelajaran yang mahal: **ukur kontras di banyak frame, bukan satu frame.** Ketika
scrim dilonggarkan, satu frame diam terlihat lolos, tapi frame sablon oranye
terang di detik ~2 menjatuhkan tombol `.btn--ghost` yang transparan ke 2.09:1.
Perbaikannya memberi tombol itu latar sendiri (`rgba(11,16,23,.62)` +
`backdrop-filter`) daripada menggelapkan seluruh panel lagi. Verifikasi sekarang
menyisir 14 frame di sepanjang loop pada 6 viewport; margin tersempit 4.94:1.

Autoplay, muted, loop, tanpa tombol kontrol. Ini sah menurut WCAG 2.2.2 karena
loopnya dekoratif — tidak membawa informasi apa pun yang tidak sudah ada di
teks. Pengunjung dengan `prefers-reduced-motion: reduce` mendapat frame poster:
atribut `autoplay` dilepas dan videonya di-pause, dan itu dievaluasi ulang kalau
preferensinya berubah saat halaman terbuka. `IntersectionObserver` mem-pause
dekoder begitu hero keluar dari viewport, dan melanjutkannya saat kembali.

HEVC tidak bisa diputar peramban mana pun (`canPlayType('hvc1')` mengembalikan
string kosong). Master aslinya HEVC, jadi diturunkan ke VP9/WebM dan H.264/MP4
dengan GStreamer.

## Ambang yang dijaga suite

`tools/check.js` gagal kalau ada: pelanggaran axe (WCAG 2 A/AA + 2.1/2.2 AA),
kontras di bawah 4.5:1 (3:1 untuk teks besar) pada 181–187 pengukuran, target
sentuh di bawah 44px, overflow horizontal, atau error konsol. Semuanya nol per
commit terakhir, di 7 viewport termasuk mode gelap.

Kontras banner diukur dengan cara yang lebih keras daripada axe: `bg.js`
menyembunyikan teksnya lalu memotret latar, `contrast.py` menghitung rasio
terhadap **piksel latar terburuk di dalam kotak setiap blok teks**, bukan
terhadap warna latar yang dideklarasikan. Kasus terburuk 6.03:1.

## Utang yang diketahui

Video hero membawa watermark "Dola AI" di kanan bawah, terlihat di atas strip
statistik gelap. Menghilangkannya perlu crop ~4% dari sisi bawah lalu transcode
ulang dan naikkan tag aset ke `v3`.
