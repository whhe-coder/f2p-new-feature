const {run, BASE, settle, readStore, clientNav, redact} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
const P = 316818;
run(async (page) => {
  const t0 = Date.now(); const ev = [];
  page.on('request', r => { const u = r.url(); if (/currency\/list|\/mapi\/merchant\/current\/projects\/|remoteEntry|remote-entry/i.test(u)) ev.push({t: Date.now() - t0, m: r.method(), u: redact(u).replace(/^https:\/\/[^/]+/, '').slice(0, 110)}); });
  page.on('response', r => { if (/currency\/list/.test(r.url())) ev.push({t: Date.now() - t0, resp: r.status(), u: 'currency/list'}); });
  await page.goto(`${BASE}/53105/projects/${P}/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Disable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(3000);
  const steps = [];
  const snap = async label => steps.push({label, t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await remotes(page)});
  await snap('loaded');
  const hdrs = await page.evaluate(() => [...document.querySelectorAll('button, [role=button], h2, h3, h4, summary')].map(e => e.textContent.trim()).filter(t => /test|advanced/i.test(t) && t.length < 80));
  steps.push({hdrs});
  // expand Testing and Advanced settings (UI only, no save)
  for (const re of [/^Advanced settings/i, /^Testing/i, /^Test webhooks/i]) {
    const loc = page.locator('button, [role=button], h2, h3, h4').filter({hasText: re}).first();
    if (await loc.count()) { await loc.click({timeout: 5000}).catch(e => steps.push({clickErr: String(e).slice(0, 100)})); steps.push({clicked: String(re)}); await page.waitForTimeout(2500); }
  }
  await snap('expanded');
  const toggles = await page.evaluate(() => [...document.querySelectorAll('[role=tab], [role=radio], [role=button], button, a')].map(e => e.textContent.trim()).filter(t => /^(Store|Virtual|Simple|Payments|Subscriptions|Dispute|Pay2Play|P2P|Virtual items)/i.test(t)).slice(0, 20));
  steps.push({toggles});
  for (const id of ['payments', 'dispute', 'store', 'subscriptions']) {
    const before = ev.filter(e => e.u === 'currency/list' && e.m).length;
    await clientNav(page, `/for/web-games/account/53105/projects/${P}/edit/webhooks/${id}`);
    // poll for remote mount to see whether content stays empty until currency/list resolves
    let mountT = null;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); const r = await remotes(page); if (r.some(x => x.name === (id === 'store' ? 'storefront' : id === 'subscriptions' ? 'subscriptions' : 'payments') || (x.exposedModule || '').includes('webhooks'))) { mountT = Date.now() - t0; break; } }
    await page.waitForTimeout(2500);
    await snap(`tab:${id}`); steps[steps.length - 1].mountT = mountT; steps[steps.length - 1].currencyReqsDuring = ev.filter(e => e.u === 'currency/list' && e.m).length - before;
  }
  return {cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id), steps, ev};
});
