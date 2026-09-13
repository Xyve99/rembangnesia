// Panel "Sekilas" di header etalase.
//
// Dulu panel ini menampilkan angka pengunjung dari server statistik. Angka
// itu tidak lagi dipajang ke pengunjung: yang tampil hanya fakta yang benar-
// benar bisa dipertanggungjawabkan — jumlah desain (dibaca dari
// data/desain.json) dan daftar layanan. Tidak ada angka yang dikarang.
//
// Pencatatan kunjungan dan klik tetap jalan seperti biasa; itu alat pemilik
// etalase lewat bot Telegram (/klik), bukan tontonan pengunjung.

(function () {
  "use strict";

  var STAT = window.RMBG_STAT || "";
  var SUMBER = "data/desain.json";
  var KUNCI_LIHAT = "rmbg.lihat";

  // Disalin dari halaman profil. Kalau daftar layanan di sana berubah,
  // ubah juga di sini — angkanya dipakai sebagai jumlah jenis layanan.
  var LAYANAN = [
    "Kaos Sablon Premium",
    "Kaos Sablon THR",
    "PDH & Kemeja Bordir",
    "Polo Shirt Bordir / Sablon",
    "Jersey Full Printing",
    "Seragam Olahraga Sekolah"
  ];

  var el = {
    mata: document.querySelector("[data-mata]"),
    kotak: document.querySelector("[data-statistik]"),
    isi: document.querySelector("[data-statistik-isi]"),
    jml: document.querySelector("[data-jumlah]")
  };

  if (!el.mata || !el.kotak || !el.isi) return;

  var jumlah = null;   // jumlah desain; null selama belum diketahui

  function esc(teks) {
    return String(teks == null ? "" : teks).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }

  function angka(n) {
    return Number(n || 0).toLocaleString("id-ID");
  }

  // Satu kunjungan dicatat sekali per sesi tab. Tidak ada kaitannya dengan
  // yang tampil di panel — ini murni untuk pemilik etalase.
  function catatKunjungan() {
    if (!STAT) return Promise.resolve();
    try {
      if (sessionStorage.getItem(KUNCI_LIHAT)) return Promise.resolve();
      sessionStorage.setItem(KUNCI_LIHAT, "1");
    } catch (_) {}
    return fetch(STAT + "/lihat", {
      method: "POST",
      mode: "cors",
      headers: {"Content-Type": "application/json"},
      body: "{}",
      keepalive: true
    }).catch(function () {});
  }

  function petak(judul, nilai, catatan, utama) {
    var tampil = typeof nilai === "number" ? angka(nilai) : nilai;
    return '<div class="petak' + (utama ? " petak--utama" : "") + '">' +
      '<span class="petak__n">' + esc(tampil) + "</span>" +
      '<span class="petak__j">' + esc(judul) + "</span>" +
      (catatan ? '<span class="petak__c">' + esc(catatan) + "</span>" : "") +
      "</div>";
  }

  function daftarLayanan() {
    var baris = LAYANAN.map(function (nama, i) {
      return '<li class="rangking__baris" style="--i:' + i + '">' +
        '<span class="rangking__urut">' + (i + 1) + "</span>" +
        '<span class="rangking__kode">' + esc(nama) + "</span>" +
        "</li>";
    });
    return '<h3 class="statistik__sub">Layanan kami</h3>' +
      '<ol class="rangking">' + baris.join("") + "</ol>";
  }

  function kerangka() {
    var kosong = '<div class="petak petak--kosong"></div>';
    el.isi.innerHTML = '<div class="petakan">' + kosong + kosong +
      kosong + kosong + "</div>";
  }

  function tampilkan() {
    if (jumlah === null) {
      kerangka();
      return;
    }
    el.isi.innerHTML = '<div class="petakan">' +
      petak("Desain sudah diproduksi", jumlah, "siap dipesan ulang", true) +
      petak("Jenis layanan", LAYANAN.length, "kaos sampai seragam sekolah") +
      petak("Mulai per potong", "30rb", "kaos sablon THR") +
      petak("Konsultasi desain", "Gratis", "sebelum memesan") +
      "</div>" + daftarLayanan();
  }

  // Jumlah desain dibaca dari sumber yang sama dengan galeri, bukan
  // ditulis tangan — biar tidak pernah basi saat ada desain baru.
  function muat() {
    fetch(SUMBER, {cache: "no-cache"})
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.desain && data.desain.length) {
          jumlah = data.desain.length;
        }
        if (el.kotak.open) tampilkan();
      })
      .catch(function () {
        // Jaringan gagal: pakai angka yang sudah tertulis di halaman galeri.
        var cocok = el.jml && /(\d[\d.]*)/.exec(el.jml.textContent);
        if (cocok) jumlah = Number(cocok[1].replace(/\./g, ""));
        if (el.kotak.open) tampilkan();
      });
  }

  el.mata.addEventListener("click", function () {
    if (!el.kotak.open) el.kotak.showModal();
    el.kotak.focus();
    tampilkan();
  });

  el.kotak.addEventListener("click", function (e) {
    if (e.target === el.kotak || e.target.closest("[data-statistik-tutup]")) {
      el.kotak.close();
    }
  });

  catatKunjungan();
  muat();
})();
