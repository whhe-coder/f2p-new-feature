const {run, BASE, settle, track, pick, now, waitFor, remotes, path} = require(__dirname + '/../A/h.cjs');
const brief = r => Array.isArray(r) ? r.map(x => ({name: x.name, exposedModule: x.exposedModule, loadingFallback: x.loadingFallback, root: x.props.root, rootURL: x.props.rootURL, childMounted: x.childMounted})) : r;
run(async (page) => {
  const tr = track(page);
  const out = {};
  for (const [k, p] of [['m', '/53105/funding'], ['p', '/53105/projects/317869/funding']]) {
    out['t_' + k] = now();
    const n0 = tr.gw.length;
    await page.goto(`${BASE}${p}`, {waitUntil: 'commit', timeout: 60000});
    // sample spinner count while loading
    const sp = [];
    for (let i = 0; i < 50; i++) {
      const s = await page.evaluate(() => [...document.querySelectorAll('div')].filter(d => d.style && d.style.minHeight === '200px').length).catch(() => -1);
      sp.push(s);
      if (await page.evaluate(() => !!window.funding).catch(() => false)) break;
      await page.waitForTimeout(500);
    }
    out['spinnerMax_' + k] = Math.max(...sp);
    out['u_' + k] = path(await settle(page));
    await page.waitForTimeout(6000);
    out['r_' + k] = brief(await remotes(page));
    out['req_' + k] = pick(tr.gw.slice(n0), /funding-developer-account|remoteEntry/);
  }
  out.errs = [...new Set(tr.errs.filter(e => !/BLOCKED_BY_CLIENT|status of 404|Datadog/.test(e)))].slice(0, 8);
  return out;
});
