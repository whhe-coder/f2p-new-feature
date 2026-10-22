const {run, BASE, settle, track, pick, now, waitFor, clientNav, remotes, tokenCompare, path, readStore} = require(__dirname + '/../A/h.cjs');
const P = '/for/web-games/account/53105/projects/317869';
run(async (page) => {
  const tr = track(page);
  const out = {};
  out.t1 = now();
  await page.goto(`${BASE}/53105/projects/317869/payments`, {waitUntil: 'domcontentloaded'});
  out.u1 = path(await settle(page));
  await waitFor(page, () => !!window.pay_station_publisher_account, 40000);
  await page.waitForTimeout(5000);
  out.pay = (await remotes(page)).filter(r => r.name === 'payments');
  out.payText = await page.evaluate(() => document.body.innerText.length);
  out.tokPay = await tokenCompare(page, tr.getBearer());
  out.bearerSeen = !!tr.getBearer();
  for (const [k, sub, wait] of [['gold', '/gold', 12000], ['meta', '/metaframe', 12000], ['sdk', '/sdk/integration', 12000], ['sdk2', '/sdk/integration/step-2', 5000]]) {
    out['t_' + k] = now();
    await clientNav(page, P + sub);
    await page.waitForTimeout(wait);
    out['u_' + k] = path(page.url());
    const r = await remotes(page);
    out['r_' + k] = Array.isArray(r) ? r.map(x => ({name: x.name, exposedModule: x.exposedModule, props: x.props, childMounted: x.childMounted})) : r;
    out['txt_' + k] = await page.evaluate(() => { const m = document.querySelector('main') || document.body; return m.innerText.slice(0, 160).replace(/\n+/g, ' | '); });
    out['spinner_' + k] = await page.evaluate(() => document.querySelectorAll('[class*=pinner], [class*=Spinner]').length);
    if (k === 'gold') out.tokGold = await tokenCompare(page, tr.getBearer());
  }
  out.reqs = pick(tr.gw, /remoteEntry|pay_station|xsolla-gold|sdk-intergration|metaframe|\.js\?v=/);
  out.store = await readStore(page, st => st.projects.currentProject?.id);
  out.errs = [...new Set(tr.errs.filter(e => !/BLOCKED_BY_CLIENT|status of 404|Datadog/.test(e)))].slice(0, 8);
  return out;
});
