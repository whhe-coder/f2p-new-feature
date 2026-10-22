const {run, BASE, HOST, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
const cookieAttrs = async ctx => (await ctx.cookies(HOST)).filter(c => /^(sb-pa|network-pa|gc-pa)-/.test(c.name) && !/token/i.test(c.name)).map(c => ({n: c.name, d: c.domain, p: c.path, ss: c.sameSite, exp: new Date(c.expires * 1000).toISOString(), v: /project-id|merchant-id|locale/.test(c.name) ? c.value : '<hidden>'}));
run(async (page, ctx) => {
  const t0 = Date.now(); const steps = []; const ev = [];
  page.on('request', r => { if (/remoteEntry|remote-entry|site-builder|sitebuilder|network/i.test(r.url()) && ['script', 'document'].includes(r.resourceType())) ev.push({t: Date.now() - t0, u: r.url().replace(/\?.*/, '').slice(0, 100)}); });
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(500); const r = await remotes(page); if (r.some(x => x.name === 'site-builder')) break; }
  await page.waitForTimeout(6000);
  // keep a JS reference (no DOM mutation) to the remote container's content
  const domInfo = () => page.evaluate(() => {
    const main = document.querySelector('#app-root main') || document.querySelector('main') || document.body;
    return {spin: document.querySelectorAll('[class*=spinner i], [class*=loader i], [class*=loading i], [role=progressbar]').length, txt: main.innerText.slice(-200).replace(/\s+/g, ' ')};
  });
  await page.evaluate(() => { const m = document.querySelector('main') || document.body; window.__p2ref = m.lastElementChild; window.__p2refHTML = m.lastElementChild && m.lastElementChild.innerHTML.length; });
  steps.push({label: 'sb 317869', t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page), dom: await domInfo(), cookies: await cookieAttrs(ctx)});
  await clientNav(page, '/for/web-games/account/53105/projects/316818/site-builder');
  const poll = [];
  for (let i = 0; i < 24; i++) { await page.waitForTimeout(500); const d = await domInfo(); const c = await page.evaluate(() => ({conn: window.__p2ref ? window.__p2ref.isConnected : null})); poll.push({t: Date.now() - t0, spin: d.spin, conn: c.conn, tail: d.txt.slice(-60)}); }
  steps.push({label: 'sb 316818', url: page.url().replace(/^.*\/account/, ''), r: await remotes(page), poll, cookies: await cookieAttrs(ctx), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  await clientNav(page, '/for/web-games/account/53105/projects/317869/site-builder'); await page.waitForTimeout(8000);
  steps.push({label: 'back 317869', url: page.url().replace(/^.*\/account/, ''), r: await remotes(page), cookies: await cookieAttrs(ctx), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  return {steps, ev};
});
