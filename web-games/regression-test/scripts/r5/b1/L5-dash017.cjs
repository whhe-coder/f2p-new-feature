// RT-DASH-017: balance mocked to 1234567.5 (metrics/balance fulfilled in the browser), languages en/de/es/pt/fr/ru, back to en.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const mocked = [];
  await page.route(/\/metrics\/balance(\?|$)/, r => { mocked.push(h.iso()); return r.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({value: 1234567.5, currency_iso_name: 'USD', last_transfer_date: '2026-10-07', next_transfer_date: '2026-10-28', is_next_transfer_date_calculated_approximately: true})}); });
  const loc = h.watchLocale(page);
  const read = () => page.evaluate(() => {
    const b = document.querySelector('[data-id="dashboard-balance"]');
    const v = b && b.querySelector('[class*="dashboard-balance__value"]');
    return {value: v && v.innerText, currency: b && (b.querySelector('[class*="dashboard-balance__currency"]') || {}).innerText, payouts: b && [...b.querySelectorAll('[class*="payout__value"]')].map(e => e.innerText)};
  });
  const out = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[class*="dashboard-balance__value"]');
  out.en = await read();
  for (const c of ['de', 'es', 'pt', 'fr', 'ru']) { await h.switchLang(page, c); out[c] = await read(); out[c].store = (await h.state(page)).currentLocale; }
  await h.switchLang(page, 'en');
  out.back = await read();
  out.final = await h.state(page);
  return {out, mockedBalanceCalls: mocked.length, loc: loc.location.filter(x => x.body || x.status).map(x => `${x.at.slice(11, 19)} ${x.body || x.status}`)};
}, {allow: [/users\/location/]});
