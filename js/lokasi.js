// Catat asal kunjungan ke server statistik, bagian dari pencatatan pengunjung.
//
// Izinnya diminta peramban sendiri begitu halaman dibuka, tanpa banner atau
// teks penjelasan tambahan di halaman. Ada satu akibatnya yang perlu diketahui:
// Safari dan Firefox menolak permintaan yang tidak didahului sentuhan
// pengunjung, jadi di dua peramban itu permintaannya gagal tanpa suara, dan
// Chrome bisa menampilkannya dalam bentuk yang lebih kecil. Karena itu POST-nya
// tetap dikirim walaupun koordinatnya tidak didapat; server lalu memakai kota
// dari IP sebagai gantinya.
//
// Sekali per sesi tab, sama seperti pencatatan kunjungan di statistik.js.
// Memuat ulang halaman tidak meminta izin lagi (peramban sudah mengingat
// jawabannya) dan tidak mengirim catatan kedua.

(function () {
  "use strict";

  var STAT = window.RMBG_STAT || "";
  var KUNCI = "rmbg.lokasi";
  var JEDA = 12000;   // milidetik; sinyal lambat jangan dipaksa menunggu

  if (!STAT) return;

  try {
    if (sessionStorage.getItem(KUNCI)) return;
    sessionStorage.setItem(KUNCI, "1");
  } catch (_) {}

  function kirim(data) {
    // Kode tamu yang sama dengan yang tertulis di pesan WhatsApp, supaya
    // catatan ini bisa dicocokkan dengan chat yang masuk. Disetel tamu.js.
    if (window.RMBG_TAMU) data.tamu = window.RMBG_TAMU;
    try {
      fetch(STAT + "/lokasi", {
        method: "POST",
        mode: "cors",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  if (!navigator.geolocation) {
    kirim({});
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      kirim({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        akurasi: Math.round(pos.coords.accuracy)
      });
    },
    function () {
      // Ditolak, diabaikan, atau kehabisan waktu. Tetap lapor: servernya yang
      // memutuskan apakah masih ada yang bisa dipakai dari IP pengunjung.
      kirim({});
    },
    {enableHighAccuracy: true, timeout: JEDA, maximumAge: 300000}
  );
})();
