const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const S = () => ({y: window.scrollY, h: document.scrollingElement.scrollHeight, c: document.scrollingElement.clientHeight, p: location.pathname.replace('/for/web-games/account', '')});
const findHistory = () => {
  const el = document.getElementById('root');
  const key = Object.keys(el).find(k => k.startsWith('__reactContainer'));
  const st = [el[key]]; let n = 0;
  while (st.length && n++ < 30000) { const f = st.pop(); if (!f) continue;
    const h = f.memoizedProps && f.memoizedProps.history;
    if (h && typeof h.push === 'function' && typeof h.listen === 'function') { window.__rh = h; return true; }
    if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child); }
  return false;
};
run(async (page) => {
  const out = {};
  await page.setViewportSize({width: 1280, height: 500});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo(0, 100000));
  out.dashBefore = await page.evaluate(S);
  await page.click('[data-id="sidebar-projects"]');
  await page.waitForTimeout(4000);
  out.afterSidebarClick = await page.evaluate(S);
  out.t1 = new Date().toISOString();
  out.hasHistory = await page.evaluate(findHistory);
  // part 2: PUSH between packages sub-pages (ignoreScrollPattern)
  await page.evaluate(() => window.__rh.push('/53105/projects/317869/storefront/virtual-currency/packages'));
  await page.waitForTimeout(3000);
  await page.setViewportSize({width: 1280, height: 200});
  await page.evaluate(() => window.scrollTo(0, 100000));
  out.pkgBefore = await page.evaluate(S);
  out.action1 = await page.evaluate(() => { window.__rh.push('/53105/projects/317869/storefront/virtual-currency/packages/sub-x'); return window.__rh.action; });
  await page.waitForTimeout(1500);
  out.pkgAfterPush = await page.evaluate(S);
  out.action2 = await page.evaluate(() => { window.__rh.goBack(); return 'goBack'; });
  await page.waitForTimeout(1500);
  out.pkgAfterBack = await page.evaluate(S);
  out.pkgAfterBackAction = await page.evaluate(() => window.__rh.action);
  // control: PUSH to a non-ignored page from scrolled state
  await page.evaluate(() => window.scrollTo(0, 100000));
  out.ctrlBefore = await page.evaluate(S);
  await page.evaluate(() => window.__rh.push('/53105/projects/317869/storefront/virtual-items'));
  await page.waitForTimeout(1500);
  out.ctrlAfter = await page.evaluate(S);
  out.t2 = new Date().toISOString();
  return out;
});
