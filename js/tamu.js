// Kode tamu pengunjung, satu per perangkat.
//
// Penanda acak yang ikut tertulis di pesan WhatsApp, supaya tim bisa mengenali
// percakapan yang masuk. Disimpan di localStorage, bukan sessionStorage, jadi
// kunjungan berikutnya dari perangkat yang sama tetap memakai kode yang sama.
// Bukan pengenal pribadi — cuma penanda untuk merapikan antrean chat.

(function () {
  "use strict";

  var KUNCI = "rmbg.tamu";
  // Tanpa O/0 dan I/1/L: kode ini dibacakan orang lewat chat dan diketik ulang
  // CS, jadi karakter yang mudah tertukar dibuang supaya tidak salah cari.
  var ABJAD = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var PANJANG = 4;

  function acak(n) {
    var hasil = "";
    var i;
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint32Array(n);
        window.crypto.getRandomValues(buf);
        for (i = 0; i < n; i++) hasil += ABJAD[buf[i] % ABJAD.length];
        return hasil;
      }
    } catch (_) {}
    // Peramban lawas tanpa crypto: Math.random sudah cukup, kodenya bukan
    // rahasia dan tabrakan pun tidak berbahaya.
    for (i = 0; i < n; i++) {
      hasil += ABJAD[Math.floor(Math.random() * ABJAD.length)];
    }
    return hasil;
  }

  function sah(kode) {
    return typeof kode === "string" && /^TAMU-[A-Z0-9]{4}$/.test(kode);
  }

  var kode = "";
  try {
    kode = localStorage.getItem(KUNCI) || "";
  } catch (_) {}

  if (!sah(kode)) {
    kode = "TAMU-" + acak(PANJANG);
    try {
      localStorage.setItem(KUNCI, kode);
    } catch (_) {}
  }

  window.RMBG_TAMU = kode;
})();
