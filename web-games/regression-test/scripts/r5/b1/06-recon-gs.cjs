const {run, BASE, clientNav} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const B = '/for/web-games/account/53105';
  const KEY = 'web-games:setup-selection:web-games:53105';
  await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(25000); const url0 = page.url();
  await page.waitForTimeout(4000);
  const dump = () => page.evaluate(() => ({ids: [...new Set([...document.querySelectorAll('[data-id]')].map(e => e.getAttribute('data-id')))].slice(0, 40), text: (document.querySelector('#app-root main') || document.querySelector('main') || document.body).innerText.replace(/\n+/g, ' | ').slice(0, 500)}));
  const a = await dump();
  await page.evaluate(k => localStorage.setItem(k, 'gamesPortal'), KEY);
  await clientNav(page, `${B}/dashboard`); await page.waitForTimeout(800);
  await clientNav(page, `${B}/get-started`); await page.waitForTimeout(3000);
  const b = await dump();
  await page.evaluate(k => localStorage.removeItem(k), KEY);
  const after = await page.evaluate(k => localStorage.getItem(k), KEY);
  return {url0, a, b, after};
});
