// Recon 2: dashboard GW paths, then the webhooks page (who requests currency/list).
const {run, BASE, clientNav, settle} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
run(async (page) => {
  const log = w.watch(page);
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(32000);
  const dash = log.gw.map(x => `${x.at.slice(14, 19)} ${x.m} ${x.s} ${x.p}`);
  const n = log.gw.length;
  await clientNav(page, '/for/web-games/account/53105/projects/317869/edit/webhooks');
  const u1 = await settle(page, {stableMs: 3000, timeoutMs: 15000});
  await page.waitForTimeout(8000);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab], a[href*="webhooks"]')].map(e => (e.innerText || '').trim() + ' ' + (e.getAttribute('href') || '')).slice(0, 15));
  return {dash, u1, after: log.gw.slice(n).map(x => `${x.at.slice(14, 19)} ${x.m} ${x.s} ${x.p}`), tabs, console: log.console.slice(0, 8)};
});
