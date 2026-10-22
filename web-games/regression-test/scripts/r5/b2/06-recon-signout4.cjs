// Dry run 4: list all clickable elements in the topbar row; try the right-most ones until Sign out is visible. Does NOT click Sign out.
const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const cands = await page.evaluate(() => [...document.querySelectorAll('nav.app-navigation button, nav.app-navigation [role=button], nav.app-navigation a')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top > 60 && r.top < 140; }).map((e, i) => { e.dataset.r5i = undefined; const r = e.getBoundingClientRect(); return {i, tag: e.tagName, cls: String(e.className).slice(0, 60), text: e.innerText.replace(/\n/g, ' ').slice(0, 25), x: Math.round(r.left), y: Math.round(r.top + r.height / 2), cx: Math.round(r.left + r.width / 2)}; }));
  const so = page.locator('button.profile-dropdown__action').filter({hasText: /^\s*Sign out\s*$/}).first();
  let opened = null;
  for (const c of [...cands].sort((a, b) => b.x - a.x).slice(0, 4)) {
    await page.mouse.click(c.cx, c.y);
    await page.waitForTimeout(700);
    if (await so.isVisible().catch(() => false)) { opened = c; break; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  return {cands, opened, stillVisible: await so.isVisible().catch(() => false), url: page.url()};
});
