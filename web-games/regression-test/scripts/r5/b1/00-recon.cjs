const {run, BASE, collect, settle, readStore, redact} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const bodies = {};
  page.on('response', async r => {
    const u = r.url();
    if (/metrics\/balance|get_init_info/.test(u)) {
      try { const j = await r.json(); bodies[u.split('?')[0].split('/').slice(-2).join('/')] = /balance/.test(u) ? j : {userLocale: j?.user?.locale, keys: Object.keys(j || {}), userKeys: Object.keys(j?.user || {})}; } catch (e) {}
    }
  });
  const log = collect(page, /gateway|xmts|users\/location/);
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForSelector('[data-id="dashboard-balance"], [data-id="ask-ai-banner"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(3000);
  const store = await readStore(page, s => ({locale: s.locale && s.locale.currentLocale, userLocale: s.user && s.user.user && s.user.user.locale, role: s.merchant && (s.merchant.role || (s.merchant.merchant && s.merchant.merchant.role)), merchantKeys: Object.keys(s.merchant || {}), topKeys: Object.keys(s)}));
  const dom = await page.evaluate(() => ({
    askAi: !!document.querySelector('[data-id="ask-ai-banner"]'),
    chips: [...document.querySelectorAll('[class*="ask-ai__chip"]')].map(e => e.textContent),
    balance: document.querySelector('[data-id="dashboard-balance"]')?.innerText.slice(0, 300),
    topbarButtons: [...document.querySelectorAll('header button, [class*="topbar"] button, [class*="Topbar"] button')].map(b => ({t: b.innerText.slice(0, 30), aria: b.getAttribute('aria-label'), did: b.getAttribute('data-id'), cls: b.className.slice(0, 80)})).slice(0, 30),
    htmlLang: document.documentElement.lang,
    cookies: document.cookie.split('; ').filter(c => /locale/i.test(c)),
    ls: localStorage.getItem('i18nextLng'),
  }));
  return {url: redact(page.url()), store, dom, bodies, gwReq: log.requests.filter(r => /balance|get_init|location|role|merchants\/53105$/.test(r.url)).slice(0, 20)};
});
