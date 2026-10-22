// RT-API-042: currency/list -> 401. The Testing section (which mounts PaymentsTab -> useCurrency) only renders when
// project detail has ipn_enabled && payment_url, so the real GET /api/project/detail/317869 response is patched in the
// browser (this tab only; nothing is written). Then expand Testing and open the Dispute tab.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const t = require(__dirname + '/t.cjs');
run(async (page) => {
  const log = await t.setup(page);
  const patched = [];
  await page.route(/\/api\/project\/detail\/317869/, async r => {
    if (r.request().method() !== 'GET') return r.fallback();
    const resp = await r.fetch();
    const j = await resp.json();
    const o = j && j.result && typeof j.result === 'object' ? j.result : j;
    patched.push({at: w.iso(), from: {ipn_enabled: o.ipn_enabled, payment_url: o.payment_url ? 'set' : String(o.payment_url)}});
    o.ipn_enabled = true;
    o.payment_url = 'https://example.invalid/r5-webhook';
    return r.fulfill({response: resp, contentType: 'application/json', body: JSON.stringify(j)});
  });
  log.mocks.currency = {re: /\/mapi\/merchant\/current\/currency\/list/, status: 401};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks/dispute`, {waitUntil: 'domcontentloaded'});
  const found = await page.waitForSelector('.webhooks-v2-testing', {timeout: 55000}).then(() => true).catch(() => false);
  await page.waitForTimeout(1000);
  let clicked = null;
  if (found && !log.mockHits.length) {
    const acc = page.locator('.webhooks-v2-testing').getByText('Testing', {exact: false}).first();
    await acc.click({timeout: 4000}).then(() => { clicked = 'title'; }).catch(e => { clicked = 'err ' + String(e).slice(0, 60); });
    await page.waitForTimeout(1500);
  }
  const testingText = await page.evaluate(() => { const el = document.querySelector('.webhooks-v2-testing'); return el ? el.innerText.replace(/\n+/g, ' | ').slice(0, 200) : null; });
  const hit = await t.waitFor(page, () => log.mockHits.length > 0, 8000);
  const at0 = await t.pageState(page);
  await t.waitFor(page, () => log.logout.length > 0, 6000);
  await page.waitForTimeout(3000);
  const after = await t.pageState(page);
  log.mocks = {};
  await page.unroute(/\/api\/project\/detail\/317869/);
  const fresh = await w.freshCheck(page);
  return {patched, found, clicked, testingText, hit, at0, after, ...t.summary(log), fresh};
});
