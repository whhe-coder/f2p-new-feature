// Read-only final check: reload N times; read get_init_info user.locale, store locale and current project. No writes allowed.
const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
const n = Number(process.argv[2] || 2);
run(async (page) => {
  const loc = h.watchLocale(page);
  const rounds = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
    else { await page.waitForTimeout(30000); await page.reload({waitUntil: 'domcontentloaded'}); }
    await h.waitApp(page, '[data-id="dashboard-balance"]');
    await page.waitForTimeout(1500);
    const st = await h.state(page);
    const p = await readStore(page, s => ({currentProject: s.projects.currentProject && (s.projects.currentProject.id || s.projects.currentProject), merchant: s.merchants.current && s.merchants.current.id, role: s.merchants.current && s.merchants.current.role}));
    rounds.push({at: st.at, store: st.currentLocale, user: st.userLocale, topbar: st.topbar, paLocale: st.paLocale, i18nextLng: st.i18nextLng, htmlLang: st.htmlLang, liveChat: st.liveChat, ...p});
  }
  const ls = await page.evaluate(() => ({selection: Object.keys(localStorage).filter(k => /setup-selection/.test(k)), promoDismissed: localStorage.getItem('wg-pa-promo-banner-dismissed')}));
  return {rounds, init: loc.init, ls};
});
