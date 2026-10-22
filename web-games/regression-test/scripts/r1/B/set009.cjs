const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const out = {};
  for (const p of ['/53105/settings/members/anything', '/53105/settings/user-activity/x', '/53105/settings/user-activity']) {
    await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#app-root__content, [data-id$=error-container]', {timeout: 60000}).catch(() => {});
    const fin = await settle(page, {stableMs: 4000});
    await page.waitForTimeout(3000);
    out[p] = {t: new Date().toISOString(), final: fin.replace(BASE, ''), sidebar: await page.evaluate(() => !!document.querySelector('.app-root__sidebar-fixed')), err: await page.evaluate(() => document.querySelector('[data-id$=error-container]')?.getAttribute('data-id') || null), content: await page.evaluate(() => (document.getElementById('app-root__content')?.innerText || '').replace(/\n+/g, '|').slice(0, 150))};
  }
  return out;
});
