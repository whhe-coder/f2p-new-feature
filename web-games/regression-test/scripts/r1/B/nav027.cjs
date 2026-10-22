const {run, BASE, settle, clientNav} = require(__dirname + '/../lib.cjs');
const A = () => {
  const sb = document.querySelector('.app-root__sidebar-fixed'); if (!sb) return {noSidebar: true, p: location.pathname};
  const act = [...sb.querySelectorAll('*')].filter(e => e.getAttribute('aria-current') || /(^|[\s_-])(active|selected)/i.test(e.getAttribute('class') || '') || e.hasAttribute('data-active') || e.getAttribute('data-state') === 'active').map(e => ({tag: e.tagName, id: e.getAttribute('data-id') || e.closest('[data-id]')?.getAttribute('data-id'), ac: e.getAttribute('aria-current'), da: e.getAttribute('data-active'), cls: (e.getAttribute('class') || '').slice(0, 50), t: e.textContent.trim().slice(0, 20)}));
  const groups = [...sb.querySelectorAll('button[data-id]')].map(b => ({id: b.getAttribute('data-id'), exp: b.getAttribute('aria-expanded'), attrs: [...b.attributes].map(a => a.name).filter(n => !['class', 'type', 'data-id', 'aria-controls', 'aria-expanded', 'data-analytics-ev'].includes(n))})).filter(g => g.exp === 'true' || g.attrs.length);
  return {p: location.pathname.replace('/for/web-games/account', ''), act: act.slice(0, 8), groups};
};
run(async (page) => {
  const out = [];
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await require(__dirname + '/../B/h.cjs').waitApp(page); await page.waitForFunction(() => document.querySelector('[data-id=sidebar-sdk]'), null, {timeout: 40000}); await page.waitForTimeout(1500);
  out.push({base: await page.evaluate(A)});
  for (const p of ['/53105/analytics/main-info/afs/chargeback-registry', '/53105/saved-payout-methods', '/53105/projects/317869/storefront/virtual-items/x', '/53105/projects/317869/edit']) {
    await clientNav(page, `/for/web-games/account${p}`);
    const u = await settle(page, {stableMs: 2500});
    await page.waitForTimeout(1000);
    out.push({open: p, t: new Date().toISOString(), final: u.replace(BASE, ''), a: await page.evaluate(A)});
  }
  return {out};
});
