// RT-API-042: project webhooks -> expand the Testing accordion -> Dispute tab (PaymentsTab -> useCurrency); currency/list -> 401.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page) => {
  const log = await t.setup(page);
  log.mocks.currency = {re: /\/mapi\/merchant\/current\/currency\/list/, status: 401};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks/dispute`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.webhooks-v2-testing', {timeout: 55000}).catch(() => {});
  await page.waitForTimeout(1500);
  const header = await page.evaluate(() => { const el = document.querySelector('.webhooks-v2-testing'); return el ? el.innerText.slice(0, 120) : null; });
  let clicked = null;
  const acc = page.locator('.webhooks-v2-testing [aria-expanded], .webhooks-v2-testing button, .webhooks-v2-testing [role=button]').first();
  if (await acc.count()) { await acc.click({timeout: 5000}).then(() => { clicked = 'accordion'; }).catch(e => { clicked = 'err ' + String(e).slice(0, 80); }); }
  else { await page.locator('.webhooks-v2-testing').first().click({position: {x: 30, y: 20}}).then(() => { clicked = 'container'; }).catch(() => {}); }
  await page.waitForTimeout(1500);
  const tabsAfter = await page.evaluate(() => { const el = document.querySelector('.webhooks-v2-testing'); return el ? el.innerText.replace(/\n+/g, ' | ').slice(0, 200) : null; });
  if (!log.mockHits.length) {
    const tab = page.locator('.webhooks-v2-testing').getByText(/Dispute/i).first();
    if (await tab.count()) await tab.click({timeout: 4000}).catch(() => {});
  }
  const hit = await t.waitFor(page, () => log.mockHits.length > 0, 12000);
  const at0 = await t.pageState(page);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(3000);
  const after = await t.pageState(page);
  log.mocks = {};
  const fresh = await w.freshCheck(page);
  return {header, clicked, tabsAfter, hit, at0, after, ...t.summary(log), fresh};
});
