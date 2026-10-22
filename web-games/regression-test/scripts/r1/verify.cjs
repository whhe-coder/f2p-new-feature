const {run, BASE, readStore, settle} = require('./lib.cjs');
run(async page => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  const landed = await settle(page, {stableMs: 4000, timeoutMs: 45000});
  await page.waitForTimeout(8000);
  const store = await readStore(page, s => {
    const keys = Object.keys(s);
    const u = s.user || {};
    const user = u.data || u.user || u;
    return {
      sliceKeys: keys,
      userKeys: Object.keys(user || {}).slice(0, 40),
      admin: user && user.admin,
      roles: (s.privileges && (s.privileges.roles || (s.privileges.data && s.privileges.data.roles))) || null,
      privilegeCount: s.privileges && JSON.stringify(s.privileges).length,
    };
  });
  const ls = await page.evaluate(() => Object.keys(localStorage));
  const build = await page.evaluate(() => [...document.scripts].map(s => s.src).find(s => /main\..*\.js/.test(s)) || null);
  return {landed, build, store, localStorageKeys: ls};
});
