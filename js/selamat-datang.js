(function () {
  "use strict";

  var KUNCI = "rmbg.masuk";
  var layar = document.querySelector("[data-selamat-datang]");
  if (!layar) return;

  try {
    if (sessionStorage.getItem(KUNCI)) return;
  } catch (_) {}

  var tombol = layar.querySelector("[data-masuk]");
  var detik = layar.querySelector("[data-detik]");
  var hitung = null;

  layar.hidden = false;
  document.body.style.overflow = "hidden";

  function buka() {
    if (hitung) { clearInterval(hitung); hitung = null; }
    try { sessionStorage.setItem(KUNCI, "1"); } catch (_) {}
    tombol.disabled = true;
    layar.classList.add("pergi");
    document.body.style.overflow = "";
    setTimeout(function () { layar.hidden = true; }, 450);
  }

  tombol.addEventListener("click", buka);

  var sisa = 5;
  detik.textContent = "Masuk otomatis dalam " + sisa + " detik…";
  hitung = setInterval(function () {
    sisa--;
    if (sisa <= 0) { buka(); return; }
    detik.textContent = "Masuk otomatis dalam " + sisa + " detik…";
  }, 1000);
})();
