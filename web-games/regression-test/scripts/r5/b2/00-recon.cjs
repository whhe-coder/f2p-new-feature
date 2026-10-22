// Recon: dashboard GW requests, token boolean, cookie names (no values).
const {run, BASE} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
run(async (page, ctx) => {
  const log = w.watch(page);
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(40000);
  const tok = await w.tokenPresent(page);
  const cookies = w.cookieMeta(await ctx.cookies()).filter(c => /srv\.local/.test(c.domain));
  return {url: page.url(), tok, gw: log.gw.map(x => `${x.at.slice(14, 19)} ${x.m} ${x.s} ${x.p}`), navs: log.navs, authLogCount: log.authLogCount, console: log.console.slice(0, 10), cookies};
});
