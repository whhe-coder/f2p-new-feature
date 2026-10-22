// Restore: pick English in the topbar (writes {"locale":"en"}), then reload N times and read get_init_info.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
const n = Number(process.argv[2] || 3);
const gap = Number(process.argv[3] || 20000);
run(async (page) => {
  const loc = h.watchLocale(page);
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  const before = await h.state(page);
  await h.switchLang(page, 'en');
  const after = await h.state(page);
  const rounds = [];
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(gap);
    await page.reload({waitUntil: 'domcontentloaded'});
    await h.waitApp(page, '[data-id="dashboard-balance"]');
    const st = await h.state(page);
    rounds.push({at: st.at, store: st.currentLocale, user: st.userLocale, topbar: st.topbar});
  }
  return {before: [before.currentLocale, before.userLocale], after: [after.currentLocale, after.userLocale], rounds, loc};
}, {allow: [/users\/location/]});
