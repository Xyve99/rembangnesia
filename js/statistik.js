(function () {
  "use strict";

  var STAT = window.RMBG_STAT || "";
  var KUNCI_LIHAT = "rmbg.lihat";

  var el = {
    mata: document.querySelector("[data-mata]"),
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
  var memuat = false;

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
      if (sessionStorage.getItem(KUNCI_LIHAT)) return;
      sessionStorage.setItem(KUNCI_LIHAT, "1");
    } catch (_) {}
    try {
      fetch(STAT + "/lihat", {
        method: "POST",
        mode: "cors",
        headers: {"Content-Type": "application/json"},
        body: "{}",
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
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

  function muat() {
    if (memuat) return;
    memuat = true;
    el.isi.setAttribute("data-sibuk", "1");

    var jalur = rentang ? "/rekap/" + rentang : "/rekap";
    fetch(STAT + jalur, {mode: "cors", cache: "no-store"})
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(tampilkan)
      .catch(function () {
        el.isi.innerHTML = '<p class="statistik__kabar">Statistik sedang tidak bisa dimuat. ' +
          "Coba lagi sebentar lagi.</p>";
      })
      .then(function () {
        memuat = false;
        el.isi.removeAttribute("data-sibuk");
      });
  }

  function kerangka() {
    var petakKosong = '<div class="petak petak--kosong"></div>';
    el.isi.innerHTML = '<div class="petakan">' + petakKosong + petakKosong +
      petakKosong + petakKosong + "</div>";
  }

  el.mata.addEventListener("click", function () {
    kerangka();
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
    kerangka();
    muat();
  });

  catatKunjungan();
})();
