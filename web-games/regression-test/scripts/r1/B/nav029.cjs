const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const out = {};
  const urls = [];
  await page.exposeFunction('__rec', u => urls.push(u.replace('/for/web-games/account', '')));
  await page.addInitScript(() => { for (const k of ['pushState', 'replaceState']) { const o = history[k]; history[k] = function (...a) { const r = o.apply(this, a); try { window.__rec(k[0] + ':' + location.pathname); } catch (e) {} return r; }; } });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(2000);
  out.topbarBtns = await page.evaluate(() => [...document.querySelectorAll('nav button, header button, [class*=topbar] button')].map(b => b.getAttribute('aria-label') || b.textContent.trim().slice(0, 20)).filter(Boolean).slice(0, 20));
  urls.length = 0;
  const h0 = await page.evaluate(() => history.length);
  await page.getByRole('button', {name: 'Communication Hub'}).first().click();
  await page.waitForTimeout(4000);
  out.chat = {t: new Date().toISOString(), url: page.url().replace(BASE, ''), histDelta: (await page.evaluate(() => history.length)) - h0, pushes: urls.slice(), sidebar: await page.evaluate(() => !!document.querySelector('.app-root__sidebar-fixed'))};
  return out;
});
