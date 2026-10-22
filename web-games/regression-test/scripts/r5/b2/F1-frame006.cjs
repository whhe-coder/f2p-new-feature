// RT-FRAME-006: salescards/{id} -> 404, 500, network failure (same load, remount via search change), then 401 on a fresh load.
const {run, BASE, clientNav} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
const P = '/for/web-games/account/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=2';
run(async (page) => {
  const log = await t.setup(page);
  const s = {};
  const step = async (name, mock, nav) => {
    log.mocks.card = {re: /\/merchants\/53105\/salescards\/9001(\?|$)/, ...mock};
    const n = log.mockHits.length;
    await nav();
    await t.waitFor(page, () => log.mockHits.length > n, 50000);
    await page.waitForTimeout(4000);
    s[name] = {...(await t.pageState(page)), logoutSoFar: log.logout.length};
  };
  await step('e404', {status: 404}, () => page.goto(`${BASE}/53105/frame/documentation?upsell-card-id=9001&upsell-step-id=2`, {waitUntil: 'domcontentloaded'}));
  await step('e500', {status: 500}, () => clientNav(page, P + '&r=1'));
  await step('blocked', {abort: true}, () => clientNav(page, P + '&r=2'));
  await page.waitForTimeout(1000);
  await step('e401', {status: 401}, () => clientNav(page, P + '&r=3'));
  await t.waitFor(page, () => log.logout.length > 0, 5000);
  await page.waitForTimeout(3000);
  s.after401 = await t.pageState(page);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {s, ...t.summary(log), fresh};
});
