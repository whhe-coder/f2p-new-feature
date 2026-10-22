const {run, BASE, settle, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const urls = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) urls.push(f.url().replace(BASE, '')); });
  const t0 = Date.now();
  page.on('request', r => { if (r.isNavigationRequest()) urls.push('NAVREQ ' + r.url().replace(BASE, '')); });
  await page.goto(`${BASE}/53105/projects/317869/sdk`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 3000});
  // capture client-side URL changes
  await page.exposeFunction('__rec', u => urls.push((Date.now() - t0) + 'ms ' + u.replace('/for/web-games/account', '')));
  await page.addInitScript(() => { const w = (fn) => function (...a) { const r = fn.apply(this, a); try { window.__rec && window.__rec(location.pathname); } catch (e) {} return r; }; history.pushState = w(history.pushState); history.replaceState = w(history.replaceState); });
  await page.reload({waitUntil: 'commit'});
  const tr = Date.now();
  const link = page.locator('[data-id="sidebar-other-tools-cloud-gaming"]');
  await link.waitFor({state: 'attached', timeout: 60000});
  const vis = await link.isVisible();
  const loader = await page.evaluate(() => !!document.querySelector('.auth-loading, [aria-busy=true]'));
  if (!vis) await page.locator('[data-id="sidebar-other-tools"]').click();
  await link.click({timeout: 10000});
  const clickedAt = Date.now() - tr;
  await page.waitForTimeout(6000);
  const final = page.url().replace(BASE, '');
  const s = await readStore(page, st => ({cur: st.projects?.currentProject?.id ?? st.projects?.currentID}));
  return {vis, loaderPresentAtClick: loader, clickedAtMsAfterReload: clickedAt, final, urls, s};
});
