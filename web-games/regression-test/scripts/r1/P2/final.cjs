const {run, BASE, HOST, readStore} = require(__dirname + '/../lib.cjs');
run(async (page, ctx) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  let s; for (let i = 0; i < 40; i++) { await page.waitForTimeout(2000); s = await readStore(page, st => ({cur: st.projects.currentProject && st.projects.currentProject.id, name: st.projects.currentProject && st.projects.currentProject.name})); if (s && s.cur) break; }
  const ls = await page.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (/setup-selection|enterAccountSeen|promo-banner|i18nextLng/i.test(k)) o[k] = localStorage.getItem(k); return {rel: o, n: Object.keys(localStorage).length}; });
  const ck = (await ctx.cookies(HOST)).filter(c => /^(sb-pa|network-pa|gc-pa|pa)-(locale|merchant-id|project-id)$/.test(c.name)).map(c => `${c.name}=${c.value}|${c.domain}|${c.path}|${c.sameSite}|${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'}`);
  const other = (await ctx.cookies(HOST)).filter(c => /^network-pa/.test(c.name)).map(c => `${c.name}|${c.domain}|${c.path}|${c.sameSite}|${c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'}`);
  return {url: page.url().replace(/^.*\/account/, ''), s, ls, ck, networkPa: other};
});
