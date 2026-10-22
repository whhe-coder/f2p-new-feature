const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const hits = [];
  page.on('response', async r => { const ct = r.headers()['content-type'] || ''; if (!/json/.test(ct)) return; try { const s = await r.text(); const i = s.indexOf('angry-birds-2-store-47e5'); if (i >= 0) hits.push({url: r.url().split('?')[0].replace(/^https:\/\/[^/]+/, '').slice(0, 90), host: new URL(r.url()).host, snippet: s.slice(Math.max(0, i - 200), i + 60).replace(/eyJ[\w.-]+/g, '<jwt>')}); } catch (e) {} });
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForSelector('.site-builder-app [aria-label=Actions]', {timeout: 50000}).catch(() => {});
  await page.waitForTimeout(1000);
  return {hits: hits.slice(0, 3)};
});
