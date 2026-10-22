const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(3000);
  const cands = await page.evaluate(() => [...document.querySelectorAll('button, [role=button]')].filter(b => /collap|expand|sidebar|menu/i.test((b.getAttribute('aria-label') || '') + (b.getAttribute('data-id') || '') + b.className)).map(b => ({id: b.getAttribute('data-id'), al: b.getAttribute('aria-label'), cls: String(b.className).slice(0, 80), t: b.textContent.trim().slice(0, 20)})).slice(0, 20));
  return {cands};
});
