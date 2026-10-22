const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const D = () => [...document.querySelectorAll('[data-id*="email-customizer"], [data-id="sidebar-sdk"], [data-id="sidebar-other-tools"]')].map(e => { const a = e.closest('a') || e.querySelector('a'); const r = e.getBoundingClientRect(); return {tag: e.tagName, id: e.getAttribute('data-id'), vis: r.width > 0 && r.height > 0, a: a ? {href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), inside: e.contains(a)} : null, html: e.outerHTML.slice(0, 160)}; });
run(async (page, ctx) => {
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id=sidebar-dashboard]', {timeout: 40000}); await page.waitForTimeout(1500);
  out.ls0 = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
  await page.getByLabel('Collapse sidebar').click();
  await page.waitForTimeout(1500);
  out.collapsed = await page.evaluate(() => document.getElementById('app-root__content').className);
  out.dom = await page.evaluate(D);
  out.collapsedLeaves = await page.evaluate(() => [...document.querySelectorAll('.app-root__sidebar-fixed [data-id]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0; }).map(e => e.tagName + '#' + e.getAttribute('data-id')).slice(0, 40));
  await page.locator('[data-id="sidebar-other-tools"]').click();
  await page.waitForTimeout(1500);
  out.menu = await page.evaluate(D);
  out.afterGroupClick = await page.evaluate(() => document.getElementById('app-root__content').className);
  out.menuRoot = await page.evaluate(() => { const m = document.querySelector('[role=menu]'); return m ? {id: m.id, html: m.outerHTML.slice(0, 200), anc: m.closest('.app-root__sidebar-fixed') ? 'in-sidebar' : 'portal'} : null; });
  out.ctrl = await page.evaluate(() => { const c = document.getElementById('sidebar-collapsible-sidebar-other-tools'); return c ? {vis: c.getBoundingClientRect().width, inMenu: !!c.closest('[role=menu]'), anc: c.closest('.app-root__sidebar-fixed') ? 'in-sidebar' : 'portal'} : null; });
  await page.evaluate(() => { window.__opens = 0; const o = window.open; window.open = function (...a) { window.__opens++; return o.apply(this, a); }; });
  out.emailVisibleCount = await page.locator('[data-id="sidebar-other-tools-email-customizer"]:visible').count();
  const pp = ctx.waitForEvent('page', {timeout: 15000}).catch(e => null);
  await page.locator('[data-id="sidebar-other-tools-email-customizer"]:visible').first().click().catch(e => { out.clickErr = e.message.slice(0, 200); });
  const popup = await pp;
  if (!popup) { out.noPopup = true; out.urlNow = page.url().replace(BASE, ''); return out; }
  out.tPopup = new Date().toISOString();
  await popup.waitForLoadState('domcontentloaded', {timeout: 20000}).catch(() => {});
  out.popup = {url: popup.url().slice(0, 90), opener: await popup.evaluate(() => window.opener === null).catch(e => 'ERR ' + e.message.slice(0, 60))};
  await popup.close();
  out.windowOpenCalls = await page.evaluate(() => window.__opens);
  out.urlAfterExt = page.url().replace(BASE, '');
  const sdk = page.locator('[data-id="sidebar-sdk"]:visible').first();
  if (!(await sdk.count())) { await page.locator('[data-id="sidebar-other-tools"]').last().click(); await page.waitForTimeout(800); }
  await page.locator('[data-id="sidebar-sdk"]:visible').first().click();
  await page.waitForTimeout(3000);
  out.urlAfterSdk = page.url().replace(BASE, ''); out.histLen = await page.evaluate(() => history.length);
  out.stillCollapsed = await page.evaluate(() => document.getElementById('app-root__content').className);
  out.ls1 = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
  return out;
});
