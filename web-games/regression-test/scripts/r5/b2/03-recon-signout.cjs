// Dry run: find how to open the profile dropdown and see the Sign out button. Does NOT click Sign out.
const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const so = page.locator('button.profile-dropdown__action, button[class*="profile-dropdown__action"]').filter({hasText: /^\s*Sign out\s*$/});
  const before = {count: await so.count(), visible: await so.first().isVisible().catch(() => false)};
  const triggers = await page.evaluate(() => [...document.querySelectorAll('header *, [class*="topbar" i] *')].filter(e => /profile|avatar|user|merchant/i.test(String(e.className)) && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') && e.offsetParent).map(e => ({tag: e.tagName, cls: String(e.className).slice(0, 80), dataId: e.getAttribute('data-id'), text: e.innerText.slice(0, 30)})).slice(0, 10));
  let opened = null;
  for (const sel of ['[class*="topbar" i] [class*="profile" i][role=button]', '[class*="topbar" i] button[class*="profile" i]', '[class*="topbar" i] [class*="avatar" i]', '[class*="profile-trigger" i]']) {
    const l = page.locator(sel).first();
    if (await l.count() && await l.isVisible().catch(() => false)) {
      await l.click().catch(() => {});
      await page.waitForTimeout(800);
      if (await so.first().isVisible().catch(() => false)) { opened = sel; break; }
    }
  }
  await page.keyboard.press('Escape');
  return {before, triggers, opened, afterVisible: await so.first().isVisible().catch(() => false)};
});
