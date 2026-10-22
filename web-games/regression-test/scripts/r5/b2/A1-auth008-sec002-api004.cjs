// RT-AUTH-008 / RT-SEC-002 / RT-API-004: host gateway 401 on metrics/balance (dashboard).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page, ctx) => {
  const log = await t.setup(page);
  log.mocks.balance = {re: /\/analytics\/metrics\/balance/, status: 401};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await t.waitFor(page, () => log.mockHits.length > 0, 50000);
  const at0 = await t.pageState(page);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(5000); // catch any repeat attempt
  const after = await t.pageState(page);
  const httpOnlyTokenCookie = (await ctx.cookies()).some(c => c.name === 'pa-v4-token' && c.httpOnly);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {at0, after, httpOnlyTokenCookie, ...t.summary(log), fresh};
});
