const {run, BASE, settle, track, pick, now, waitFor, remotes, path} = require(__dirname + '/../A/h.cjs');
const to = (p, ms = 10000) => Promise.race([p, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]);
const list = process.argv.slice(2);
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(0); }, 175000);
run(async (page) => {
  const tr = track(page);
  const out = {res: []};
  for (const p of list) {
    const n0 = tr.gw.length; const t = now();
    const resp = await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded', timeout: 60000});
    const ct = resp && (await resp.headerValue('content-type'));
    await waitFor(page, () => document.body.innerText.length > 200, 40000);
    await page.waitForTimeout(12000);
    const r = await to(remotes(page));
    out.res.push({p, t, doc: `${resp && resp.status()} ${ct}`, u: path(page.url()), r: Array.isArray(r) ? r.filter(x => x.name !== 'xaa_widgets').map(x => `${x.name}|mounted=${x.childMounted}|root=${(x.props.rootURL || x.props.root || '-').replace('string:', '')}`) : r,
      reqs: pick(tr.gw.slice(n0), /api\/v1\/modules|\.js\?v=|remoteEntry|remote-entry/).map(s => s.replace(/ BAI=.*$/, ''))});
  }
  return out;
});
