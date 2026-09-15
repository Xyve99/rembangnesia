// Suite verifikasi etalase & halaman profil Rembangnesia.
//
// Halaman dilayani server statis di dalam proses ini, bukan dibuka sebagai
// file://. Chromium menolak fetch() lintas skema, jadi dari file://
// data/desain.json tidak pernah termuat dan galeri selalu tampil kosong —
// yang diaudit harus halaman yang benar-benar berjalan.
//
//   (bawaan)        -> index.html        (etalase)
//   TARGET=profil   -> profil/index.html
//   URL=...         -> audit alamat itu, server lokal tidak dipakai
//                      (dipakai `npm run check:live`)
//
// Tiap blok interaksi dibungkus try/catch dan laporan ditulis di blok finally:
// satu selector yang meleset tidak boleh membatalkan seluruh hasil audit.

const {chromium}=require('playwright');
const fs=require('fs');
const http=require('http');
const path=require('path');

const AKAR=path.resolve(__dirname,'..');
const OUT=process.env.OUT||'out';
fs.mkdirSync(OUT,{recursive:true});

const AXE=fs.readFileSync(path.join(__dirname,'axe.min.js'),'utf8');
const TARGET=process.env.TARGET||'etalase';
// Alamat server statistik dibaca dari halaman, bukan ditulis ulang di sini,
// supaya tidak ada dua sumber yang bisa saling menyimpang.
const STAT=(fs.readFileSync(path.join(AKAR,'index.html'),'utf8')
  .match(/RMBG_STAT\s*=\s*"([^"]+)"/)||[])[1]||'';
const VPS=[['m-390',390,844,true],['m-320',320,658,true],['t-768',768,1024,true],['d-1366',1366,768,false],['d-1440',1440,900,false],['w-1920',1920,1080,false]];
const out={};
let F='';   // alamat yang diaudit; diisi di bawah begitu port server diketahui

const JENIS={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
  '.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml',
  '.xml':'application/xml','.txt':'text/plain; charset=utf-8'};

// Server statis seadanya. Port 0 = biarkan OS memilih, jadi tidak pernah
// bentrok dengan `npm run serve` yang sedang jalan.
function sajikan(){
  return new Promise(siap=>{
    const srv=http.createServer((req,res)=>{
      let jalur=decodeURIComponent(new URL(req.url,'http://x').pathname);
      if(jalur.endsWith('/'))jalur+='index.html';
      const berkas=path.join(AKAR,jalur);
      if(!berkas.startsWith(AKAR+path.sep)){res.writeHead(403).end('keluar akar');return}
      fs.readFile(berkas,(salah,isi)=>{
        if(salah){res.writeHead(404).end('tidak ada');return}
        res.writeHead(200,{'Content-Type':JENIS[path.extname(berkas)]||'application/octet-stream'});
        res.end(isi);
      });
    });
    srv.listen(0,'127.0.0.1',()=>siap(srv));
  });
}

// ---------- kesiapan halaman ----------

