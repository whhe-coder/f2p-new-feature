const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const D = () => [...document.querySelectorAll('[data-id*="email-customizer"], [data-id="sidebar-sdk"], [data-id="sidebar-other-tools"]')].map(e => { const a = e.closest('a') || e.querySelector('a'); const r = e.getBoundingClientRect(); return {tag: e.tagName, id: e.getAttribute('data-id'), vis: r.width > 0 && r.height > 0, a: a ? {href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), inside: e.contains(a)} : null, html: e.outerHTML.slice(0, 160)}; });
run(async (page) => {
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id=sidebar-dashboard]', {timeout: 40000}); await page.waitForTimeout(1500);
  out.ls0 = await page.evaluate(() => Object.keys(localStorage).sort().join(','));
  await page.getByLabel('Collapse sidebar').click();
  await page.waitForTimeout(1500);
  out.collapsed = await page.evaluate(() => document.getElementById('app-root__content').className);
  out.dom = await page.evaluate(D);
  await page.locator('[data-id="sidebar-other-tools"]').click();
  await page.waitForTimeout(1500);
  out.menu = await page.evaluate(D);
  out.menuItems = await page.evaluate(() => [...document.querySelectorAll('[role=menu] *[data-id], [role=menuitem]')].map(e => ({tag: e.tagName, id: e.getAttribute('data-id'), role: e.getAttribute('role'), t: e.textContent.trim().slice(0, 25), href: e.getAttribute('href')})).slice(0, 20));
  return out;
});
