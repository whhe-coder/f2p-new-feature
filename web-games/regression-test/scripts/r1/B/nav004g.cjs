const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const M = () => [...document.querySelectorAll('[role=menu]')].map(m => ({txt: m.innerText.replace(/\n/g, '|').slice(0, 150), items: [...m.querySelectorAll('[data-id]')].map(e => ({tag: e.tagName, id: e.getAttribute('data-id'), href: (e.getAttribute('href') || '').slice(0, 80), target: e.getAttribute('target'), rel: e.getAttribute('rel'), child: e.firstElementChild?.tagName}))}));
run(async (page, ctx) => {
  const out = {};
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForFunction(() => document.querySelector('[data-id=sidebar-sdk]'), null, {timeout: 40000});
  await page.waitForTimeout(3000);
  out.ls0 = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()).length);
  await page.getByLabel('Collapse sidebar').click();
  await page.waitForTimeout(1500);
  out.railLeaf = await page.evaluate(() => { const d = document.querySelector('.app-root__sidebar-fixed div[data-id=sidebar-dashboard]'); return d ? {tag: d.tagName, inner: d.firstElementChild?.tagName, innerHasDataId: d.firstElementChild?.getAttribute('data-id')} : null; });
  const grp = page.locator('button[data-id="sidebar-other-tools"][aria-haspopup]');
  await grp.click(); await page.waitForTimeout(1000);
  out.menu = await page.evaluate(M);
  await page.evaluate(() => { window.__opens = 0; const o = window.open; window.open = function (...a) { window.__opens++; return o.apply(this, a); }; });
  const pp = ctx.waitForEvent('page', {timeout: 15000}).catch(() => null);
  await page.locator('[role=menu] [data-id="sidebar-other-tools-email-customizer"]').click({timeout: 10000}).catch(e => { out.clickErr = e.message.slice(0, 150); });
  const popup = await pp; out.tPopup = new Date().toISOString();
  if (popup) {
    await popup.waitForLoadState('domcontentloaded', {timeout: 20000}).catch(() => {});
    out.popup = {url: popup.url().slice(0, 80), openerNull: await popup.evaluate(() => window.opener === null).catch(e => 'ERR ' + e.message.slice(0, 80))};
    await popup.close().catch(() => {});
  }
  out.windowOpenCalls = await page.evaluate(() => window.__opens);
  out.urlAfterExt = page.url().replace(BASE, '');
  await page.bringToFront().catch(() => {});
  if (!(await page.locator('[role=menu] [data-id="sidebar-sdk"]').count())) { await grp.click(); await page.waitForTimeout(800); }
  const h0 = await page.evaluate(() => history.length);
  await page.locator('[role=menu] [data-id="sidebar-sdk"]').click({timeout: 10000});
  await page.waitForTimeout(3000);
  out.sdk = {url: page.url().replace(BASE, ''), histDelta: (await page.evaluate(() => history.length)) - h0, t: new Date().toISOString(), stillCollapsed: await page.evaluate(() => /collapsed/.test(document.getElementById('app-root__content').className))};
  out.ls1 = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort()).length);
  return out;
});
