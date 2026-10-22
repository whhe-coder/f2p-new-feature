const {run, BASE, settle, readStore} = require(__dirname + '/../lib.cjs'); const blockedNav = () => null;
run(async (page) => {
  const s401 = [];
  page.on('response', r => { if (r.status() === 401) s401.push(r.url().replace(/\?.*/, '').slice(0, 100)); });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Dashboard|Get started/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(5000);
  return {blocked: blockedNav(), url: page.url().replace(/^.*\/account/, ''), s401, s: await readStore(page, st => ({cur: st.projects.currentProject && st.projects.currentProject.id, admin: st.user && st.user.user && st.user.user.is_admin, hasToken: Boolean(st.user && st.user.token)}))};
});
