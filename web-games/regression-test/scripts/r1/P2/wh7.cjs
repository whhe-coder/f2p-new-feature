const {run, BASE, readStore, clientNav, redact} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
const P = 316818;
const path = u => { try { const x = new URL(u); return (x.host.split('.')[0] + x.pathname).slice(0, 100); } catch { return 'bad'; } };
run(async (page) => {
  const t0 = Date.now(); const ev = []; const steps = [];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => {
    const u = e.request.url;
    if (/currency\/list|\/mapi\/merchant\/current\/projects\/|remoteEntry|remote-entry|project\/detail/i.test(u)) {
      const st = (e.initiator && e.initiator.stack && e.initiator.stack.callFrames || []).slice(0, 4).map(f => `${path(f.url)}:${f.functionName}`);
      ev.push({t: Date.now() - t0, m: e.request.method, u: path(u), st: /currency/.test(u) ? st : undefined});
    }
  });
  page.on('response', r => { if (/currency\/list/.test(r.url())) ev.push({t: Date.now() - t0, resp: r.status(), u: 'currency/list'}); });
  await page.goto(`${BASE}/53105/projects/${P}/edit/webhooks/payments`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Disable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  const txt = await page.evaluate(() => { const b = document.body.innerText; const i = b.indexOf('Secret keys'); return b.slice(i, i + 700); });
  steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page), txt});
  const loc = page.locator('button, [role=button], h2, h3, h4').filter({hasText: /^Testing/}).first();
  await loc.click({timeout: 5000}); const tc = Date.now() - t0; steps.push({clickedTesting: tc});
  let last = '';
  for (let i = 0; i < 50; i++) { const r = JSON.stringify(await remotes(page)); if (r !== last) { steps.push({t: Date.now() - t0, r: JSON.parse(r)}); last = r; } await page.waitForTimeout(200); }
  await clientNav(page, `/for/web-games/account/53105/projects/${P}/edit/webhooks/dispute`); await page.waitForTimeout(3000);
  steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page)});
  for (const id of ['virtual-items', 'pay2play', 'unknown-tab']) {
    await clientNav(page, `/for/web-games/account/53105/projects/${P}/edit/webhooks/${id}`); await page.waitForTimeout(3500);
    steps.push({t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page)});
  }
  return {cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id), steps, ev};
});
