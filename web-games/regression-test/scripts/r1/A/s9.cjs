const {run, BASE, settle, track, pick, now, waitFor, clientNav, remotes, path, rurl} = require(__dirname + '/../A/h.cjs');
const P = '/for/web-games/account/53105/projects/317869/edit';
const to = (p, ms = 10000) => Promise.race([p, new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]);
const brief = r => Array.isArray(r) ? r.filter(x => x.name !== 'xaa_widgets').map(x => `${x.name}|${x.exposedModule}|mounted=${x.childMounted}|ws=${x.props.webhookSecrets || '-'}|cur=${x.props.currency || '-'}`) : r;
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(0); }, 150000);
run(async (page) => {
  const tr = track(page);
  const cur = []; const dead = [];
  page.on('request', r => { const u = r.url(); if (/currency\/list/.test(u)) cur.push(`${r.method()} ${rurl(u).split('?')[0].slice(-60)} @${now()}`); if (/payment_url|project_key|ipn_enabled|webhook_secrets|marketing-balance|payment_provider\/profile|analytics\/metrics\?|gross_revenue|togglers|project-analytic/.test(u)) dead.push(`${r.method()} ${rurl(u).slice(0, 160)}`); });
  const out = {t0: now()};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await waitFor(page, () => /webhooks\/\w+/.test(location.pathname), 40000);
  out.u0 = path(await settle(page));
  await page.waitForTimeout(8000);
  out.r0 = brief(await to(remotes(page)));
  out.tabs = await to(page.evaluate(() => [...document.querySelectorAll('[role=tab], a[href*="/edit/webhooks/"]')].map(e => (e.getAttribute('href') || e.textContent.trim()).replace(/^.*\/edit\/webhooks/, '')).slice(0, 15)));
  for (const tab of ['virtual-items', 'pay2play', 'subscriptions', 'payments', 'dispute', 'unknown-tab', 'store']) {
    await clientNav(page, `${P}/webhooks/${tab}`);
    await page.waitForTimeout(tab === 'payments' ? 9000 : 6000);
    out['r_' + tab] = {t: now(), u: path(page.url()), r: brief(await to(remotes(page)))};
  }
  await clientNav(page, `${P}/event-api`);
  await page.waitForTimeout(7000);
  out.r_event = {t: now(), u: path(page.url()), r: brief(await to(remotes(page)))};
  out.cur = cur; out.dead = dead;
  out.reqs = pick(tr.gw, /\.js\?v=|remoteEntry|remote-entry/);
  out.errs = [...new Set(tr.errs.filter(e => !/BLOCKED_BY_CLIENT|status of 404|Datadog/.test(e)))].slice(0, 8);
  return out;
});
