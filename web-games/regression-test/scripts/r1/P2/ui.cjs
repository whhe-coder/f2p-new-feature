const {run, BASE} = require(__dirname + '/../lib.cjs');
const {blank, readKeys, setKeys, restore} = require(__dirname + '/../P2/st.cjs');
const K = 'wg-pa-promo-banner-dismissed';
run(async (page) => {
  const t0 = Date.now(); const res = {steps: []};
  const measure = label => page.evaluate(([label, K]) => {
    const b = document.querySelector('[data-id=pa-promo-banner]');
    const root = document.getElementById('app-root');
    const v = root ? getComputedStyle(root).getPropertyValue('--app-notice-banner-height').trim() : null;
    const top = [...document.querySelectorAll('header, [class*=topbar i], [class*=navigation i]')].filter(e => e.offsetHeight > 20 && e.getBoundingClientRect().width > 600).map(e => Math.round(e.getBoundingClientRect().top))[0];
    const side = [...document.querySelectorAll('nav, aside, [class*=sidebar i]')].filter(e => e.offsetHeight > 300).map(e => Math.round(e.getBoundingClientRect().top))[0];
    return {label, banner: Boolean(b), text: /Can't find something in Business Accounts\?/.test(document.body.innerText), h: b ? b.offsetHeight : null, cssVar: v, topbarTop: top, sidebarTop: side, key: localStorage.getItem(K)};
  }, [label, K]);
  const waitDash = async () => { await page.waitForFunction(() => /\nDashboard\n/.test(document.body.innerText), null, {timeout: 60000}); await page.waitForTimeout(3000); };
  await blank(page);
  const snap = await readKeys(page, [K]); res.before = snap;
  try {
    await setKeys(page, {[K]: null});
    await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'}); await waitDash();
    res.steps.push({t: Date.now() - t0, ...(await measure('UI-001 default'))});
    const closeBtn = page.locator('[data-id=pa-promo-banner] button').filter({hasNotText: 'Back to Publisher Account'});
    res.closeCount = await closeBtn.count();
    res.closeLabel = await closeBtn.first().evaluate(e => e.getAttribute('aria-label') || e.textContent.trim());
    await closeBtn.first().click(); await page.waitForTimeout(1000);
    res.steps.push({t: Date.now() - t0, ...(await measure('UI-003 after close'))});
    await page.reload({waitUntil: 'domcontentloaded'}); await waitDash();
    res.steps.push({t: Date.now() - t0, ...(await measure('UI-003 after reload'))});
    await setKeys(page, {[K]: 'true'});
    await page.reload({waitUntil: 'domcontentloaded'}); await waitDash();
    res.steps.push({t: Date.now() - t0, ...(await measure('UI-004 key=true reload'))});
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  return res;
});
