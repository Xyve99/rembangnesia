(function () {
  "use strict";

  var WA = "6285166410556";
  var SUMBER = "data/desain.json";
  var KUNCI = "rmbg.pilihan";
  // Desain yang sudah pernah dibuka pengunjung ini. Keterangannya cuma
  // "ditulis" sekali per orang per desain; sesudah itu muncul langsung.
  var KUNCI_LIHAT = "rmbg.lihat";
  var BATAS_LIHAT = 400;
  var BERANDA = "https://xyve99.github.io/rembangnesia/";
  var STAT = window.RMBG_STAT || "";

  var el = {
    galeri: document.querySelector("[data-galeri]"),
    kosong: document.querySelector("[data-kosong]"),
    jumlah: document.querySelector("[data-jumlah]"),
    cari: document.querySelector("[data-cari]"),
    pilihanBar: document.querySelector("[data-pilihan]"),
    terpilih: document.querySelector("[data-terpilih]"),
    kirim: document.querySelector("[data-kirim]"),
    kosongkan: document.querySelector("[data-kosongkan]"),
    halaman: document.querySelector("[data-halaman]"),
    halamanTeks: document.querySelector("[data-halaman-teks]"),
    halPrev: document.querySelector("[data-hal-prev]"),
    halNext: document.querySelector("[data-hal-next]"),
    pratinjau: document.querySelector("[data-pratinjau]"),
    panggung: document.querySelector("[data-panggung]"),
    zoom: document.querySelector("[data-zoom]"),
    pGambar: document.querySelector("[data-pratinjau-gambar]"),
    pKode: document.querySelector("[data-pratinjau-kode]"),
    pDeskripsi: document.querySelector("[data-pratinjau-deskripsi]"),
    pTeks: document.querySelector("[data-pratinjau-teks]"),
    pIsi: document.querySelector("[data-pratinjau-isi]"),
    pTandai: document.querySelector("[data-pratinjau-tandai]"),
    pKirim: document.querySelector("[data-pratinjau-kirim]")
  };

  var semua = [];
  var tampil = [];
  var pilihan = [];
  var halaman = 1;
  var PER_HALAMAN = 12;

  try {
    pilihan = JSON.parse(localStorage.getItem(KUNCI)) || [];
  } catch (_) {
    pilihan = [];
  }

  function simpan() {
    try {
      localStorage.setItem(KUNCI, JSON.stringify(pilihan));
    } catch (_) {}
  }

  function esc(teks) {
    return String(teks == null ? "" : teks).replace(/[&<>"']/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
    });
  }

  function alt(d) {
    return "Mockup desain kaos Rembangnesia, kode " + d.kode;
  }

  function ukuran(d, maks) {
    var w = Math.min(maks, d.lebar || maks);
    var h = d.lebar && d.tinggi
      ? Math.round(w * d.tinggi / d.lebar)
      : Math.round(w / 1.55);
    return {w: w, h: h};
  }

  function cari(kode) {
    for (var i = 0; i < semua.length; i++) {
      if (semua[i].kode === kode) return semua[i];
    }
    return null;
  }

  function tombol(kode, gerak) {
    var dipilih = pilihan.indexOf(kode) !== -1;
    var gambar = dipilih
      ? '<path d="m5 12.5 4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>';
    return '<button class="tandai' + (gerak ? " tandai--gerak" : "") +
      '" type="button" data-tandai="' + esc(kode) +
      '" aria-pressed="' + dipilih + '" aria-label="' +
      (dipilih ? "Hapus tanda pada desain " : "Tandai desain ") + esc(kode) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true">' + gambar + "</svg></button>";
  }

  function kartu(d) {
    var u = ukuran(d, 760);
    return '<figure class="kartu masuk" id="' + esc(d.kode) + '">' +
      '<button class="kartu__buka" type="button" data-buka="' + esc(d.kode) + '">' +
        '<img data-lambat src="img/desain/galeri/' + esc(d.kode) + '.webp" alt="' + esc(alt(d)) +
        '" width="' + u.w + '" height="' + u.h + '" loading="lazy" decoding="async">' +
        '<span class="sr-only">Lihat lebih besar</span>' +
      "</button>" +
      '<figcaption class="kartu__kaki">' +
        '<span class="kartu__kode mono">' + esc(d.kode) + "</span>" +
        tombol(d.kode) +
      "</figcaption></figure>";
  }

  var pengamat = null;
  function siapPengamat() {
    if (!("IntersectionObserver" in window)) return null;
    if (pengamat) return pengamat;
    pengamat = new IntersectionObserver(function (entri) {
      entri.forEach(function (e) {
        if (!e.isIntersecting) return;
        muatGambar(e.target);
        pengamat.unobserve(e.target);
      });
    }, {rootMargin: "400px 0px"});
    return pengamat;
  }

  function muatGambar(img) {
    // data-lambat itu penanda kosong — yang penting ada atau tidak, bukan
    // isinya. Membaca nilainya lalu menolak yang kosong membuat fungsi ini
    // selalu keluar di baris pertama, dan seluruh keadaan "sedang dimuat"
    // tidak pernah menyala.
    if (!img.hasAttribute("data-lambat")) return;
    img.removeAttribute("data-lambat");
    if (img.complete && img.naturalWidth > 0) { img.dataset.muat = "1"; return; }
    img.dataset.muat = "0";
    img.addEventListener("load", function () { img.dataset.muat = "1"; }, {once: true});
    img.addEventListener("error", function () { img.dataset.muat = "error"; }, {once: true});
  }

  function amati() {
    var o = siapPengamat();
    var daftar = el.galeri.querySelectorAll("img[data-lambat]");
    Array.prototype.forEach.call(daftar, function (img) {
      if (o) o.observe(img);
      else muatGambar(img);
    });
  }

  var turun = 0;
  function stagger() {
    var kartu = el.galeri.children;
    for (var i = 0; i < kartu.length; i++) {
      kartu[i].style.animationDelay = (turun ? 0 : Math.min(i * 45, 350)) + "ms";
    }
    turun++;
  }
  var EMO_CARI = "img/emo/kaca.webp";

  function saring() {
    var q = el.cari.value.trim().toLowerCase();
    return semua.filter(function (d) {
      return !q || d.kode.toLowerCase().indexOf(q) !== -1;
    });
  }

  function render() {
    var q = el.cari.value.trim().toLowerCase();
    var cocok = saring();
    var jumlahHalaman = Math.max(1, Math.ceil(cocok.length / PER_HALAMAN));

    if (halaman > jumlahHalaman) halaman = jumlahHalaman;
    if (halaman < 1) halaman = 1;

    var awal = (halaman - 1) * PER_HALAMAN;
    tampil = cocok.slice(awal, awal + PER_HALAMAN);

    el.galeri.innerHTML = tampil.map(kartu).join("");
    el.galeri.hidden = tampil.length === 0;
    el.kosong.hidden = tampil.length > 0;
    if (tampil.length) {
      stagger();
      amati();
    }
    if (!tampil.length) {
      el.kosong.innerHTML = '<img class="emo emo--besar" src="' + EMO_CARI +
        '" alt="" width="64" height="64">' +
        (q ? "Tidak ada kode yang cocok dengan “" + esc(q) + "”."
           : "Belum ada desain di etalase.");
    }

    var satuan = q ? " hasil" : " desain";
    el.jumlah.textContent = jumlahHalaman > 1
      ? (awal + 1) + "–" + (awal + tampil.length) + " dari " + cocok.length + satuan
      : cocok.length + satuan;

    el.halaman.hidden = jumlahHalaman < 2;
    el.halamanTeks.textContent = "Halaman " + halaman + " dari " + jumlahHalaman;
    el.halPrev.disabled = halaman <= 1;
    el.halNext.disabled = halaman >= jumlahHalaman;
  }

  function keHalaman(nomor) {
    halaman = nomor;
    render();
    el.galeri.scrollIntoView({block: "start", behavior: "smooth"});
  }

  function terpilih() {
    return pilihan.map(cari).filter(Boolean);
  }

  var pernahLihat = [];
  try {
    var tersimpan = JSON.parse(localStorage.getItem(KUNCI_LIHAT));
    if (tersimpan && tersimpan.length) pernahLihat = tersimpan;
  } catch (_) {
    // Penyimpanan bisa ditolak (mode privat, data situs diblokir). Daftarnya
    // tetap jalan di memori, jadi dalam satu kunjungan tidak ada aliran yang
    // terputar dua kali — cuma tidak diingat sampai kunjungan berikutnya.
    pernahLihat = [];
  }

  function sudahLihat(kode) {
    return pernahLihat.indexOf(kode) !== -1;
  }

  function tandaiLihat(kode) {
    if (sudahLihat(kode)) return;
    pernahLihat.push(kode);
    if (pernahLihat.length > BATAS_LIHAT) {
      pernahLihat = pernahLihat.slice(pernahLihat.length - BATAS_LIHAT);
    }
    try {
      localStorage.setItem(KUNCI_LIHAT, JSON.stringify(pernahLihat));
    } catch (_) {}
  }

  function bolehGerak() {
    return !(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  var JEDA_TULIS = 2000;   // ms diam dulu, kursor berkedip
  var LAMA_DASAR = 800;
  var LAMA_PER_KATA = 16;
  var LAMA_MAKS = 3600;
  var SINGKAT_LAMA = 850;  // label .55s, teksnya .65s menyusul .14s
  var alirJeda = 0;

  function hentikanAlir() {
    if (alirJeda) { clearTimeout(alirJeda); alirJeda = 0; }
    el.pTeks.removeAttribute("data-alir");
  }

  /* Teksnya dipecah jadi kata dan pemisahnya dibiarkan apa adanya, supaya
     patahan barisnya sama persis dengan teks aslinya. Kata yang belum giliran
     cuma transparan, jadi seluruh paragraf sudah menempati ruangnya sejak awal
     — tingginya final sebelum kata pertama muncul. */
  function pecahKata(teks) {
    var bagian = teks.split(/(\s+)/);
    var serpih = document.createDocumentFragment();
    var kata = [];
    for (var i = 0; i < bagian.length; i++) {
      var s = bagian[i];
      if (!s) continue;
      if (/^\s+$/.test(s)) {
        serpih.appendChild(document.createTextNode(s));
        continue;
      }
      var k = document.createElement("span");
      k.className = "pratinjau__kata";
      k.textContent = s;
      serpih.appendChild(k);
      kata.push(k);
    }
    return {serpih: serpih, kata: kata};
  }

  /* Kursor berkedip dulu, lalu katanya naik satu per satu. Jeda tiap kata
     diberi sedikit acak supaya ritmenya tidak terasa seperti metronom — tapi
     tetap menaik, jadi urutannya tidak pernah tertukar. Selama alirannya
     berjalan tidak ada satu pun pekerjaan per frame: yang berubah cuma
     opacity dan transform tiap kata, dan itu urusan kompositor. */
  /* mode: "" teksnya muncul langsung, "penuh" sandiwara lengkap, "singkat"
     cuma bloknya yang masuk sebentar. */
  function tayangTeks(teks, mode) {
    hentikanAlir();
    el.pIsi.textContent = "";
    if (!teks) return;
    var hasil = pecahKata(teks);
    el.pIsi.appendChild(hasil.serpih);
    if (!mode || !hasil.kata.length) {
      el.pTeks.setAttribute("data-alir", "selesai");
      return;
    }

    if (mode === "singkat") {
      // hentikanAlir() sudah melepas atributnya, tapi kalau nilainya kebetulan
      // sama dengan sebelumnya peramban tidak melihat perubahan apa pun dan
      // animasinya tidak diputar lagi. Satu kali baca tata letak memaksa
      // keadaannya benar-benar kembali dulu.
      void el.pTeks.offsetWidth;
      el.pTeks.setAttribute("data-alir", "singkat");
      // "selesai" dipakai suite untuk tahu kapan semuanya berhenti bergerak,
      // jadi keadaannya harus kembali ke situ di mode ini juga. Animasi yang
      // dilepas di akhir tidak melompat: keadaan dasarnya sama dengan
      // keadaan akhirnya.
      alirJeda = setTimeout(function () {
        alirJeda = 0;
        el.pTeks.setAttribute("data-alir", "selesai");
      }, SINGKAT_LAMA);
      return;
    }

    el.pTeks.setAttribute("data-alir", "menunggu");
    var n = hasil.kata.length;
    var lama = Math.min(LAMA_MAKS, LAMA_DASAR + n * LAMA_PER_KATA);
    var selang = lama / n;
    var jalan = 0;
    for (var j = 0; j < n; j++) {
      jalan += selang * (0.78 + Math.random() * 0.44);
      hasil.kata[j].style.animationDelay = Math.min(jalan, lama).toFixed(1) + "ms";
    }

    alirJeda = setTimeout(function () {
      el.pTeks.setAttribute("data-alir", "menulis");
      alirJeda = setTimeout(function () {
        alirJeda = 0;
        el.pTeks.setAttribute("data-alir", "selesai");
      }, lama + 400);
    }, JEDA_TULIS);
  }

  function pesan(daftar) {
    var baris = daftar.map(function (d, i) {
      return (i + 1) + ". " + d.kode;
    });
    var teks = "Halo kak, saya tertarik dengan desain ini:\n\n" + baris.join("\n");
    // Kode tamu diselipkan di ekor pesan supaya tim bisa mengenali percakapan
    // ini. Disetel tamu.js; kalau entah kenapa belum ada, pesannya tetap jalan.
    if (window.RMBG_TAMU) teks += "\n\nKode: " + window.RMBG_TAMU;
    return teks;
  }

  function tautan(daftar) {
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(pesan(daftar));
  }

  function perbaruiPilihan() {
    var daftar = terpilih();
    el.terpilih.textContent = String(daftar.length);
    el.pilihanBar.setAttribute("data-tampil", daftar.length > 0);
    if (daftar.length) el.kirim.href = tautan(daftar);
  }
  function ganti(kode) {
    var segar = tombol(kode, true);
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-tandai="' + kode + '"]'),
      function (b) { b.outerHTML = segar; }
    );
  }

  function tandai(kode) {
    var i = pilihan.indexOf(kode);
    if (i === -1) pilihan.push(kode);
    else pilihan.splice(i, 1);
    simpan();
    ganti(kode);
    perbaruiPilihan();
  }

  function laporkanKlik(kode, ref) {
    if (!STAT) return;
    try {
      fetch(STAT + "/klik", {
        method: "POST",
        mode: "cors",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({kode: kode, ref: ref}),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  function setZoom(aktif, x, y) {
    var s = el.panggung;
    if (aktif) {
      s.style.height = s.offsetHeight + "px";
      s.classList.add("zoom");
      // Terzoom = wadahnya jadi bisa digeser. Tanpa tabindex, isi yang bisa
      // di-scroll ini cuma terjangkau tetikus — keyboard tidak punya cara
      // menggesernya (axe: scrollable-region-focusable).
      s.setAttribute("tabindex", "0");
      s.scrollLeft = (s.scrollWidth - s.clientWidth) * (x === undefined ? 0.5 : x);
      s.scrollTop = (s.scrollHeight - s.clientHeight) * (y === undefined ? 0.5 : y);
    } else {
      s.classList.remove("zoom", "geser");
      s.removeAttribute("tabindex");
      s.style.height = "";
    }
    el.zoom.setAttribute("aria-pressed", aktif ? "true" : "false");
    el.zoom.setAttribute("aria-label", aktif ? "Kecilkan gambar" : "Perbesar gambar");
  }

  function terzoom() {
    return el.panggung.classList.contains("zoom");
  }

  // Keterangan yang panjang menggulir di dalam kotaknya sendiri. Wadah yang
  // bisa digulir tapi tidak bisa difokuskan cuma terjangkau tetikus (axe:
  // scrollable-region-focusable — sama seperti panggung saat terzoom). Panjang
  // teks beda-beda dan tinggi dialog ikut berubah saat jendela diubah
  // ukurannya, jadi tabindex-nya disetel ulang, bukan dipasang sekali.
  function siapGulirDeskripsi() {
    var kotak = el.pDeskripsi;
    var perlu = el.pratinjau.open && !kotak.hidden &&
      kotak.scrollHeight > kotak.clientHeight + 1;
    if (perlu) kotak.setAttribute("tabindex", "0");
    else kotak.removeAttribute("tabindex");
  }

  function pasangGeser() {
    var s = el.panggung;
    var tarik = false;
    var jauh = 0;
    var mulaiX = 0;
    var mulaiY = 0;
    var kiri = 0;
    var atas = 0;

    s.addEventListener("pointerdown", function (e) {
      if (!terzoom() || e.pointerType === "touch") return;
      tarik = true;
      jauh = 0;
      mulaiX = e.clientX;
      mulaiY = e.clientY;
      kiri = s.scrollLeft;
      atas = s.scrollTop;
      s.classList.add("geser");
      s.setPointerCapture(e.pointerId);
    });

    s.addEventListener("pointermove", function (e) {
      if (!tarik) return;
      var dx = e.clientX - mulaiX;
      var dy = e.clientY - mulaiY;
      jauh = Math.max(jauh, Math.abs(dx) + Math.abs(dy));
      s.scrollLeft = kiri - dx;
      s.scrollTop = atas - dy;
    });

    s.addEventListener("pointerup", function () {
      tarik = false;
      s.classList.remove("geser");
    });

    return function () {
      return jauh > 6;
    };
  }

  function bukaPratinjau(kode) {
    var d = cari(kode);
    if (!d) return;
    laporkanKlik(kode, "pratinjau");
    var u = ukuran(d, 1600);
    el.pKode.textContent = d.kode;
    el.pGambar.width = u.w;
    el.pGambar.height = u.h;
    el.pGambar.alt = alt(d);
    el.pGambar.src = "img/desain/galeri/" + d.kode + ".webp";
    // Gambar yang sudah ada di cache selesai seketika; tanpa cek ini skeletonnya
    // berkedip sekali setiap kali dialog dibuka. Pendengar load/error-nya
    // dipasang sekali di pasang(), bukan di sini.
    el.pGambar.dataset.muat =
      el.pGambar.complete && el.pGambar.naturalWidth > 0 ? "1" : "0";
    el.pTandai.innerHTML = tombol(d.kode);
    el.pKirim.href = tautan([d]);
    // Keterangan ditulis lewat textContent, bukan innerHTML: teksnya datang
    // dari model, jadi tidak boleh ada satu pun bagiannya yang diperlakukan
    // sebagai markup. Baris baru dan tanda "-" tetap tampil utuh karena
    // .pratinjau__teks memakai white-space:pre-line.
    var teks = (d.deskripsi || "").trim();
    el.pDeskripsi.hidden = !teks;
    // Kunjungan pertama ke desain ini memutar sandiwara "baru saja ditulis".
    // Sesudahnya tidak diulang — tapi juga tidak muncul begitu saja: bloknya
    // tetap masuk sebentar. Pengunjung yang minta gerak dikurangi dapat
    // teksnya langsung tanpa keduanya.
    var mode = "";
    if (teks && bolehGerak()) mode = sudahLihat(d.kode) ? "singkat" : "penuh";
    tayangTeks(teks, mode);
    if (mode === "penuh") tandaiLihat(d.kode);
    setZoom(false);
    if (!el.pratinjau.open) el.pratinjau.showModal();
    el.pratinjau.focus();
    // Baru setelah dialognya terbuka ukurannya bisa diukur: selama tertutup
    // displaynya none, jadi scrollHeight dan clientHeight sama-sama nol.
    siapGulirDeskripsi();

    var penuh = new Image();
    penuh.onload = function () {
      if (el.pKode.textContent === d.kode) el.pGambar.src = penuh.src;
    };
    penuh.src = "img/desain/" + d.kode + ".webp";
  }

  function pasang() {
    el.galeri.addEventListener("click", function (e) {
      var buka = e.target.closest("[data-buka]");
      if (buka) {
        laporkanKlik(buka.getAttribute("data-buka"), "galeri");
        bukaPratinjau(buka.getAttribute("data-buka"));
        return;
      }
      var pilih = e.target.closest("[data-tandai]");
      if (pilih) tandai(pilih.getAttribute("data-tandai"));
    });

    var digeser = pasangGeser();

    // Pratinjau memakai keadaan "sedang dimuat" yang sama dengan kartu galeri.
    // Dipasang sekali di sini, bukan tiap kali dibuka, supaya tidak menumpuk
    // pendengar. Versi resolusi penuh yang menyusul belakangan sengaja tidak
    // mengembalikannya ke "0": versi kecilnya sudah terlihat, dan skeleton di
    // atas gambar yang sudah ada cuma berkedip tanpa guna.
    el.pGambar.addEventListener("load", function () { el.pGambar.dataset.muat = "1"; });
    el.pGambar.addEventListener("error", function () { el.pGambar.dataset.muat = "error"; });

    el.pratinjau.addEventListener("click", function (e) {
      if (e.target === el.pratinjau) {
        el.pratinjau.close();
        return;
      }
      if (e.target.closest("[data-tutup]")) {
        el.pratinjau.close();
        return;
      }
      if (e.target.closest("[data-zoom]")) {
        setZoom(!terzoom());
        return;
      }
      if (e.target === el.pGambar) {
        if (digeser()) return;
        if (terzoom()) {
          setZoom(false);
        } else {
          var kotak = el.pGambar.getBoundingClientRect();
          setZoom(true,
            (e.clientX - kotak.left) / kotak.width,
            (e.clientY - kotak.top) / kotak.height);
        }
        return;
      }
      var pilih = e.target.closest("[data-tandai]");
      if (pilih) tandai(pilih.getAttribute("data-tandai"));
    });

    el.pratinjau.addEventListener("close", function () {
      hentikanAlir();
      setZoom(false);
      siapGulirDeskripsi();
    });
    window.addEventListener("resize", siapGulirDeskripsi);

    el.kosongkan.addEventListener("click", function () {
      var lama = pilihan.slice();
      pilihan.length = 0;
      simpan();
      lama.forEach(ganti);
      perbaruiPilihan();
    });

    el.halPrev.addEventListener("click", function () { keHalaman(halaman - 1); });
    el.halNext.addEventListener("click", function () { keHalaman(halaman + 1); });

    el.cari.addEventListener("input", function () {
      halaman = 1;
      render();
    });
  }

  function dariAlamat() {
    var kode = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (!kode || !cari(kode)) return;
    var urutan = saring().map(function (d) { return d.kode; }).indexOf(kode);
    if (urutan >= 0) {
      halaman = Math.floor(urutan / PER_HALAMAN) + 1;
      render();
    }
    bukaPratinjau(kode);
  }

  fetch(SUMBER, {cache: "no-cache"})
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      semua = (data && data.desain) || [];
      render();
      perbaruiPilihan();
      pasang();
      dariAlamat();
    })
    .catch(function () {
      el.galeri.hidden = true;
      el.kosong.hidden = false;
      el.kosong.textContent = "Daftar desain gagal dimuat. Coba muat ulang halaman ini.";
    });
})();
