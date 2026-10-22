// C2 / S-26: real salescards/info for utm_campaign=spec-check-1,spec-check-2 (no mock, no writes allowed).
const {run, BASE, collect, redact} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const sc = [];
  page.on('request', r => { if (/salescards|handle_all_utms/.test(r.url())) sc.push({at: h.iso(), method: r.method(), url: redact(r.url())}); });
  page.on('response', async r => { if (/salescards|handle_all_utms/.test(r.url())) { let body = ''; try { body = (await r.text()).slice(0, 200); } catch (e) {} sc.push({at: h.iso(), status: r.status(), url: redact(r.url()), body}); } });
  page.on('requestfailed', r => { if (/salescards|handle_all_utms/.test(r.url())) sc.push({at: h.iso(), failed: r.failure() && r.failure().errorText, url: redact(r.url())}); });
  const start = h.iso();
  await page.goto(`${BASE}/53105/dashboard?utm_campaign=spec-check-1,spec-check-2`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(6000);
  const modal = await page.evaluate(() => { const m = document.querySelector('[data-id="upsell-modal"]'); return m ? m.innerText.slice(0, 300) : null; });
  let closed = null;
  if (modal) { await page.click('[data-id="upsell-modal"] button[aria-label="Close"]'); await page.waitForTimeout(800); closed = !(await page.$('[data-id="upsell-modal"]')); }
  return {start, url: redact(page.url()), sc, modal, closed};
});
