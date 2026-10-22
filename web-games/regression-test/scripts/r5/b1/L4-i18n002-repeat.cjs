// RT-I18N-002 repeat: switch to LANG (argv), wait, hard reload, read init locale; restore en; reload and confirm.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
const code = process.argv[2] || 'ja';
const waitMs = Number(process.argv[3] || 3000);
run(async (page) => {
  const loc = h.watchLocale(page);
  const s = {code, waitMs};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  s.L0 = await h.state(page);
  await h.switchLang(page, code);
  s.switched = await h.state(page);
  await page.waitForTimeout(waitMs);
  s.reloadAt = h.iso();
  await page.reload({waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(2500);
  s.afterReload = await h.state(page);
  s.balanceText = await page.evaluate(() => document.querySelector('[data-id="dashboard-balance"]')?.innerText.split('\n').slice(0, 2).join(' | '));
  await h.switchLang(page, 'en');
  s.restored = await h.state(page);
  await page.reload({waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  await page.waitForTimeout(1500);
  s.confirm = await h.state(page);
  return {s, loc};
}, {allow: [/users\/location/]});
