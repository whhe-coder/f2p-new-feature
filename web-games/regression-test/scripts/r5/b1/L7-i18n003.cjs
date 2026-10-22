// RT-I18N-003: users/location aborted in the browser (not allowed through), switch to de, then unblock and hard reload.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const cons = [];
  page.on('console', m => { const t = m.text(); if (/persist|locale/i.test(t) && !/\[Gateway\]/.test(t)) cons.push({at: h.iso(), type: m.type(), text: t.slice(0, 200)}); });
  const blocker = r => { loc.location.push({at: h.iso(), aborted: true, body: r.request().postData()}); return r.abort('failed'); };
  await page.route(/users\/location/, blocker);
  const s = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  s.L0 = await h.state(page);
  await h.switchLang(page, 'de');
  await page.waitForTimeout(1500);
  s.de = await h.state(page);
  s.deText = await page.evaluate(() => document.querySelector('[data-id="dashboard-balance"]')?.innerText.split('\n').slice(0, 2).join(' | '));
  s.toasts = await page.evaluate(() => [...document.querySelectorAll('[role=alert],[class*="toast"],[class*="Toast"],[class*="notification"]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 3));
  await page.unroute(/users\/location/, blocker);
  s.reloadAt = h.iso();
  await page.reload({waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(2500);
  s.afterReload = await h.state(page);
  s.afterText = await page.evaluate(() => document.querySelector('[data-id="dashboard-balance"]')?.innerText.split('\n').slice(0, 2).join(' | '));
  return {s, cons, loc};
});
