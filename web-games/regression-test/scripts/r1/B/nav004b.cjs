const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForSelector('[data-id=sidebar-dashboard]', {timeout: 40000}); await page.waitForTimeout(1500);
  const cands = await page.evaluate(() => { const r = document.querySelector('.app-root__sidebar-fixed'); return [...r.querySelectorAll('button, [role=button], [aria-label], svg')].filter(b => !b.closest('[data-id^=sidebar-]') || b.tagName==='BUTTON' && !b.getAttribute('data-id')).map(b => ({tag: b.tagName, id: b.getAttribute('data-id'), al: b.getAttribute('aria-label'), cls: String(b.getAttribute('class')).slice(0, 60), t: (b.textContent||'').trim().slice(0, 20)})).slice(0, 25); });
  return {cands};
});
