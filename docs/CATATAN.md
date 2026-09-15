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

## Jebakan kaskade yang sudah menggigit tiga kali

Aturan `.banner__scrim` versi sempit **harus** berada setelah aturan dasarnya.
Spesifisitasnya sama, jadi yang menang adalah yang belakangan di sumber. Kalau
media query dipindah ke atas, scrim vertikal untuk mobile tidak akan pernah aktif.

Hal serupa: `.banner__inner` juga ber-class `.shell`, yang punya
`margin-inline:auto`. Memberi `max-width` ke elemen itu akan menengahkannya
kembali; batasi anaknya (`.banner__inner > *`) sebagai gantinya.

Yang ketiga beda jenisnya: aturan bawaan peramban bukan sekadar spesifisitas
rendah, tapi **selalu kalah** dari aturan penulis. `<dialog>` yang tertutup
disembunyikan oleh `dialog:not([open]){display:none}` bawaan peramban — jadi
begitu ada aturan penulis yang menyetel `display` pada dialognya (di sini
`.pratinjau{display:flex}` supaya isinya bisa dibagi tinggi), dialog tertutup
tetap tergambar dan **tetap menerima klik**. Karena `.pratinjau` juga
`opacity:0` saat tertutup, gejalanya menipu: halamannya kelihatan normal, tapi
seluruh galeri tidak bisa diklik lagi setelah pratinjau pernah dibuka. Yang
menutupi kartu tidak terlihat. Penawarnya satu baris, `.pratinjau:not([open]){display:none}`,
dan animasi tutupnya tetap jalan karena `display` ada di daftar `transition`
dengan `allow-discrete`.

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

`tools/check.js` mengaudit dua halaman — etalase (`npm run check`) dan halaman
profil (`npm run check:profil`) — dan mencatat: pelanggaran axe (WCAG 2 A/AA +
2.1/2.2 AA), kontras di bawah 4.5:1 (3:1 untuk teks besar) pada 38 pengukuran di
etalase dan 181–187 di halaman profil, target sentuh di bawah 44px, overflow
horizontal, dan error konsol. Di etalase, per commit terakhir: nol kontras
gagal, nol error konsol, nol overflow, nol pelanggaran WCAG di 7 viewport
termasuk mode gelap. Sisa satu pelanggaran `region` (best-practice) dan satu
target 42×34px, keduanya tercatat sebagai utang di bawah.

Kontras banner diukur dengan cara yang lebih keras daripada axe: `bg.js`
menyembunyikan teksnya lalu memotret latar, `contrast.py` menghitung rasio
terhadap **piksel latar terburuk di dalam kotak setiap blok teks**, bukan
terhadap warna latar yang dideklarasikan. Kasus terburuk 6.03:1.

## Warna teks: kenapa cuma dua tingkat

Yang mengikat nilai `--label-2` bukan permukaan yang paling sering terlihat,
tapi permukaan **tergelap** yang pernah ia tempati. Delapan permukaan berbeda
memakainya, dan yang paling gelap adalah `.petak--utama`: tint
`rgba(0,122,255,.1)` menumpuk di atas `--bg` dan menghasilkan #DAE6F8, lebih
gelap daripada putihnya kartu.

