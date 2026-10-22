const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.route(/\/credential/, r => r.abort('blockedbyclient'));
  await page.goto(`${BASE}/53105/profile`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="profile-settings"] [role=combobox]', {timeout: 70000});
  await page.waitForTimeout(2500);
  const c = page.locator('[data-id="profile-settings"] [role=combobox]').nth(1);
  await c.click();
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const id = document.querySelectorAll('[data-id="profile-settings"] [role=combobox]')[1].getAttribute('aria-controls');
    const lb = document.getElementById(id);
    return {expanded: document.querySelectorAll('[data-id="profile-settings"] [role=combobox]')[1].getAttribute('aria-expanded'), lb: lb ? lb.outerHTML.slice(0, 800) : null, opts: [...document.querySelectorAll('[role=option]')].map(o => o.innerText).slice(0, 12)};
  });
  return r;
});
