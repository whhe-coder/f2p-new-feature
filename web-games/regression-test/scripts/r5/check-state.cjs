// Read back profile locale, current project and setup keys after a batch.
const {run, BASE, settle, readStore} = require(__dirname + '/lib.cjs');
run(async page => {
  let initLocale = null;
  page.on('response', async r => {
    if (/get_init_info/.test(r.url())) initLocale = await r.json().then(j => (j.user || j.result?.user || {}).locale ?? 'n/a').catch(() => 'unreadable');
  });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(6000);
  const s = await readStore(page, st => ({locale: st.locale.currentLocale, profileLocale: st.user.user?.locale, cur: st.projects.currentProject?.id}));
  const ls = await page.evaluate(() => Object.keys(localStorage).filter(k => /setup-selection|enterAccount|promo-banner|i18next/.test(k)).map(k => [k.replace(/\d{4,}/g, '<id>'), localStorage.getItem(k)]));
  return {url: page.url(), initLocale, s, ls};
});
