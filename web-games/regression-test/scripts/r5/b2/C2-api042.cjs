// RT-API-042: open project webhooks, click the "Payments" testing tab; currency/list -> 401.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page) => {
  const log = await t.setup(page);
  log.mocks.currency = {re: /\/mapi\/merchant\/current\/currency\/list/, status: 401};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await t.waitFor(page, () => log.gw.some(x => /store\/webhook\/settings|webhook_storage_integration/.test(x.p)), 50000);
  await page.waitForTimeout(3000);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('button, [role=tab], a')].map(e => (e.innerText || '').trim()).filter(x => x && x.length < 40).slice(0, 60));
  const target = page.locator('button, [role=tab], a, [role=radio], label').filter({hasText: /^\s*Payments\s*$/}).first();
  let clicked = false;
  if (await target.count()) { await target.click({timeout: 5000}).then(() => { clicked = true; }).catch(() => {}); }
  const hit = await t.waitFor(page, () => log.mockHits.length > 0, 15000);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(2500);
  const after = await t.pageState(page);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {tabs, clicked, hit, after, ...t.summary(log), fresh};
});
