const {run, BASE, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
run(async (page) => {
  const t0 = Date.now(); const ev = []; const steps = [];
  page.on('request', r => { const u = r.url(); if (/currency\/list|payment_url|project_key|ipn_enabled|webhook_secrets/.test(u)) ev.push({t: Date.now() - t0, m: r.method(), u: u.replace(/^https:\/\/[^/]+/, '').slice(0, 90)}); });
  await page.goto(`${BASE}/53105/projects/316818/edit/webhooks/payments`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Disable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  for (let i = 0; i < 20; i++) { const r = await remotes(page); if (r.some(x => x.name === 'payments')) break; await page.waitForTimeout(500); }
  steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page)});
  await clientNav(page, '/for/web-games/account/53105/projects/316818/edit/event-api'); await page.waitForTimeout(4000);
  steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page)});
  await clientNav(page, '/for/web-games/account/53105/projects/316933/edit/webhooks/payments'); await page.waitForTimeout(6000);
  steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page), hasTesting: await page.evaluate(() => /\nTesting\n/.test(document.body.innerText)), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  const priv = await readStore(page, st => { const p = st.privileges || {}; const s = JSON.stringify(p); return {keys: Object.keys(p), adv: (s.match(/[a-z_]*advanced[a-z_]*/gi) || []).slice(0, 10)}; });
  return {steps, ev, priv};
});
