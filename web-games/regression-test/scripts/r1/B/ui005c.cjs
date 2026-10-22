const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForSelector('.site-builder-app [aria-label=Actions]', {timeout: 50000});
  const before = await page.evaluate(() => document.body.innerText.length);
  await page.locator('.site-builder-app [aria-label=Actions]').first().click();
  await page.waitForTimeout(1200);
  const items = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem], [role=menu] *, [role=option]')].map(e => (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 30)).filter(Boolean).slice(0, 20));
  const url = page.url().replace(BASE, '');
  return {items: [...new Set(items)], url};
});
