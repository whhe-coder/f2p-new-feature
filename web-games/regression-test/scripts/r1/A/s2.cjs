const {run, BASE, settle, remotes, track, pick, now, waitFor, clientNav} = require(__dirname + '/../A/h.cjs');
const xaa = async (page) => (await remotes(page)).filter(r => r.name === 'xaa_widgets').map(r => `${r.props.componentName} mounted=${r.childMounted}`);
run(async (page) => {
  const tr = track(page);
  const out = {t: now()};
  await page.goto(`${BASE}/53105/analytics/payments`, {waitUntil: 'domcontentloaded'});
  out.u0 = await settle(page);
  await waitFor(page, () => document.querySelectorAll('[role=tab]').length >= 3, 40000);
  await page.waitForTimeout(4000);
  out.tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].map(e => e.textContent.trim()));
  out.step0 = await xaa(page);
  const seq = [];
  for (const label of ['Payments', 'Taxes', 'Today']) {
    const tab = page.locator('[role=tab]', {hasText: new RegExp(`^${label}$`)}).first();
    await tab.click({timeout: 5000}).catch(e => seq.push(`click ${label} failed`));
    await page.waitForTimeout(3500);
    seq.push({label, xaa: await xaa(page), url: page.url().split('/account')[1]});
  }
  out.seq = seq;
  const boards = ['catalog', 'players', 'engagement', 'web-shop', 'support', 'anti-fraud', 'anti-fraud/blocklist'];
  out.boards = [];
  for (const b of boards) {
    await clientNav(page, `/for/web-games/account/53105/analytics/${b}`);
    await page.waitForTimeout(4000);
    out.boards.push({b, url: page.url().split('/account')[1], xaa: await xaa(page)});
  }
  out.full = (await remotes(page)).filter(r => r.name === 'xaa_widgets').map(r => Object.keys(r.child || r.props));
  out.reqs = pick(tr.gw, /remoteEntry/);
  out.errs = tr.errs.filter(e => !/BLOCKED_BY_CLIENT/.test(e)).slice(0, 8);
  return out;
});
