const {run, BASE, settle, clientNav} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const B = () => ({p: location.pathname.replace('/for/web-games/account', ''), banner: /Can't find something in Business Accounts\?/.test(document.body.innerText), topbar: !!document.querySelector('button[aria-label="Communication Hub"]'), bannerH: getComputedStyle(document.getElementById('app-root') || document.body).getPropertyValue('--app-notice-banner-height')});
run(async (page) => {
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(1500);
  out.dash0 = {t: new Date().toISOString(), ...(await page.evaluate(B))};
  for (const p of ['/53105/settings/company', '/53105/get-started', '/53105/select-project', '/53105/dashboard', '/53105/projects/317869/site-builder']) {
    await clientNav(page, `/for/web-games/account${p}`);
    await settle(page, {stableMs: 2500});
    await page.waitForTimeout(p.includes('site-builder') ? 12000 : 1500);
    out[p] = {t: new Date().toISOString(), ...(await page.evaluate(B))};
  }
  out.sbButtons = await page.evaluate(() => [...document.querySelectorAll('.site-builder-app button, .site-builder-app a, .site-builder-app [role=button]')].map(b => (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 25)).slice(0, 25));
  return out;
});
