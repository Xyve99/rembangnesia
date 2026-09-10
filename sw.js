// Service worker etalase Rembangnesia.
//
// Dua sifat berbeda untuk dua jenis berkas:
//
//   Gambar desain  -> cache-first. Isinya tidak pernah berubah (satu kode =
//                     satu gambar selamanya), jadi sekali diunduh tidak perlu
//                     menyentuh jaringan lagi. Ini yang bikin kunjungan kedua
//                     terasa seketika, apalagi di HP dengan sinyal pas-pasan.
//
//   Kode & data    -> network-first. HTML, CSS, JS, dan desain.json selalu
//                     dicoba dari jaringan dulu (dengan revalidasi paksa,
//                     supaya cache HTTP GitHub Pages yang 10 menit itu tidak
//                     ikut menahan versi lama). Salinan cache hanya dipakai
//                     kalau jaringan gagal — jadi tidak ada cerita berkas
//                     lama nyangkut, sekaligus etalase tetap bisa dibuka
//                     waktu sinyal putus.
//
// Statistik pengunjung (beda origin) sengaja dilewatkan begitu saja: angkanya
// harus selalu segar dan permintaannya POST.

const VERSI = "2026-09-10a";   // naikkan tiap deploy -> cache kode lama dibuang
const VERSI_GAMBAR = "1";      // naikkan HANYA bila ada gambar diganti isi dengan nama sama

const KODE = "rmbg-kode-" + VERSI;
const GAMBAR = "rmbg-gambar-" + VERSI_GAMBAR;
const BATAS_GAMBAR = 180;

const LURING = '<!doctype html><html lang="id"><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Tidak ada koneksi</title>' +
  '<body style="margin:0;display:grid;place-items:center;min-height:100dvh;' +
  'background:#F2F2F7;color:#1C1C1E;font:17px/1.5 -apple-system,system-ui,sans-serif;' +
  'text-align:center;padding:24px">' +
  '<div><p style="font-size:22px;font-weight:600;margin:0 0 6px">Tidak ada koneksi</p>' +
  '<p style="margin:0;color:rgba(60,60,67,.6)">Sambungkan internet lalu muat ulang halaman ini.</p></div>';

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    const nama = await caches.keys();
    await Promise.all(nama.map(function (n) {
      if (n.startsWith("rmbg-kode-") && n !== KODE) return caches.delete(n);
      if (n.startsWith("rmbg-gambar-") && n !== GAMBAR) return caches.delete(n);
      return Promise.resolve();
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // statistik & font: lewat

  if (url.pathname.indexOf("/img/") !== -1) {
    e.respondWith(dariGambar(req));
    return;
  }
  e.respondWith(dariJaringan(req));
});

// Gambar: pakai salinan kalau ada, kalau belum ambil lalu simpan.
async function dariGambar(req) {
  const cache = await caches.open(GAMBAR);
  const simpan = await cache.match(req);
  if (simpan) return simpan;

  try {
    const balas = await fetch(req);
    if (balas.ok && balas.type === "basic") {
      cache.put(req, balas.clone()).then(function () { rapikan(cache); },
                                         function () {});
    }
    return balas;
  } catch (_) {
    return Response.error();
  }
}

// Simpanan gambar dibatasi supaya tidak tumbuh tanpa henti; yang paling lama
// masuk dibuang lebih dulu.
async function rapikan(cache) {
  const kunci = await cache.keys();
  const lebih = kunci.length - BATAS_GAMBAR;
  for (let i = 0; i < lebih; i++) await cache.delete(kunci[i]);
}

// Kode & data: jaringan dulu, cache cuma jaring pengaman.
async function dariJaringan(req) {
  const cache = await caches.open(KODE);
  try {
    // Permintaan navigasi tidak boleh dibuat ulang dengan init, jadi
    // dilewatkan apa adanya; sisanya dipaksa revalidasi ke server.
    const balas = req.mode === "navigate"
      ? await fetch(req)
      : await fetch(req, {cache: "no-cache"});
    if (balas.ok && balas.type === "basic") {
      cache.put(req, balas.clone()).catch(function () {});
    }
    return balas;
  } catch (_) {
    const simpan = await cache.match(req);
    if (simpan) return simpan;

    if (req.mode === "navigate") {
      const beranda = await cache.match("./index.html") || await cache.match("./");
      if (beranda) return beranda;
      return new Response(LURING, {
        status: 503,
        headers: {"Content-Type": "text/html; charset=utf-8"}
      });
    }
    return Response.error();
  }
}
