// RT-AUTH-010: host (metrics/balance) and SDK (privileges, organization detail) requests all 401.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page) => {
  const log = await t.setup(page);
  log.mocks.privileges = {re: /\/api\/account\/platform\/53105\/privileges/, status: 401};
  log.mocks.features = {re: /\/mapi\/merchant\/v2\/merchants\/53105\/features/, status: 401};
  log.mocks.balance = {re: /\/analytics\/metrics\/balance/, status: 401};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await t.waitFor(page, () => log.mockHits.length > 0, 50000);
  await page.waitForTimeout(12000);
  const after = await t.pageState(page);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {after, ...t.summary(log), fresh};
});
