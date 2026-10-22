// Read-only: reload the dashboard N times and record get_init_info user.locale (no writes allowed).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
const n = Number(process.argv[2] || 4);
const gap = Number(process.argv[3] || 20000);
run(async (page) => {
  const loc = h.watchLocale(page);
  const rounds = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
    else { await page.waitForTimeout(gap); await page.reload({waitUntil: 'domcontentloaded'}); }
    await h.waitApp(page, '[data-id="dashboard-balance"]');
    const st = await h.state(page);
    rounds.push({at: st.at, store: st.currentLocale, user: st.userLocale, topbar: st.topbar});
  }
  return {rounds, init: loc.init};
});
