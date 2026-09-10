(function () {
  "use strict";

  var STAT = window.RMBG_STAT || "";
  var KUNCI_LIHAT = "rmbg.lihat";

  var el = {
    mata: document.querySelector("[data-mata]"),
    mataN: document.querySelector("[data-mata-n]"),
    kotak: document.querySelector("[data-statistik]"),
    isi: document.querySelector("[data-statistik-isi]"),
    segmen: document.querySelector(".segmen")
  };

  if (!el.mata || !el.kotak || !el.isi) return;
  if (!STAT) {
    el.mata.hidden = true;
    return;
  }

  var rentang = 0;
  var simpanan = {};

  function esc(teks) {
    return String(teks == null ? "" : teks).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }

  function angka(n) {
    return Number(n || 0).toLocaleString("id-ID");
  }

  // Satu kunjungan dicatat sekali per sesi tab. Server tetap punya
  // pengamannya sendiri (batas laju + jeda IP), ini hanya agar muat ulang
  // biasa tidak menggelembungkan angka tayang.
  function catatKunjungan() {
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
    return '<div class="petak' + (utama ? " petak--utama" : "") + '">' +
      '<span class="petak__n">' + esc(angka(nilai)) + "</span>" +
      '<span class="petak__j">' + esc(judul) + "</span>" +
      (catatan ? '<span class="petak__c">' + esc(catatan) + "</span>" : "") +
      "</div>";
  }

  function daftarTeratas(teratas) {
    if (!teratas || !teratas.length) return "";
    var puncak = teratas[0].jumlah || 1;
    var baris = teratas.slice(0, 10).map(function (d, i) {
      var lebar = Math.max(6, Math.round((d.jumlah / puncak) * 100));
      return '<li class="rangking__baris" style="--i:' + i + '">' +
        '<span class="rangking__bilah" style="width:' + lebar + '%"></span>' +
        '<span class="rangking__urut">' + (i + 1) + "</span>" +
        '<span class="rangking__kode mono">' + esc(d.kode) + "</span>" +
        '<span class="rangking__n">' + esc(angka(d.jumlah)) + "</span>" +
        "</li>";
    });
    return '<h3 class="statistik__sub">Desain paling sering dibuka</h3>' +
      '<ol class="rangking">' + baris.join("") + "</ol>";
  }

  function tampilkan(data) {
    var t = data.tampilan || {};
    var k = data.klik || {};
    var label = rentang ? rentang + " hari terakhir" : "sejak awal";

    var isi = '<div class="petakan">' +
      petak("Pengunjung unik", t.unik, label, true) +
      petak("Kunjungan", t.tayang, label) +
      petak("Unik hari ini", t.unikHari, "24 jam terakhir") +
      petak("Desain dibuka", k.total, angka(k.desain) + " desain berbeda") +
      "</div>" + daftarTeratas(k.teratas);

    if (!t.tayang && !k.total) {
      isi += '<p class="statistik__kabar">Belum ada data pada rentang ini.</p>';
    }
    el.isi.innerHTML = isi;
  }

  // Angka di tombol header: pengunjung unik sejak awal.
  function angkaTombol(data) {
    var n = (data && data.tampilan && data.tampilan.unik) || 0;
    if (!n || !el.mataN) return;
    el.mataN.textContent = angka(n);
    el.mataN.hidden = false;
    el.mata.setAttribute("aria-label",
      "Lihat statistik pengunjung — " + angka(n) + " pengunjung unik");
  }

  function ambil(r) {
    var jalur = r ? "/rekap/" + r : "/rekap";
    return fetch(STAT + jalur, {mode: "cors", cache: "no-store"})
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        simpanan[r] = data;
        if (!r) angkaTombol(data);
        return data;
      });
  }

  function muat() {
    var kunci = rentang;
    var lama = simpanan[kunci];

    // Sudah pernah diambil? Tampilkan seketika, lalu segarkan diam-diam.
    if (lama) tampilkan(lama);
    else kerangka();

    ambil(kunci).then(function (data) {
      if (kunci !== rentang) return;
      if (lama && JSON.stringify(lama) === JSON.stringify(data)) return;
      tampilkan(data);
    }).catch(function () {
      if (kunci !== rentang || lama) return;
      el.isi.innerHTML = '<p class="statistik__kabar">Statistik sedang tidak bisa dimuat. ' +
        "Coba lagi sebentar lagi.</p>";
    });
  }

  function kerangka() {
    var petakKosong = '<div class="petak petak--kosong"></div>';
    el.isi.innerHTML = '<div class="petakan">' + petakKosong + petakKosong +
      petakKosong + petakKosong + "</div>";
  }

  el.mata.addEventListener("click", function () {
    if (!el.kotak.open) el.kotak.showModal();
    el.kotak.focus();
    muat();
  });

  el.kotak.addEventListener("click", function (e) {
    if (e.target === el.kotak || e.target.closest("[data-statistik-tutup]")) {
      el.kotak.close();
      return;
    }
    var pilih = e.target.closest("[data-rentang]");
    if (!pilih) return;
    var nilai = Number(pilih.getAttribute("data-rentang")) || 0;
    if (nilai === rentang) return;
    rentang = nilai;
    Array.prototype.forEach.call(
      el.segmen.querySelectorAll("[data-rentang]"),
      function (b) {
        b.setAttribute("aria-pressed", b === pilih ? "true" : "false");
      }
    );
    muat();
  });

  // Catat kunjungan dulu supaya angka di tombol sudah termasuk kunjungan ini.
  catatKunjungan()
    .then(function () { return ambil(0); })
    .catch(function () {});
})();