// Audit tidak boleh ikut menulis ke server statistik. Dua alasannya: origin
// lokal memang tidak ada di daftar izin worker (jadi tiap run meninggalkan
// error konsol), dan lebih penting — angka pengunjung itu milik pemilik
// etalase, bukan tempat mencatat lalu lintas audit. Dijawab 200 kosong, bukan
// digagalkan, supaya tidak ada error jaringan yang menyamar jadi cacat halaman.
async function janganCatatStatistik(p){
  if(!STAT)return;
  await p.route(STAT+'/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
}

// Font Google itu pihak ketiga: kalau CDN-nya lambat, 'load' menggantung dan
// blok audit gagal padahal halamannya sendiri sehat (terukur 16 detik pada
// satu run yang sama). Jadi 'load' ditunggu dengan batas, bukan syarat mati.
async function buka(p,alamat){
  await p.goto(alamat,{waitUntil:'domcontentloaded',timeout:30000});
  await p.waitForLoadState('load',{timeout:15000}).catch(()=>{});
  // Galeri etalase dirender dari data/desain.json. Kalau ini tidak muncul,
  // yang diaudit cuma 12 kartu statis di HTML dan hasilnya menyesatkan.
  if(await p.locator('[data-galeri]').count()){
    await p.locator('[data-galeri] .kartu').first().waitFor({timeout:15000}).catch(()=>{});
  }
  await p.waitForTimeout(1500);
}

// ---------- pengukuran ----------

// Rasio kontras dihitung dari warna yang dideklarasikan, bukan dari piksel.
// Dua akibatnya: latar bergambar ditandai `over` dan tidak diadili di sini
// (banner diukur terpisah oleh tools/bg.js + contrast.py), dan isi dialog ikut
// terukur asal dialognya memang sedang terbuka.
function ukurKontras(p){
  return p.evaluate(()=>{
    const parse=c=>{const m=c.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2],m[3]!==undefined?+m[3]:1]:null};
    const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
    const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)};
    function bgOf(el){let e=el;while(e&&e!==document.documentElement){const s=getComputedStyle(e);const c=parse(s.backgroundColor);
      if(c&&c[3]>.85)return{c,from:e.tagName+'.'+(e.className||'').toString().slice(0,30),img:s.backgroundImage!=='none'};
      if(s.backgroundImage&&s.backgroundImage!=='none')return{c:null,from:e.tagName,imageOnly:true};e=e.parentElement;}
      return {c:parse(getComputedStyle(document.body).backgroundColor)||[0,0,0,1],from:'body'};}
    const out=[];
    for(const el of document.querySelectorAll('h1,h2,h3,h4,p,a,span,li,button,label,small,b,i,td,th,time,dt,dd,figcaption,caption,blockquote')){
      const r=el.getBoundingClientRect(),s=getComputedStyle(el);
      if(r.width<1||r.height<1||s.visibility==='hidden'||s.display==='none'||+s.opacity<.2)continue;
      if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim().length>1))continue;
      const fg=parse(s.color); if(!fg)continue;
      const bg=bgOf(el); const fs=parseFloat(s.fontSize), fw=+s.fontWeight||400;
      const large=fs>=24||(fs>=18.66&&fw>=700);
      if(!bg.c){out.push({over:true,tag:el.tagName,fs,text:(el.innerText||'').trim().slice(0,40),color:s.color});continue}
      const rr=+ratio(fg.slice(0,3),bg.c.slice(0,3)).toFixed(2);
      const min=large?3:4.5;
      out.push({tag:el.tagName,fs:Math.round(fs),fw,large,ratio:rr,min,pass:rr>=min,color:s.color,
        bg:`rgb(${bg.c[0]}, ${bg.c[1]}, ${bg.c[2]})`,bgFrom:bg.from,text:(el.innerText||'').trim().replace(/\s+/g,' ').slice(0,48)});
    }
    return out;
  });
}

// Ringkasan axe dipangkas supaya laporan tidak membengkak; node contohnya
// cukup satu per aturan untuk tahu apa yang harus dibuka.
function ringkasAxe(a){
  if(!a||a.gagal)return a;
  return {
    violations:a.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,n:v.n,contoh:v.nodes[0]})),
    incomplete:a.incomplete.map(v=>({id:v.id,impact:v.impact,n:v.n}))
  };
}

async function jalankanAxe(p){
  try{
    await p.evaluate(AXE);
    const r=await p.evaluate(async()=>{const r=await axe.run(document,{resultTypes:['violations','incomplete'],
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
      return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,n:v.nodes.length,
        nodes:v.nodes.slice(0,5).map(x=>({t:x.target.join(' '),html:(x.html||'').slice(0,150),why:(x.failureSummary||'').slice(0,220)}))})),
      incomplete:r.incomplete.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,nodes:v.nodes.slice(0,3).map(x=>({t:x.target.join(' '),html:(x.html||'').slice(0,120)}))}))};});
    return r;
  }catch(e){
    return {gagal:String(e.message).slice(0,200)};
  }
}

