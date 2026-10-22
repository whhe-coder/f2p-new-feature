// RT-UI-013 step 4 (en -> de, then reload) + RT-ANA-008 exv capture; restore en.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const hits = h.watchHits(page);
  const s = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  s.L0 = await h.state(page);
  await h.switchLang(page, 'de');
  s.de = await h.state(page);
  s.reloadAt = h.iso();
  await page.reload({waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(4000);
  s.afterReload = await h.state(page);
  // Restore: pick English even if the UI already shows EN, to write en back.
  await h.switchLang(page, 'en');
  s.restored = await h.state(page);
  return {s, loc, hits: hits.filter(x => x.en).map(x => ({at: x.at, en: x.en, ev: x.ev, exv: x.exv}))};
}, {allow: [/users\/location/]});
