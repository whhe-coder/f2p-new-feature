const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const out = {}; const urls = [];
  await page.exposeFunction('__rec', u => urls.push(u.replace('/for/web-games/account', '')));
  await page.addInitScript(() => { for (const k of ['pushState', 'replaceState']) { const o = history[k]; history[k] = function (...a) { const r = o.apply(this, a); try { window.__rec(k[0] + ':' + location.pathname); } catch (e) {} return r; }; } });
  for (const p of ['/53105/settings/company', '/53105/profile']) {
    await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded'});
    await waitApp(page, 'text=Back to account'); await page.waitForTimeout(1500);
    urls.length = 0;
    await page.getByText('Back to account', {exact: true}).first().click();
    const fin = await settle(page, {stableMs: 3000});
    out[p] = {t: new Date().toISOString(), pushes: urls.slice(), final: fin.replace(BASE, ''), getStartedChoose: await page.evaluate(() => /Games Portal/.test(document.body.innerText)), sidebar: await page.evaluate(() => !!document.querySelector('.app-root__sidebar-fixed'))};
  }
  return out;
});
