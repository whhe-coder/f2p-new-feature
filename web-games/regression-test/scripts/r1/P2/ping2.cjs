const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const s401 = []; page.on('response', r => { if (r.status() === 401) s401.push(r.url().replace(/\?.*/, '').slice(0, 100)); });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  const out = [];
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(4000); out.push(await readStore(page, st => ({cur: st.projects.currentProject && st.projects.currentProject.id, n: (st.projects.items || []).length, loading: st.projects.isLoading}))); }
  return {url: page.url().replace(/^.*\/account/, ''), s401, out};
});
