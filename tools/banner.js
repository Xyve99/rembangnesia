const {chromium} = require('playwright');
const fs = require('fs');
fs.mkdirSync(process.env.OUT || 'out',{recursive:true});
const OUT = process.env.OUT || 'out';
const F = process.env.URL || 'file://' + require('path').resolve('index.html');

const VPS = [
  ['b-320', 320, 658, true], ['b-390', 390, 844, true], ['b-600', 600, 900, true],
  ['b-768', 768, 1024, true], ['b-900', 900, 1000, false], ['b-1366', 1366, 768, false],
  ['b-1440', 1440, 900, false], ['b-1920', 1920, 1080, false], ['b-2560', 2560, 1440, false],
];

(async () => {
  const b = await chromium.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const out = {};
  for (const [name, W, H, mob] of VPS) {
    for (const scheme of (name === 'b-1440' ? ['light', 'dark'] : ['light'])) {
      const ctx = await b.newContext({
        viewport: {width: W, height: H}, isMobile: mob, hasTouch: mob,
        deviceScaleFactor: mob ? 2 : 1, colorScheme: scheme, locale: 'id-ID',
      });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      const failed = [];
      p.on('response', r => { if (r.status() >= 400) failed.push(r.url().slice(-50) + ' ' + r.status()); });
      await p.goto(F, {waitUntil: 'load'});
      await p.waitForTimeout(1200);
      await p.evaluate(() => { const c = document.querySelector('[data-cookie-close]'); if (c) c.click(); });
      await p.locator('#bonus').scrollIntoViewIfNeeded();
      await p.waitForTimeout(1500);

      const key = name + '-' + scheme;
      const info = await p.evaluate(() => {
        const img = document.querySelector('.banner__art img');
        const sec = document.querySelector('.banner');
        const inner = document.querySelector('.banner__inner');
        const title = document.querySelector('#h-banner');
        const body = document.querySelector('.banner .promo__body');
        const eyebrow = document.querySelector('.banner .eyebrow');
        const r = e => { const x = e.getBoundingClientRect(); return {x: Math.round(x.x), y: Math.round(x.y), w: Math.round(x.width), h: Math.round(x.height)}; };
        return {
          chosen: (img.currentSrc || '').split('/').pop(),
          natural: img.naturalWidth + 'x' + img.naturalHeight,
          complete: img.complete,
          objPos: getComputedStyle(img).objectPosition,
          panel: r(sec), inner: r(inner),
          title: r(title), body: r(body), eyebrow: r(eyebrow),
          titleColor: getComputedStyle(title).color,
          bodyColor: getComputedStyle(body).color,
          eyebrowColor: getComputedStyle(eyebrow).color,
          titleSize: getComputedStyle(title).fontSize,
          bodySize: getComputedStyle(body).fontSize,
          scrim: getComputedStyle(document.querySelector('.banner__scrim')).backgroundImage.slice(0, 60),
        };
      });

      // full-panel screenshot for pixel-level contrast measurement
      const box = await p.locator('.banner').boundingBox();
      await p.screenshot({path: `${OUT}/${key}-panel.png`, clip: box});
      await p.screenshot({path: `${OUT}/${key}-view.png`});

      out[key] = {info, errs, failed};
      await ctx.close();
      console.log('done', key, info.chosen, info.natural);
    }
  }
  await b.close();
  fs.writeFileSync(`${OUT}/banner.json`, JSON.stringify(out, null, 1));
  console.log('WROTE banner.json');
})();
