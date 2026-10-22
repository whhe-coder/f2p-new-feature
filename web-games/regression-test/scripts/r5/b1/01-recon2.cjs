const {run, BASE, settle, readStore, redact} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  let init = null;
  page.on('response', async r => { if (/get_init_info/.test(r.url())) { try { const j = await r.json(); init = {locale: j.result?.user?.locale, resultKeys: Object.keys(j.result || {})}; } catch (e) {} } });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 70000}).catch(() => {});
  await page.waitForTimeout(2000);
  const store = await readStore(page, s => ({merchants: Object.keys(s.merchants || {}), merchRole: s.merchants && (s.merchants.role || s.merchants.current?.role || s.merchants.merchant?.role), merchSample: JSON.stringify(s.merchants).slice(0, 600), accounts: Array.isArray(s.accounts?.accounts) ? s.accounts.accounts.length : Object.keys(s.accounts || {}), projectsKeys: Object.keys(s.projects || {}), upsell: s.upsell}));
  const dom = await page.evaluate(() => {
    const els = [...document.querySelectorAll('body *')].filter(e => e.children.length === 0 && /^\s*EN\s*$/i.test(e.textContent));
    return els.slice(0, 5).map(e => { const b = e.closest('button,[role=button],a') || e; return {tag: b.tagName, did: b.getAttribute('data-id'), aria: b.getAttribute('aria-label'), cls: String(b.className).slice(0, 100), html: b.outerHTML.slice(0, 300)}; });
  });
  return {init, store, dom};
});