// ---------- interaksi: etalase ----------

async function etalaseGaleri(b){
 const ctx=await b.newContext({viewport:{width:1440,height:900},locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const h={};

 // Layar selamat datang menutupi seluruh halaman, jadi klik apa pun akan
 // menunggu ia pergi. Singkirkan lebih dulu.
 h.selamatDatangTampil=await p.locator('[data-selamat-datang]').isVisible();
 await p.locator('[data-masuk]').click(); await p.waitForTimeout(700);
 h.selamatDatangHilang=!(await p.locator('[data-selamat-datang]').isVisible());
 h.overflowDikembalikan=await p.evaluate(()=>document.body.style.overflow);

 // Galeri harus datang dari data/desain.json — kalau fetch-nya gagal, yang
 // tertinggal cuma 12 kartu statis dan jumlahnya tidak akan cocok.
 h.kartuHalaman1=await p.locator('[data-galeri] .kartu').count();
 h.jumlahTeks=await p.locator('[data-jumlah]').innerText();
 const kode1=await p.locator('[data-galeri] .kartu__kode').allInnerTexts();

 h.halamanTeks=await p.locator('[data-halaman-teks]').innerText();
 h.prevMatiDiAwal=await p.locator('[data-hal-prev]').isDisabled();
 await p.locator('[data-hal-next]').click(); await p.waitForTimeout(900);
 const kode2=await p.locator('[data-galeri] .kartu__kode').allInnerTexts();
 h.halamanTeks2=await p.locator('[data-halaman-teks]').innerText();
 h.halamanBerbeda=kode1[0]!==kode2[0];
 h.tumpangTindih=kode1.filter(k=>kode2.indexOf(k)!==-1);
 await p.locator('[data-hal-prev]').click(); await p.waitForTimeout(900);

 // Pencarian menyaring kode; query yang tidak cocok harus memunculkan keadaan
 // kosong, bukan galeri yang tinggal separuh.
 await p.fill('[data-cari]','RMBG-9935'); await p.waitForTimeout(600);
 h.cariCocok=await p.locator('[data-galeri] .kartu').count();
 h.cariTeks=await p.locator('[data-jumlah]').innerText();
 h.pagerTersembunyiSaatCari=await p.locator('[data-halaman]').isHidden();
 await p.fill('[data-cari]','ZZZZ-0000'); await p.waitForTimeout(600);
 h.cariKosongTampil=await p.locator('[data-kosong]').isVisible();
 h.cariKosongTeks=(await p.locator('[data-kosong]').innerText()).slice(0,80);
 await p.fill('[data-cari]',''); await p.waitForTimeout(600);
 h.setelahCariKosong=await p.locator('[data-galeri] .kartu').count();

 // Pratinjau dulu, sebelum ada bilah pilihan yang melayang menutupi kartu.
 // Gambarnya ditukar ke berkas penuh begitu selesai dimuat.
 await p.locator('[data-galeri] .kartu__buka').first().click(); await p.waitForTimeout(1500);
 // Keterangan yang baru pertama kali dibuka mengalir seperti sedang ditulis,
 // dan baru berhenti sekitar 1,5 detik kemudian. Semua ukuran di bawah ini
 // diambil setelah alirannya selesai, bukan di tengah jalan.
 if (await p.locator('[data-pratinjau-deskripsi]').isVisible()) {
  await p.locator('[data-pratinjau-teks][data-alir="selesai"]')
    .waitFor({timeout:8000}).catch(()=>{});
 }
 h.pratinjauTerbuka=await p.locator('[data-pratinjau]').evaluate(d=>d.open);
 h.pratinjauKode=await p.locator('[data-pratinjau-kode]').innerText();
 h.pratinjauSrc=(await p.locator('[data-pratinjau-gambar]').getAttribute('src')||'').split('/').slice(-2).join('/');
 h.pratinjauAlt=await p.locator('[data-pratinjau-gambar]').getAttribute('alt');
 h.kirimSatuKode=decodeURIComponent(await p.locator('[data-pratinjau-kirim]').getAttribute('href')).slice(0,200);
 await p.locator('[data-zoom]').click(); await p.waitForTimeout(500);
 h.zoomAktif=await p.locator('[data-panggung]').evaluate(e=>e.classList.contains('zoom'));
 await p.screenshot({path:OUT+'/rmb-etalase-pratinjau.png'});
 // Isi dialog tidak pernah diukur pihak lain: tertutup berarti display:none.
 // Justru di sinilah teks terkecil halaman berada, jadi diukur saat terbuka.
 h.pratinjauKontrasGagal=(await ukurKontras(p)).filter(c=>!c.over&&!c.pass);
 h.pratinjauAxe=ringkasAxe(await jalankanAxe(p));
 await p.keyboard.press('Escape'); await p.waitForTimeout(600);
 h.pratinjauTertutup=await p.locator('[data-pratinjau]').evaluate(d=>d.open);

 // Menandai dua desain harus menghasilkan satu tautan WhatsApp berisi keduanya.
 await p.locator('[data-galeri] .kartu [data-tandai]').nth(0).click();
 await p.locator('[data-galeri] .kartu [data-tandai]').nth(1).click();
 await p.waitForTimeout(500);
 h.terpilih=await p.locator('[data-terpilih]').innerText();
 h.barTampil=await p.locator('[data-pilihan]').getAttribute('data-tampil');
 h.ariaPressed=await p.locator('[data-galeri] .kartu [data-tandai]').nth(0).getAttribute('aria-pressed');
 const href=await p.locator('[data-kirim]').getAttribute('href');
 h.waURL=href?decodeURIComponent(href).slice(0,300):null;
 await p.screenshot({path:OUT+'/rmb-etalase-pilihan.png'});

 // Panel Sekilas: jumlah desain dibaca dari sumber yang sama dengan galeri.
 await p.locator('[data-mata]').click(); await p.waitForTimeout(1000);
 h.sekilasTerbuka=await p.locator('[data-statistik]').evaluate(d=>d.open);
 h.sekilasPetak=await p.locator('[data-statistik-isi] .petak').count();
 h.sekilasLayanan=await p.locator('[data-statistik-isi] .rangking__baris').count();
 h.sekilasTeks=(await p.locator('[data-statistik-isi]').innerText()).replace(/\s+/g,' ').slice(0,160);
 await p.screenshot({path:OUT+'/rmb-etalase-sekilas.png'});
 h.sekilasKontrasGagal=(await ukurKontras(p)).filter(c=>!c.over&&!c.pass);
 h.sekilasAxe=ringkasAxe(await jalankanAxe(p));
 await p.keyboard.press('Escape'); await p.waitForTimeout(500);

 // Pilihan harus selamat dari muat ulang, dan layar selamat datang tidak boleh
 // muncul lagi di tab yang sama (kuncinya di sessionStorage).
 await p.reload({waitUntil:'load'}); await p.waitForTimeout(2800);
 h.pilihanSetelahMuatUlang=await p.locator('[data-terpilih]').innerText();
 h.selamatDatangSetelahMuatUlang=await p.locator('[data-selamat-datang]').isVisible();
 await p.locator('[data-kosongkan]').click(); await p.waitForTimeout(500);
 h.setelahKosongkan=await p.locator('[data-terpilih]').innerText();
 h.barSembunyi=await p.locator('[data-pilihan]').getAttribute('data-tampil');

 await ctx.close();
 return h;
}

// Bilah pilihan melayang di atas konten; di layar sempit ia yang paling mudah
// meluber keluar viewport.
async function etalaseSempit(b){
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const h={};
 h.selamatDatangTampil=await p.locator('[data-selamat-datang]').isVisible();
 await p.locator('[data-masuk]').click(); await p.waitForTimeout(700);
 await p.locator('[data-galeri] .kartu [data-tandai]').nth(0).click(); await p.waitForTimeout(600);
 h.barTampil=await p.locator('[data-pilihan]').getAttribute('data-tampil');
 h.bilah=await p.locator('[data-pilihan]').boundingBox();
 h.tombolKirim=await p.locator('[data-kirim]').boundingBox();
 h.dokumen=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
 await p.screenshot({path:OUT+'/rmb-etalase-m-pilihan.png'});
 // Panel Sekilas di layar sempit: di sinilah paddingnya paling rapat.
 await p.locator('[data-mata]').click(); await p.waitForTimeout(1200);
 h.sekilasSempitKontrasGagal=(await ukurKontras(p)).filter(c=>!c.over&&!c.pass);
 h.sekilasSempitPetak=await p.locator('[data-statistik-isi] .petak').count();
 await p.screenshot({path:OUT+'/rmb-etalase-m-sekilas.png'});
 await ctx.close();
 return h;
}

async function etalaseTenang(b){
 const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const nama=sel=>p.evaluate(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).animationName:null},sel);
 const h={
  animasiGaleri:await nama('[data-galeri]'),
  animasiKartu:await nama('.kartu.masuk'),
  animasiSapaan:await nama('.sd__sapa'),
  emoDisembunyikan:await p.evaluate(()=>{const e=document.querySelector('.sd__emo');return e?getComputedStyle(e).display:null})
 };
 await p.screenshot({path:OUT+'/rmb-etalase-tenang.png'});
 await ctx.close();
 return h;
}

