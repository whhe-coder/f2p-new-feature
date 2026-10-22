const {run, BASE, redact} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const out = {};
  const reqs = [];
  page.on('request', r => { if (/salescards|handle_all_utms|assign_to_user/.test(r.url())) reqs.push({t: new Date().toISOString(), m: r.method(), url: redact(r.url()).replace(/^https:\/\/[^/]+/, '')}); });
  page.on('response', r => { if (/salescards/.test(r.url())) reqs.push({t: new Date().toISOString(), status: r.status(), url: redact(r.url()).replace(/^https:\/\/[^/]+/, '')}); });
  for (const q of ['spring%26x%3D1', 'a%23b']) {
    reqs.length = 0;
    await page.goto(`${BASE}/53105/dashboard?utm_campaign=${q}`, {waitUntil: 'domcontentloaded'});
    await waitApp(page);
    await page.waitForTimeout(9000);
    const modal = await page.evaluate(() => { const m = document.querySelector('[data-id=upsell-modal]'); return m ? m.innerText.replace(/\n+/g, '|').slice(0, 120) : null; });
    let closed = null;
    if (modal) { await page.locator('[data-id=upsell-modal] button[aria-label=Close]').click(); await page.waitForTimeout(800); closed = !(await page.locator('[data-id=upsell-modal]').count()); }
    out[q] = {reqs: reqs.slice(), modal, closedByX: closed, url: page.url().replace(BASE, '')};
  }
  return out;
});
