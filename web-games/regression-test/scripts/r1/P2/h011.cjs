const {run, BASE} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore, hits} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const H = hits(page, t0); const res = {};
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'foo'}); res.set = await readKeys(page, [SEL]);
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => /How will you launch this project\?|Current setup/.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
    await page.waitForTimeout(4000);
    res.at = new Date().toISOString();
    res.url = page.url().replace(/^.*\/account/, '');
    res.ui = await page.evaluate(() => {
      const t = document.body.innerText;
      return {choose: /How will you launch this project\?/.test(t), cards: (t.match(/Publish your game on Games Portal|Add Xsolla to your stack/g) || []), guide: /Current setup|Switch setup/.test(t),
        sidebar: /\nDashboard\n/.test(t) && /\nProjects\n/.test(t), promo: /Can't find something in Business Accounts\?/.test(t),
        appRootBanner: getComputedStyle(document.getElementById('app-root') || document.body).getPropertyValue('--app-notice-banner-height'), first300: t.slice(0, 300)};
    });
    res.keyDuring = await readKeys(page, [SEL]);
  } finally { res.restore = await restore(page, snap); }
  res.hitSample = H.slice(0, 3).map(h => ({t: h.t, events: h.events, len: h.body.length, isJson: Boolean(h.parsed), keys: h.parsed ? (Array.isArray(h.parsed) ? Object.keys(h.parsed[0] || {}) : Object.keys(h.parsed)) : null, head: h.body.slice(0, 200).replace(/[\w.+-]+@[\w.-]+/g, '<email>')}));
  return res;
});
