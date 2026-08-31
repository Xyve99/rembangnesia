const {chromium} = require('playwright');
const fs = require('fs');
fs.mkdirSync(process.env.OUT || 'out',{recursive:true});
const OUT = process.env.OUT || 'out';
const F = process.env.URL || 'file://' + require('path').resolve('index.html');

const VPS = [
  ['bg-320', 320, 658, true, 'light'], ['bg-390', 390, 844, true, 'light'],
  ['bg-600', 600, 900, true, 'light'], ['bg-768', 768, 1024, true, 'light'],
  ['bg-900', 900, 1000, false, 'light'], ['bg-1366', 1366, 768, false, 'light'],
  ['bg-1440', 1440, 900, false, 'light'], ['bg-1440d', 1440, 900, false, 'dark'],
  ['bg-1920', 1920, 1080, false, 'light'], ['bg-2560', 2560, 1440, false, 'light'],
];

(async () => {
  const b = await chromium.launch({args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const out = {};
  for (const [name, W, H, mob, scheme] of VPS) {
    const ctx = await b.newContext({
      viewport: {width: W, height: H}, isMobile: mob, hasTouch: mob,
      deviceScaleFactor: 1, colorScheme: scheme, locale: 'id-ID',
    });
    const p = await ctx.newPage();
    await p.goto(F, {waitUntil: 'load'});
    await p.waitForTimeout(1000);
    await p.evaluate(() => { const c = document.querySelector('[data-cookie-close]'); if (c) c.click(); });
    await p.locator('#bonus').scrollIntoViewIfNeeded();
    await p.waitForTimeout(1400);

    // record where each text block sits, relative to the panel, then hide the copy
    const geo = await p.evaluate(() => {
      const sec = document.querySelector('.banner').getBoundingClientRect();
      const box = e => {
        const r = e.getBoundingClientRect();
        return {x: Math.round(r.x - sec.x), y: Math.round(r.y - sec.y),
                w: Math.round(r.width), h: Math.round(r.height)};
      };
      const g = {
        panelW: Math.round(sec.width), panelH: Math.round(sec.height),
        title: box(document.querySelector('#h-banner')),
        body: box(document.querySelector('.banner .promo__body')),
        eyebrow: box(document.querySelector('.banner .eyebrow')),
        cta: box(document.querySelector('.banner .btn')),
        colors: {
          title: getComputedStyle(document.querySelector('#h-banner')).color,
          body: getComputedStyle(document.querySelector('.banner .promo__body')).color,
          eyebrow: getComputedStyle(document.querySelector('.banner .eyebrow')).color,
        },
        sizes: {
          title: parseFloat(getComputedStyle(document.querySelector('#h-banner')).fontSize),
          titleWeight: getComputedStyle(document.querySelector('#h-banner')).fontWeight,
          body: parseFloat(getComputedStyle(document.querySelector('.banner .promo__body')).fontSize),
          bodyWeight: getComputedStyle(document.querySelector('.banner .promo__body')).fontWeight,
          eyebrow: parseFloat(getComputedStyle(document.querySelector('.banner .eyebrow')).fontSize),
          eyebrowWeight: getComputedStyle(document.querySelector('.banner .eyebrow')).fontWeight,
        },
      };
      document.querySelector('.banner__inner').style.visibility = 'hidden';
      return g;
    });
    await p.waitForTimeout(300);
    const box = await p.locator('.banner').boundingBox();
    await p.screenshot({path: `${OUT}/${name}-bg.png`, clip: box});
    out[name] = geo;
    await ctx.close();
    console.log('bg captured', name, geo.panelW + 'x' + geo.panelH);
  }
  await b.close();
  fs.writeFileSync(`${OUT}/bannergeo.json`, JSON.stringify(out, null, 1));
  console.log('WROTE bannergeo.json');
})();