// ---------- interaksi: halaman profil ----------

async function profilDesktop(b){
 const ctx=await b.newContext({viewport:{width:1440,height:900},locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const h={};
 // keyboard tab walk
 const seq=[];
 for(let i=0;i<46;i++){
  await p.keyboard.press('Tab'); await p.waitForTimeout(140);
  seq.push(await p.evaluate(()=>{const a=document.activeElement;if(!a)return null;
    const r=a.getBoundingClientRect(),s=getComputedStyle(a);
    return{tag:a.tagName,txt:(a.innerText||a.getAttribute('aria-label')||a.name||'').trim().slice(0,38),
      outline:`${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
      inView:r.top>=-4&&r.bottom<=innerHeight+4, y:Math.round(r.y), w:Math.round(r.width),h:Math.round(r.height)};}));
 }
 h.tabWalk=seq;
 // focus screenshots on a few
 await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(300);
 await p.keyboard.press('Tab');await p.waitForTimeout(200);
 await p.screenshot({path:OUT+'/rmb-focus-skip.png',clip:{x:0,y:0,width:700,height:200}});
 // interactions: dropdown, drawer, form, rail, theme
 await p.locator('button.navlink').first().click(); await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/rmb-dropdown.png',clip:{x:0,y:0,width:1440,height:400}});
 await p.keyboard.press('Escape');
 await p.locator('[data-lang]').click(); await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/rmb-lang.png',clip:{x:700,y:0,width:740,height:340}});
 await p.keyboard.press('Escape');
 await p.locator('[data-theme-toggle]').click(); await p.waitForTimeout(700);
 await p.screenshot({path:OUT+'/rmb-toggled-dark.png'});
 h.afterToggle=await p.evaluate(()=>({attr:document.documentElement.getAttribute('data-theme'),
   bg:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color}));
 await p.locator('[data-theme-toggle]').click(); await p.waitForTimeout(600);
 h.afterToggle2=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
 // form validation
 await p.locator('#kontak').scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
 await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(400);
 h.formEmpty=await p.locator('[data-status]').innerText();
 await p.fill('#f-nama','Budi'); await p.fill('#f-jumlah','0');
 await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(300);
 h.formZeroQty=await p.locator('[data-status]').innerText();
 await p.fill('#f-jumlah','48'); await p.fill('#f-kota','Blora');
 await p.fill('#f-detail','Combed 30s, sablon 2 warna');
 // the happy path opens a WhatsApp tab; capture the URL it composes, do not follow it
 const popup = p.waitForEvent('popup', {timeout:6000}).catch(()=>null);
 await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(900);
 const pop = await popup;
 h.waURL = pop ? decodeURIComponent(pop.url()).slice(0,320) : null;
 if (pop) await pop.close();
 h.formOk=await p.locator('[data-status]').innerText();
 await p.screenshot({path:OUT+'/rmb-form.png'});
 await ctx.close();
 return h;
}

async function profilMobile(b){
 const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const h={};
 await p.locator('[data-drawer-open]').click(); await p.waitForTimeout(600);
 await p.screenshot({path:OUT+'/rmb-m-drawer.png'});
 h.drawer=await p.evaluate(()=>({open:document.getElementById('drawer').getAttribute('data-open'),
   bodyOverflow:document.body.style.overflow, focus:document.activeElement.getAttribute('aria-label')}));
 await p.locator('[data-acc] > button').click(); await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/rmb-m-drawer-acc.png'});
 await p.keyboard.press('Escape'); await p.waitForTimeout(500);
 h.drawerClosed=await p.evaluate(()=>document.getElementById('drawer').getAttribute('data-open'));
 // rail
 await p.locator('#layanan').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
 h.railBefore=await p.evaluate(()=>{const t=document.querySelector('[data-rail-track]');
   return{sl:t.scrollLeft,sw:t.scrollWidth,cw:t.clientWidth,prevDis:document.querySelector('[data-rail-prev]').disabled,nextDis:document.querySelector('[data-rail-next]').disabled,
     barW:document.querySelector('[data-rail-bar]').style.width}});
 try{await p.locator('[data-rail-next]').click({timeout:5000}); await p.waitForTimeout(900);}catch(e){h.railNextErr=e.message.slice(0,90)}
 h.railAfter=await p.evaluate(()=>{const t=document.querySelector('[data-rail-track]');
   return{sl:Math.round(t.scrollLeft),prevDis:document.querySelector('[data-rail-prev]').disabled,nextDis:document.querySelector('[data-rail-next]').disabled}});
 await p.screenshot({path:OUT+'/rmb-m-rail.png'});
 await ctx.close();
 return h;
}

async function profilTenang(b){
 const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',locale:'id-ID'});
 const p=await ctx.newPage(); await janganCatatStatistik(p); await buka(p,F);
 const h=await p.evaluate(()=>{const v=document.querySelector('[data-hero-video]');
   return {revealsShown:[...document.querySelectorAll('.reveal')].filter(e=>e.getAttribute('data-in')==='true').length,
     revealTotal:document.querySelectorAll('.reveal').length,
     videoPaused:v?v.paused:null, videoAutoplayAttr:v?v.hasAttribute('autoplay'):null,
     pauseControlGone:!document.querySelector('[data-motion]')}});
 await p.screenshot({path:OUT+'/rmb-reduced.png'});
 await ctx.close();
 return h;
}

(async()=>{
 const srv=await sajikan();
 const PORT=srv.address().port;
 F=process.env.URL||`http://127.0.0.1:${PORT}/${TARGET==='profil'?'profil/':'index.html'}`;
 console.log('audit',TARGET,'->',F);
 try{
  const b=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const [n,W,H,mob] of VPS){
   for(const scheme of (n==='d-1440'?['light','dark']:['light'])){
    const ctx=await b.newContext({viewport:{width:W,height:H},isMobile:mob,hasTouch:mob,deviceScaleFactor:mob?2:1,colorScheme:scheme,locale:'id-ID'});
    const p=await ctx.newPage();
    const errs=[];
    p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
    p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,220)));
    await janganCatatStatistik(p);
    await buka(p,F);
    // Etalase membuka dengan layar selamat datang yang menutupi seluruh
    // halaman. Tutup dulu, kalau tidak seluruh screenshot dan pengukuran
    // kontras cuma memotret overlay-nya. Di halaman profil ini no-op.
    if(await p.locator('[data-selamat-datang]').isVisible().catch(()=>false)){
      await p.locator('[data-masuk]').click().catch(()=>{});
      await p.waitForTimeout(800);
    }
    const key=n+'-'+scheme;
    await p.screenshot({path:`${OUT}/rmb-${key}-01.png`});
    const h=await p.evaluate(()=>document.body.scrollHeight);
    const steps=Math.min(8,Math.ceil(h/H));
    for(let i=1;i<=steps;i++){await p.evaluate(y=>scrollTo(0,y),i*H*0.92);await p.waitForTimeout(700);
      await p.screenshot({path:`${OUT}/rmb-${key}-s${String(i).padStart(2,'0')}.png`});}
    await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(500);

    const diag=await p.evaluate(()=>{
      const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&+s.opacity>.05};
      return {
       scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth,
       hClip:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
       docH:document.body.scrollHeight,
       overflowing:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();
         return r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed';})
         .slice(0,12).map(e=>({t:e.tagName,c:(e.className||'').toString().slice(0,44),r:Math.round(e.getBoundingClientRect().right)})),
       bodyBg:getComputedStyle(document.body).backgroundColor,
       bodyColor:getComputedStyle(document.body).color,
       fonts:[...new Set([...document.querySelectorAll('h1,h2,p,a,button,.u-mono')].filter(vis).slice(0,80).map(e=>getComputedStyle(e).fontFamily.split(',')[0]))],
       h1:document.querySelectorAll('h1').length, h2:document.querySelectorAll('h2').length,
       headingOrder:[...document.querySelectorAll('h1,h2,h3,h4')].map(e=>+e.tagName[1]),
       small:[...document.querySelectorAll('a,button,input,select,textarea,[tabindex]')].filter(vis)
         .map(e=>{const r=e.getBoundingClientRect();return{t:e.tagName,x:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height)}})
         .filter(o=>o.w<44||o.h<44),
       heroVideo:(()=>{const v=document.querySelector('[data-hero-video]');if(!v)return null;
         return {rs:v.readyState, vw:v.videoWidth, vh:v.videoHeight, paused:v.paused,
           ct:+v.currentTime.toFixed(2), dur:v.duration||null, poster:!!v.poster,
           src:(v.currentSrc||'').split('/').pop(),
           boxW:Math.round(v.getBoundingClientRect().width), boxH:Math.round(v.getBoundingClientRect().height),
           err:v.error?v.error.code:null};})(),
      };
    });

    const contrast=await ukurKontras(p);
    const axe=ringkasAxe(await jalankanAxe(p));
    if(axe&&axe.gagal)errs.push('axe: '+axe.gagal);

    out[key]={diag,contrastFails:contrast.filter(c=>!c.over&&!c.pass),overImage:contrast.filter(c=>c.over),
      contrastCount:contrast.length,axe,errors:errs};
    await ctx.close();
    console.log('done',key);
   }
  }

  // Blok interaksi mengikuti halaman yang diaudit. Masing-masing dibungkus
  // sendiri: kalau satu meleset, sisanya tetap jalan dan laporannya tetap ada.
  const blok=TARGET==='profil'
    ? [['profil-desktop',profilDesktop],['profil-mobile',profilMobile],['reduced-motion',profilTenang]]
    : [['etalase-galeri',etalaseGaleri],['etalase-sempit',etalaseSempit],['reduced-motion',etalaseTenang]];
  for(const [nama,fn] of blok){
    try{ out[nama]=await fn(b); console.log('done',nama); }
    catch(e){ out[nama]={gagal:String(e.message).slice(0,300)}; console.log('GAGAL',nama,String(e.message).slice(0,120)); }
  }
  await b.close();
 } finally {
  srv.close();
  fs.writeFileSync(OUT+'/rmbcheck.json',JSON.stringify(out,null,1));
  console.log('WROTE rmbcheck.json');
 }
})();
