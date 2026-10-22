const {run, BASE, collect, settle, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const log = collect(page, /gateway/);
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(10000);
  const s = await readStore(page, st => {
    const d = st.projects.currentProjectDetails || {};
    const pick = {};
    for (const [k, v] of Object.entries(d)) if (/ipn|webhook|enabled|url/i.test(k)) pick[k] = typeof v === 'string' ? v.slice(0, 40) : v;
    return {detailKeys: Object.keys(d), pick, item0: Object.keys((st.projects.items || [])[0] || {})};
  });
  return {url: page.url(), reqs: log.requests.filter(r => r.type === 'xhr' || r.type === 'fetch').map(r => `${r.method} ${r.url.replace(/^https:\/\/[^/]+/, '')}`), s};
});
