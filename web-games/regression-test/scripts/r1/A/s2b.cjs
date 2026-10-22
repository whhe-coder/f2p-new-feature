const {run, BASE, settle, remotes, track, pick, now, waitFor, readStore} = require(__dirname + '/../A/h.cjs');
const xaa = async (page) => (await remotes(page)).filter(r => r.name === 'xaa_widgets').map(r => `${r.props.componentName} mounted=${r.childMounted}`);
run(async (page) => {
  const tr = track(page);
  const out = {t: now()};
  await page.goto(`${BASE}/53105/analytics/payments`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await waitFor(page, () => document.querySelectorAll('[role=tab]').length >= 3, 40000);
  await page.waitForTimeout(5000);
  out.s0 = await xaa(page);
  out.seq = [];
  for (const label of ['Payments', 'Taxes and fees', 'Today']) {
    const r = await page.locator('[role=tab]', {hasText: label}).first().click({timeout: 5000}).then(() => 'ok', e => 'fail');
    await page.waitForTimeout(6000);
    out.seq.push({label, click: r, at: now(), xaa: await xaa(page)});
  }
  out.reqs = pick(tr.gw, /xaa-widgets/);
  out.store = await readStore(page, st => st.projects.currentProject?.id);
  return out;
});
