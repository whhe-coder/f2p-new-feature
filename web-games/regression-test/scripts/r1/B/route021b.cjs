const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.setViewportSize({width: 1280, height: 500});
  await page.goto(`${BASE}/53105/projects/317869/storefront/virtual-currency/packages`, {waitUntil: 'domcontentloaded'});
  const u = await settle(page, {stableMs: 5000});
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const se = document.scrollingElement;
    const c = document.getElementById('app-root__content');
    const links = [...(c ? c.querySelectorAll('a, [role=tab], button') : [])].map(a => ({tag: a.tagName, id: a.getAttribute('data-id') || a.getAttribute('data-testid'), href: a.getAttribute('href'), t: a.textContent.trim().slice(0, 30)})).filter(x => x.t || x.href).slice(0, 50);
    return {url: location.pathname, scrollH: se.scrollHeight, clientH: se.clientHeight, links};
  });
  return {u: u.replace(BASE, '{base}'), info};
});
