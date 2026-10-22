const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page, ctx) => {
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page, '[data-id=pa-promo-banner]'); await page.waitForTimeout(1500);
  out.btns = await page.evaluate(() => [...document.querySelectorAll('[data-id=pa-promo-banner] button, [data-id=pa-promo-banner] [role=button]')].map(b => ({t: b.textContent.trim().slice(0, 40), al: b.getAttribute('aria-label')})));
  const action = out.btns.find(b => b.t && !/close|dismiss/i.test((b.al || '') + b.t));
  if (!action) return out;
  const before = page.url();
  await page.evaluate(() => { window.__opens = []; const o = window.open; window.open = function (...a) { const w = o.apply(this, a); window.__opens.push({url: String(a[0]).slice(0, 80), target: a[1], features: a[2], returned: w === null ? 'null' : typeof w}); return w; }; });
  const listBefore = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  out.t0 = new Date().toISOString();
  const pp = ctx.waitForEvent('page', {timeout: 15000}).catch(() => null);
  await page.locator('[data-id=pa-promo-banner] button, [data-id=pa-promo-banner] [role=button]').filter({hasText: action.t}).first().click();
  const popup = await pp; out.t = new Date().toISOString();
  if (popup) { await popup.waitForLoadState('commit', {timeout: 15000}).catch(() => {}); await popup.waitForTimeout(1500); out.popup = {url: popup.url().slice(0, 100), openerNull: await popup.evaluate(() => window.opener === null).catch(e => 'ERR ' + e.message.slice(0, 60))}; await popup.close().catch(() => {}); }
  out.opens = await page.evaluate(() => window.__opens);
  const listAfter = await (await fetch('http://127.0.0.1:9333/json/list')).json();
  const ids = new Set(listBefore.map(t => t.id));
  out.newTargets = listAfter.filter(t => !ids.has(t.id) && t.type === 'page').map(t => t.url.slice(0, 90));
  out.origUnchanged = page.url() === before;
  out.dismissKey = await page.evaluate(() => localStorage.getItem('wg-pa-promo-banner-dismissed'));
  out.bannerStill = await page.locator('[data-id=pa-promo-banner]').count();
  return out;
});
