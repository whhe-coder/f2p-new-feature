const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/tax-interview`, {waitUntil: 'domcontentloaded'});
  const u = await settle(page, {stableMs: 4000});
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => { const c = document.getElementById('app-root__content');
    return {p: location.pathname, txt: (c?.innerText || '').slice(0, 500), btns: [...(c ? c.querySelectorAll('a,button,[role=button]') : [])].map(b => ({tag: b.tagName, id: b.getAttribute('data-id') || b.getAttribute('data-testid'), t: b.textContent.trim().slice(0, 40), href: b.getAttribute('href')})).slice(0, 30)}; });
  return {u: u.replace(BASE, '{base}'), info};
});
