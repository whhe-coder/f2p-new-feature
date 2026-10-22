// RT-AUTH-009: SDK request 401 (privileges).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page, ctx) => {
  const log = await t.setup(page);
  log.mocks.privileges = {re: /\/api\/account\/platform\/53105\/privileges/, status: 401};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await t.waitFor(page, () => log.mockHits.length > 0, 50000);
  await page.waitForTimeout(600);
  const at600ms = await t.pageState(page);
  const cookieBeforeLogout = (await ctx.cookies()).filter(c => /pa-v4-token/.test(c.name)).map(c => `${c.name}@${c.domain} httpOnly=${c.httpOnly}`);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(5000);
  const after = await t.pageState(page);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {at600ms, cookieBeforeLogout, after, ...t.summary(log), fresh};
});
