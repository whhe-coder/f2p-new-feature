const {run, BASE, collect, settle, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(8000);
  const ls = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const rel = /setup-selection|enterAccountSeen|promo-banner|i18nextLng|locale|sidebar/i;
    const vals = {};
    for (const k of keys) if (rel.test(k)) vals[k] = localStorage.getItem(k).slice(0, 80);
    return {keys, vals, cookieNames: document.cookie.split(';').map(c => c.split('=')[0].trim())};
  });
  const s = await readStore(page, st => {
    const p = st.projects || {};
    const list = p.list || p.items || p.projects || [];
    return {
      projectsKeys: Object.keys(p),
      cur: p.currentProject && p.currentProject.id, curName: p.currentProject && p.currentProject.name,
      curKeys: p.currentProject && Object.keys(p.currentProject),
      listLen: Array.isArray(list) ? list.length : typeof list,
      userId: st.user && (st.user.id || (st.user.user && st.user.user.id)),
      userKeys: st.user && Object.keys(st.user).slice(0, 30),
      topKeys: Object.keys(st),
    };
  });
  return {url: page.url(), ls, s};
});