| permukaan | #6A6A70 (lama) | #64646A (sekarang) |
|---|---|---|
| kartu putih | 5.37:1 | 5.88:1 |
| body / `.petak` (#F2F2F7) | 4.82:1 | 5.27:1 |
| `.petak--utama` (#DAE6F8) | **4.26:1** | 4.66:1 |
| `.mata` (isian di atas bilah kaca) | **4.21:1** | 4.60:1 |

Nilai lama lulus di kartu dan di body, lalu jatuh di dua permukaan tergelap.
Yang kedua bahkan tidak pernah muncul di suite: tombol Sekilas baru ada kalau
server statistik menjawab, sedangkan audit memadamkannya supaya angka
pengunjung pemilik etalase tidak tercemar lalu lintas audit.

Tingkat teks ketiga tidak mungkin ada. Mencari 4.5:1 untuk teks 12px memaksa
nilai ketiga sama persis dengan `--label-2`. Jadi `--label-3` dihapus, dan
sisanya yang memang dekoratif dinamai `--panah` — panah bukan teks, ambangnya
3:1, bukan 4.5:1. Membiarkan nama berawalan "label" untuk warna yang tidak boleh
dipakai sebagai teks adalah jebakan yang menunggu dipakai ulang.

`--label-2` sengaja warna solid, bukan alpha. Di atas permukaan kaca
(`backdrop-filter`) hasil komposit alpha bergantung pada isi halaman di
belakangnya dan berubah saat digulir, sedangkan warna solid memberi rasio yang
sama di mana pun.

Dua catatan soal alat ukurnya, karena keduanya buta di tempat yang berbeda:

- axe benar menghitung latar ber-alpha, tapi melewatkan isi dialog yang tertutup
  (`display:none`) dan menandai permukaan kaca sebagai `incomplete`. Justru di
  dalam dialog itu teks terkecil halaman berada, jadi suite membuka dialognya
  dulu baru mengukur.
- `ukurKontras()` di `tools/check.js` menghitung dari warna yang
  **dideklarasikan** dan menandai latar bergambar sebagai `over`, jadi ia buta
  terhadap alpha. Ia tidak boleh jadi satu-satunya hakim: `.petak__c` di dalam
  `.petak--utama` hanya tertangkap axe, sedangkan `.btn` di dalam dialog
  tertutup hanya tertangkap `ukurKontras()`.

Wadah pratinjau yang terzoom (`[data-panggung].zoom`) diberi `tabindex` oleh
`setZoom()` supaya isinya bisa digeser dengan keyboard. Tanpa itu axe
menandainya `scrollable-region-focusable`.

## Keterangan desain dari AI

Teksnya ditulis `bukaPratinjau()` lewat `textContent`, **tidak pernah**
`innerHTML`: isinya datang dari model, jadi tidak boleh ada satu bagian pun yang
diperlakukan sebagai markup. Baris baru dan tanda "-" tetap tampil apa adanya
karena `.pratinjau__teks` memakai `white-space:pre-line`.

Saat muncul, blok ini menambah satu isi lagi ke dalam dialog — dan `.pratinjau`
memakai `overflow:hidden`, jadi yang meluber bukan cuma terpotong, tapi tidak
bisa dijangkau sama sekali. Karena itu `.pratinjau` dijadikan flex kolom:
gambar, strip peringatan, dan kaki dialog `flex:0 0 auto` (tidak boleh
menyusut), sedangkan keterangan yang `flex:0 1 auto` berikut `overflow-y:auto`.
Keterangan yang panjang menggulir di dalam kotaknya sendiri; kaki dialog tetap
di tempatnya. Tinggi gambar ikut dikorbankan lewat `:has()` saat keterangannya
ada.

Kotak yang menggulir itu juga perlu `tabindex`, sama seperti panggung terzoom —
tapi panjang teksnya berbeda-beda per desain dan tinggi dialog ikut berubah
saat jendela diubah ukurannya, jadi `siapGulirDeskripsi()` menyetel ulang
atributnya alih-alih memasangnya sekali. Diukur setelah `showModal()`, sebab
selama tertutup `display`-nya `none` dan `scrollHeight` sama dengan
`clientHeight`.

## Utang yang diketahui

Bilah pilihan melayang (`.pilihan`) berdiri di luar landmark mana pun, jadi axe
menandainya `region` (best-practice, bukan WCAG). Perbaikannya entah
memindahkannya ke dalam `<main>` atau memberinya `role="region"` berikut
`aria-label`. Dua node yang sama, satu perbaikan.

Tombol Sekilas (`.mata`) berukuran 42×34px, di bawah ambang 44px yang dipakai
suite ini — walaupun lolos minimum 24×24 WCAG 2.2 AA. Menjadikannya 44px tinggi
akan mengubah tinggi bilah header yang sekarang sejajar dengan logo 32px, jadi
ini ditunda sampai ada alasan selain angka.

Video hero membawa watermark "Dola AI" di kanan bawah, terlihat di atas strip
statistik gelap. Menghilangkannya perlu crop ~4% dari sisi bawah lalu transcode
ulang dan naikkan tag aset ke `v3`.
