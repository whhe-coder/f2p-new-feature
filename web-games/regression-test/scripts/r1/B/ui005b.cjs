const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const ids = new Set();
  page.on('response', async r => { if (/site-builder|sitebuilder|sites/i.test(r.url()) && /json/.test(r.headers()['content-type'] || '')) { try { const j = await r.json(); const s = JSON.stringify(j); (s.match(/"id"\s*:\s*"?([\w-]{1,40})"?/g) || []).slice(0, 5).forEach(x => ids.add(r.url().split('?')[0].replace(/^https:\/\/[^/]+/, '').slice(0, 80) + ' ' + x)); } catch (e) {} } });
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForTimeout(25000);
  const html = await page.evaluate(() => (document.getElementById('app-root__content')?.innerHTML || 'NONE').slice(0, 400)); const ifr = await page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => (f.src || '').slice(0, 100))); const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.getAttribute('href')).filter(h => h && /site-builder\/.+/.test(h)).slice(0, 10));
  const txt = await page.evaluate(() => (document.getElementById('app-root__content')?.innerText || '').replace(/\n+/g, '|').slice(0, 300));
  return {html, ifr, links, txt, ids: [...ids].slice(0, 15), url: page.url().replace(BASE, '')};
});
