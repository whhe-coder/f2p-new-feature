// Dry run 3: profile trigger in nav.app-navigation (fixed position, so use rects). Opens the dropdown, checks Sign out is visible, closes. Does NOT click Sign out.
const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const cands = await page.evaluate(() => [...document.querySelectorAll('nav.app-navigation *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < 160 && /profile|avatar|user|account/i.test(String(e.className) + ' ' + (e.getAttribute('data-id') || '')); }).map(e => ({tag: e.tagName, cls: String(e.className).slice(0, 70), dataId: e.getAttribute('data-id'), text: e.innerText.slice(0, 25), r: (r => [Math.round(r.left), Math.round(r.top), Math.round(r.width)])(e.getBoundingClientRect())})).slice(0, 15));
  const so = page.locator('button.profile-dropdown__action').filter({hasText: /^\s*Sign out\s*$/}).first();
  let opened = null;
  for (const c of cands) {
    if (!c.cls) continue;
    const sel = 'nav.app-navigation .' + c.cls.split(' ')[0];
    await page.locator(sel).first().click({timeout: 2000}).catch(() => {});
    await page.waitForTimeout(700);
    if (await so.isVisible().catch(() => false)) { opened = sel; break; }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  return {cands, opened, stillVisible: await so.isVisible().catch(() => false), url: page.url()};
});
