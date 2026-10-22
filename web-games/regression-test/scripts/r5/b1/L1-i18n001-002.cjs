// RT-I18N-001 (topbar -> ja, no reload), RT-I18N-008 (ja date), RT-I18N-002 (hard reload keeps?).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const hits = h.watchHits(page);
  const steps = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.evaluate(() => { window.__r5marker = 'L1-' + Date.now(); });
  steps.L0 = await h.state(page);
  steps.items = await h.menuItems(page);
  await h.switchLang(page, 'ja');
  steps.ja = await h.state(page);
  steps.jaDom = await page.evaluate(() => ({balance: document.querySelector('[data-id="dashboard-balance"]')?.innerText.replace(/\n/g, ' | ').slice(0, 200), askAi: document.querySelector('[data-id="ask-ai-banner"]')?.innerText.replace(/\n/g, ' | ').slice(0, 200)}));
  // RT-I18N-002: hard reload while ja.
  steps.reloadAt = h.iso();
  await page.reload({waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(2000);
  steps.afterReload = await h.state(page);
  steps.afterReloadDom = await page.evaluate(() => document.querySelector('[data-id="dashboard-balance"]')?.innerText.replace(/\n/g, ' | ').slice(0, 200));
  // Restore: switch to en if needed (store says otherwise), then reload and confirm.
  if (steps.afterReload.currentLocale !== 'en') await h.switchLang(page, 'en');
  return {steps, loc, hits: hits.map(x => ({at: x.at, en: x.en, ev: x.ev}))};
}, {allow: [/users\/location/]});
