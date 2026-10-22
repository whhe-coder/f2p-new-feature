const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(1500);
  const before = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=menuitem]')].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 25)));
  await page.getByRole('button', {name: 'User', exact: true}).click();
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => [...document.querySelectorAll('a,button,[role=menuitem]')].filter(e => e.getBoundingClientRect().width > 0).map(e => ({t: (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 25), tag: e.tagName, id: e.getAttribute('data-id'), href: e.getAttribute('href')})));
  const bset = new Set(before);
  return {newItems: after.filter(x => !bset.has(x.t))};
});
