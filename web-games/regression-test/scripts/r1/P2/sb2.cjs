const {run, BASE, HOST, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {findRemote} = require(__dirname + '/../P2/fib.cjs');
const sbCookies = async ctx => Object.fromEntries((await ctx.cookies(HOST)).filter(c => /^sb-pa-/.test(c.name)).map(c => [c.name, `${c.value}|${c.domain}|${c.path}|${c.sameSite}|${new Date(c.expires * 1000).toISOString()}`]));
run(async (page, ctx) => {
  const t0 = Date.now(); const steps = [];
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(500); const r = await findRemote(page, 'site-builder'); if (r.hostText && /Draft|Publish|Web Shop/i.test(r.hostText)) break; }
  steps.push({label: 'sb 317869', t: Date.now() - t0, r: await findRemote(page, 'site-builder', 'sb'), c: await sbCookies(ctx)});
  await clientNav(page, '/for/web-games/account/53105/projects/316818/site-builder');
  const poll = []; let last = '';
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); const r = await findRemote(page, 'site-builder'); const s = JSON.stringify(r); if (s !== last) { poll.push({t: Date.now() - t0, ...r}); last = s; } }
  steps.push({label: 'sb 316818', url: page.url().replace(/^.*\/account/, ''), poll, c: await sbCookies(ctx), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  await clientNav(page, '/for/web-games/account/53105/projects/317869/site-builder'); await page.waitForTimeout(6000);
  steps.push({label: 'back', url: page.url().replace(/^.*\/account/, ''), r: await findRemote(page, 'site-builder'), c: await sbCookies(ctx), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  return {steps};
});
