const {run, BASE, settle, track, pick, now, waitFor, remotes, path} = require(__dirname + '/../A/h.cjs');
const mode = process.argv[2]; // 'click' or 'direct'
const to = (p, ms = 8000) => Promise.race([p, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]);
const brief = r => Array.isArray(r) ? r.map(x => `${x.name}${x.exposedModule ? ' ' + x.exposedModule : ''} mounted=${x.childMounted} rootURL=${x.props.rootURL} routePath=${x.props.routePath}`) : r;
setTimeout(() => { console.log('GLOBAL TIMEOUT', now()); process.exit(0); }, 110000);
run(async (page) => {
  const tr = track(page);
  const log = (k, v) => console.log(k, JSON.stringify(v));
  log('t0', now());
  const target = mode === 'direct' ? '/53105/finance/payouts' : '/53105/finance';
  const resp = await page.goto(BASE + target, {waitUntil: 'domcontentloaded', timeout: 60000});
  log('doc', resp && resp.status());
  await waitFor(page, () => !!window.transactions_publisher_account, 40000);
  await page.waitForTimeout(6000);
  log('u', path(page.url()));
  log('rm', brief(await to(remotes(page))));
  log('tabs', await to(page.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(e => `${e.textContent.trim()}|${e.getAttribute('aria-selected')}`))));
  if (mode === 'click') {
    log('tclick', now());
    await to(page.locator('[role=tab]', {hasText: /Payouts/}).first().click({timeout: 5000}).catch(e => 'click failed'));
    for (let i = 0; i < 6; i++) { await new Promise(r => setTimeout(r, 2000)); log('alive' + i, await to(page.evaluate(() => location.pathname.slice(-30)), 4000)); }
    log('rm2', brief(await to(remotes(page))));
    log('payLoading', await to(page.evaluate(() => document.body.innerText.match(/Payouts[^|]{0,80}/g)?.slice(0, 3))));
  } else {
    for (let i = 0; i < 4; i++) { await new Promise(r => setTimeout(r, 2000)); log('alive' + i, await to(page.evaluate(() => location.pathname.slice(-30)), 4000)); }
  }
  log('reqs', pick(tr.gw, /transactions_publisher_account|\.js\?v=/));
  return {done: now()};
});
