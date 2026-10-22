const {run, BASE, settle, track, pick, now, waitFor, clientNav, remotes, path} = require(__dirname + '/../A/h.cjs');
const A = '/for/web-games/account/53105';
const P = A + '/projects/317869';
const to = (p, ms = 10000) => Promise.race([p, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]);
const list = process.argv[2] === '2'
  ? [[A + '/support/transactions'], [A + '/finance/reports/download/abc123'], [A + '/communication-hub/inbox'], [P + '/gold/x'], [P + '/link/x'], [P + '/funding/x'], [P + '/metaframe/x'], [P + '/subscriptions/x']]
  : [[P + '/storefront/promotions'], [P + '/storefront/daily-rewards'], [P + '/payments/x'], [P + '/cloud-gaming/x'], [P + '/offerwall/x'], [P + '/player-platform/x'], [P + '/new-launcher/x'], [P + '/launchers/x'], [P + '/login/x']];
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(0); }, 175000);
run(async (page) => {
  const tr = track(page);
  const out = {t0: now()};
  if (process.argv[2] !== '2') {
    await page.goto(`${BASE}/53105/projects/317869/new-launcher`, {waitUntil: 'domcontentloaded', timeout: 60000});
    await waitFor(page, () => !!window.launcherModule, 40000);
    await page.waitForTimeout(3000);
    out.nl = {u: path(page.url()), win: await page.evaluate(() => typeof window.launcherModule), r: (await to(remotes(page))).map?.(x => `${x.name}|${x.exposedModule}|mounted=${x.childMounted}`)};
    const n0 = tr.gw.filter(x => /launcher-stage/.test(x.u)).length;
    out.t_l = now();
    await clientNav(page, P + '/launchers');
    await page.waitForTimeout(6000);
    out.l = {u: path(page.url()), launcherEntriesBefore: n0, after: tr.gw.filter(x => /launcher-stage/.test(x.u)).length};
  } else {
    await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded', timeout: 60000});
    await waitFor(page, () => /Last payout/.test(document.body.innerText), 40000);
  }
  out.sub = [];
  for (const [p] of list) {
    const t = now();
    await clientNav(page, p);
    await page.waitForTimeout(7000);
    const r = await to(remotes(page));
    const sww = await to(page.evaluate(() => /Something went wrong/.test(document.body.innerText)));
    out.sub.push({p: p.replace(A, ''), t, u: path(page.url()), sww, r: Array.isArray(r) ? r.filter(x => x.name !== 'xaa_widgets').map(x => `${x.name}${x.exposedModule ? '|' + x.exposedModule : ''}|mounted=${x.childMounted}|root=${(x.props.rootURL || x.props.rootUrl || x.props.root || x.props.pathname || '-').replace('string:', '')}`) : r});
    if (sww === true) { await page.reload({waitUntil: 'domcontentloaded'}); await waitFor(page, () => document.body.innerText.length > 100, 40000); await page.waitForTimeout(3000); }
  }
  out.reqs = pick(tr.gw, /\.js\?v=|remoteEntry|remote-entry|mf-manifest/).map(s => s.replace(/\?v=[0-9a-f-]+/, '?v=…'));
  return out;
});
