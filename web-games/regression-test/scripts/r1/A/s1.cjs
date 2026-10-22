const {run, BASE, settle, readStore, remotes, track, pick, now, waitFor} = require(__dirname + '/../A/h.cjs');
run(async (page) => {
  const tr = track(page);
  const t = now();
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  const url1 = await settle(page, {stableMs: 3000});
  // skeleton check early-ish
  await waitFor(page, () => document.body.innerText.includes('Balance'), 40000);
  const skel = await page.evaluate(() => document.querySelectorAll('[class*=keleton]').length);
  await page.waitForTimeout(8000);
  const mods = await page.evaluate(() => (window.__modules || []).map(m => ({id: m.module_id, scope: m.scope, module: m.module, urlKeys: Object.keys(m.urls || {}), stageHost: (m.urls && m.urls.stage) ? (m.urls.stage.split('?')[0]) : null})));
  const bal = await page.evaluate(() => {
    const txt = document.body.innerText;
    const i = txt.indexOf('Balance');
    return txt.slice(Math.max(0, i - 50), i + 250).replace(/\n+/g, ' | ');
  });
  const s = await readStore(page, st => ({cur: st.projects && st.projects.currentProject && st.projects.currentProject.id}));
  const r = await remotes(page);
  return {t, url1, finalUrl: page.url(), skeletonCountAtBalance: skel, bal, mods, store: s, remotes: r,
    reqs: pick(tr.gw, /modules|metrics\/balance|consent|legal|remoteEntry|marketing-balance|payment_provider\/profile|analytics\/metrics\?|gross_revenue|togglers|project-analytic/),
    errs: tr.errs.slice(0, 10)};
});
