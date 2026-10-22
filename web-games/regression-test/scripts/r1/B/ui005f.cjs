const {run, BASE, settle, clientNav} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const B = () => { const c = document.getElementById('app-root__content'); const outside = [...document.querySelectorAll('body *')].some(e => e.children.length === 0 && /Can't find something in Business Accounts\?/.test(e.textContent) && !(c && c.contains(e))); return {p: location.pathname.replace('/for/web-games/account', ''), bannerOutsideContent: outside, topbar: !!document.querySelector('button[aria-label="Communication Hub"]'), bannerH: getComputedStyle(document.getElementById('app-root') || document.body).getPropertyValue('--app-notice-banner-height')}; };
run(async (page) => {
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(1500);
  out.dash = {t: new Date().toISOString(), ...(await page.evaluate(B))};
  await clientNav(page, '/for/web-games/account/53105/projects/317869/site-builder/6ad70d7041c7b5ba37552ddd/editor');
  await settle(page, {stableMs: 3000}); await page.waitForTimeout(6000);
  out.editor = {t: new Date().toISOString(), ...(await page.evaluate(B)), content: await page.evaluate(() => (document.getElementById('app-root__content')?.innerText || '').replace(/\n+/g, '|').slice(0, 100))};
  await clientNav(page, '/for/web-games/account/53105/dashboard');
  await settle(page, {stableMs: 2500}); await page.waitForTimeout(1500);
  out.dashAgain = {t: new Date().toISOString(), ...(await page.evaluate(B))};
  return out;
});
