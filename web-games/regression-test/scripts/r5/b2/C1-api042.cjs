// RT-API-042: currency/list 401 on the project webhooks payments tab (host gatewayInstance, webhookRemotes.tsx useCurrency).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page) => {
  const log = await t.setup(page);
  log.mocks.currency = {re: /\/mapi\/merchant\/current\/currency\/list/, status: 401};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks/payments`, {waitUntil: 'domcontentloaded'});
  const hit = await t.waitFor(page, () => log.mockHits.length > 0, 55000);
  const at0 = await t.pageState(page);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(3000);
  const after = await t.pageState(page);
  const gwPaths = hit ? undefined : log.gw.map(x => `${x.at.slice(14, 19)} ${x.s} ${x.p}`);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {hit, at0, after, gwPaths, ...t.summary(log), fresh};
});
