// RT-AUTH-014 step 3 (variant): Sign out while /logout is blocked by the lib guard (allowLogout: false).
// Expect: httpOnly pa-v4-token survives; a fresh load is still signed in. No session change.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
run(async (page, ctx) => {
  const log = w.watch(page);
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const so = page.locator('button.profile-dropdown__action').filter({hasText: /^\s*Sign out\s*$/}).first();
  await page.locator('nav.app-navigation button.topbar__icon-button').last().click();
  await so.waitFor({state: 'visible', timeout: 5000});
  const clickAt = w.iso();
  await so.click();
  await page.waitForTimeout(4000);
  const tokenCookies = (await ctx.cookies()).filter(c => /pa-v4-token/.test(c.name)).map(c => `${c.name}@${c.domain} httpOnly=${c.httpOnly}`);
  const urlAfterClick = w.short(page.url());
  const fresh = await w.freshCheck(page);
  await page.waitForTimeout(2000);
  const fresh2 = await w.tokenPresent(page);
  return {clickAt, urlAfterClick, tokenCookies, navs: log.navs.map(n => `${n.at.slice(11, 23)} ${n.ev} ${n.status || n.err || ''} ${n.url}`), fresh, fresh2};
});
