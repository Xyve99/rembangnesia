const {chromium}=require('playwright');
const fs=require('fs');
fs.mkdirSync(process.env.OUT||'out',{recursive:true});
const OUT=process.env.OUT||'out';
const AXE=fs.readFileSync(require('path').join(__dirname,'axe.min.js'),'utf8');
const F=process.env.URL||'file://'+require('path').resolve('index.html');
const VPS=[['m-390',390,844,true],['m-320',320,658,true],['t-768',768,1024,true],['d-1366',1366,768,false],['d-1440',1440,900,false],['w-1920',1920,1080,false]];
const out={};
(async()=>{
 const b=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [n,W,H,mob] of VPS){
  for(const scheme of (n==='d-1440'?['light','dark']:['light'])){
   const ctx=await b.newContext({viewport:{width:W,height:H},isMobile:mob,hasTouch:mob,deviceScaleFactor:mob?2:1,colorScheme:scheme,locale:'id-ID'});
   const p=await ctx.newPage();
   const errs=[];
   p.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200))});
   p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,220)));
   await p.goto(F,{waitUntil:'load'}); await p.waitForTimeout(3200);
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

   const contrast=await p.evaluate(()=>{
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

   let axe=null;
   try{ await p.evaluate(AXE);
     axe=await p.evaluate(async()=>{const r=await axe.run(document,{resultTypes:['violations','incomplete'],
       runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}});
       return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,n:v.nodes.length,
         nodes:v.nodes.slice(0,5).map(x=>({t:x.target.join(' '),html:(x.html||'').slice(0,150),why:(x.failureSummary||'').slice(0,220)}))})),
       incomplete:r.incomplete.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,nodes:v.nodes.slice(0,3).map(x=>({t:x.target.join(' '),html:(x.html||'').slice(0,120)}))}))};});
   }catch(e){errs.push('axe: '+e.message)}

   out[key]={diag,contrastFails:contrast.filter(c=>!c.over&&!c.pass),overImage:contrast.filter(c=>c.over),
     contrastCount:contrast.length,axe,errors:errs};
   await ctx.close();
   console.log('done',key);
  }
 }
 // keyboard tab walk on desktop
 {
  const ctx=await b.newContext({viewport:{width:1440,height:900},locale:'id-ID'});
  const p=await ctx.newPage(); await p.goto(F,{waitUntil:'load'}); await p.waitForTimeout(2500);
  const seq=[];
  for(let i=0;i<46;i++){
   await p.keyboard.press('Tab'); await p.waitForTimeout(140);
   seq.push(await p.evaluate(()=>{const a=document.activeElement;if(!a)return null;
     const r=a.getBoundingClientRect(),s=getComputedStyle(a);
     return{tag:a.tagName,txt:(a.innerText||a.getAttribute('aria-label')||a.name||'').trim().slice(0,38),
       outline:`${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`,
       inView:r.top>=-4&&r.bottom<=innerHeight+4, y:Math.round(r.y), w:Math.round(r.width),h:Math.round(r.height)};}));
  }
  out.tabWalk=seq;
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
  out.afterToggle=await p.evaluate(()=>({attr:document.documentElement.getAttribute('data-theme'),
    bg:getComputedStyle(document.body).backgroundColor,color:getComputedStyle(document.body).color}));
  await p.locator('[data-theme-toggle]').click(); await p.waitForTimeout(600);
  out.afterToggle2=await p.evaluate(()=>document.documentElement.getAttribute('data-theme'));
  // form validation
  await p.locator('#kontak').scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(400);
  out.formEmpty=await p.locator('[data-status]').innerText();
  await p.fill('#f-nama','Budi'); await p.fill('#f-jumlah','0');
  await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(300);
  out.formZeroQty=await p.locator('[data-status]').innerText();
  await p.fill('#f-jumlah','48'); await p.fill('#f-kota','Blora');
  await p.fill('#f-detail','Combed 30s, sablon 2 warna');
  // the happy path opens a WhatsApp tab; capture the URL it composes, do not follow it
  const popup = p.waitForEvent('popup', {timeout:6000}).catch(()=>null);
  await p.locator('form[data-quote] button[type=submit]').click(); await p.waitForTimeout(900);
  const pop = await popup;
  out.waURL = pop ? decodeURIComponent(pop.url()).slice(0,320) : null;
  if (pop) await pop.close();
  out.formOk=await p.locator('[data-status]').innerText();
  await p.screenshot({path:OUT+'/rmb-form.png'});
  await ctx.close();
 }
 // mobile drawer + rail
 {
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,locale:'id-ID'});
  const p=await ctx.newPage(); await p.goto(F,{waitUntil:'load'}); await p.waitForTimeout(2500);
  await p.locator('[data-drawer-open]').click(); await p.waitForTimeout(600);
  await p.screenshot({path:OUT+'/rmb-m-drawer.png'});
  out.drawer=await p.evaluate(()=>({open:document.getElementById('drawer').getAttribute('data-open'),
    bodyOverflow:document.body.style.overflow, focus:document.activeElement.getAttribute('aria-label')}));
  await p.locator('[data-acc] > button').click(); await p.waitForTimeout(500);
  await p.screenshot({path:OUT+'/rmb-m-drawer-acc.png'});
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  out.drawerClosed=await p.evaluate(()=>document.getElementById('drawer').getAttribute('data-open'));
  // rail
  await p.locator('#layanan').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  out.railBefore=await p.evaluate(()=>{const t=document.querySelector('[data-rail-track]');
    return{sl:t.scrollLeft,sw:t.scrollWidth,cw:t.clientWidth,prevDis:document.querySelector('[data-rail-prev]').disabled,nextDis:document.querySelector('[data-rail-next]').disabled,
      barW:document.querySelector('[data-rail-bar]').style.width}});
  try{await p.locator('[data-rail-next]').click({timeout:5000}); await p.waitForTimeout(900);}catch(e){out.railNextErr=e.message.slice(0,90)}
  out.railAfter=await p.evaluate(()=>{const t=document.querySelector('[data-rail-track]');
    return{sl:Math.round(t.scrollLeft),prevDis:document.querySelector('[data-rail-prev]').disabled,nextDis:document.querySelector('[data-rail-next]').disabled}});
  await p.screenshot({path:OUT+'/rmb-m-rail.png'});
  await ctx.close();
 }
 // reduced motion
 {
  const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',locale:'id-ID'});
  const p=await ctx.newPage(); await p.goto(F,{waitUntil:'load'}); await p.waitForTimeout(2200);
  out.reduced=await p.evaluate(()=>{const v=document.querySelector('[data-hero-video]');
    return {revealsShown:[...document.querySelectorAll('.reveal')].filter(e=>e.getAttribute('data-in')==='true').length,
      revealTotal:document.querySelectorAll('.reveal').length,
      videoPaused:v?v.paused:null, videoAutoplayAttr:v?v.hasAttribute('autoplay'):null,
      pauseControlGone:!document.querySelector('[data-motion]')}});
  await p.screenshot({path:OUT+'/rmb-reduced.png'});
  await ctx.close();
 }
 await b.close();
 fs.writeFileSync(OUT+'/rmbcheck.json',JSON.stringify(out,null,1));
 console.log('WROTE rmbcheck.json');
})();
