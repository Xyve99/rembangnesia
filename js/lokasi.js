// Kirim lokasi pengunjung ke server statistik.
//
// Gunanya satu: waktu calon pembeli menghubungi CS lewat WhatsApp, tim sudah
// tahu dia ada di mana dan bisa langsung menyebut estimasi ongkir — bukan
// menanyakan alamat dulu lalu menunggu balasan.
//
// Izinnya diminta peramban sendiri begitu halaman dibuka, tanpa banner atau
// teks penjelasan tambahan di halaman. Ada satu akibatnya yang perlu diketahui:
// Safari dan Firefox menolak permintaan lokasi yang tidak didahului sentuhan
// pengunjung, jadi di dua peramban itu permintaannya gagal tanpa suara, dan
// Chrome bisa menampilkan permintaannya dalam bentuk yang lebih kecil.
// Karena itu POST-nya tetap dikirim walaupun koordinatnya tidak didapat.
// Server lalu memakai kota dari IP sebagai gantinya, dan pesan Telegramnya
// menandai sendiri bahwa itu cuma perkiraan — supaya CS tidak pernah
// mengira angka kasar itu sebagai titik rumah orang.
//
// Sekali per sesi tab, sama seperti pencatatan kunjungan di statistik.js.
// Memuat ulang halaman tidak perlu meminta izin lagi (peramban sudah mengingat
// jawabannya) dan tidak perlu mengirim pesan kedua ke Telegram.

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
