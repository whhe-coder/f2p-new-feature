// Full load a non-project page and read currentProject after the project list arrives.
const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const s401 = []; page.on('response', r => { if (r.status() === 401) s401.push(r.url().replace(/\?.*/, '').slice(0, 100)); });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  let s = null; const t0 = Date.now();
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(2000); s = await readStore(page, st => ({cur: st.projects.currentProject && st.projects.currentProject.id, name: st.projects.currentProject && st.projects.currentProject.name, n: (st.projects.items || []).length, first: (st.projects.items || [])[0] && st.projects.items[0].id})); if (s && s.cur) break; }
  return {url: page.url().replace(/^.*\/account/, ''), sec: Math.round((Date.now() - t0) / 1000), s401, s};
});
