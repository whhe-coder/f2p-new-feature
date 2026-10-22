const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.setViewportSize({width: 1280, height: 500});
  await page.goto(`${BASE}/53105/projects/317869/storefront/virtual-currency/packages`, {waitUntil: 'domcontentloaded'});
  const u = await settle(page, {stableMs: 5000});
  await page.waitForTimeout(40000);
  const info = await page.evaluate(() => {
    const se = document.scrollingElement;
    const c = document.getElementById('app-root__content');
    const links = {cnt: c ? c.querySelectorAll("a,button").length : -1, txt: (c?.innerText||"").slice(0,400), iframes: [...document.querySelectorAll("iframe")].map(f=>f.src.slice(0,120)), html: (c?.innerHTML||"").slice(0,600)};
    return {url: location.pathname, scrollH: se.scrollHeight, clientH: se.clientHeight, links};
  });
  return {u: u.replace(BASE, '{base}'), info};
});
