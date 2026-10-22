const {run, BASE, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {findRemote} = require(__dirname + '/../P2/fib.cjs');
run(async (page) => {
  const t0 = Date.now(); const steps = []; const nav = [];
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) nav.push({t: Date.now() - t0, u: r.url().slice(-50)}); });
  try {
    await page.goto(`${BASE}/53105/projects/316818/site-builder`, {waitUntil: 'domcontentloaded'});
    for (let i = 0; i < 60; i++) { await page.waitForTimeout(500); const r = await findRemote(page, 'site-builder'); if (r.hostText && r.hostText.length > 5) break; }
    await page.waitForTimeout(3000);
    steps.push({label: 'full 316818', t: Date.now() - t0, r: await findRemote(page, 'site-builder', 'sb')});
    await clientNav(page, '/for/web-games/account/53105/projects/317869/site-builder');
    const poll = []; let last = '';
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(400); const r = await findRemote(page, 'site-builder'); const s = JSON.stringify(r); if (s !== last) { poll.push({t: Date.now() - t0, ...r}); last = s; } }
    steps.push({label: 'nav 317869', poll, cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  } catch (e) { steps.push({err: String(e).slice(0, 150), url: page.url().slice(0, 60)}); }
  return {steps, nav};
});
