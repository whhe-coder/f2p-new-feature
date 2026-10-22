const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.setViewportSize({width: 1280, height: 600});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const se = document.scrollingElement;
    window.scrollTo(0, 100000);
    const links = [...document.querySelectorAll('.app-root__sidebar-fixed a, .app-root__sidebar-fixed [data-id]')].map(a => ({tag: a.tagName, id: a.getAttribute('data-id'), href: a.getAttribute('href'), t: a.textContent.trim().slice(0, 30)})).slice(0, 60);
    return {scrollH: se.scrollHeight, clientH: se.clientHeight, scrollY: window.scrollY, links};
  });
  return {info};
});
