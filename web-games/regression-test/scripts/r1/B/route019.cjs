const {run, BASE, collect, settle, clientNav} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const log = collect(page, /documents\/url/);
  await page.goto(`${BASE}/53105/documents`, {waitUntil: 'domcontentloaded'});
  const u1 = await settle(page, {stableMs: 4000});
  await page.waitForTimeout(6000);
  const n1 = log.requests.length;
  const dom = await page.evaluate(() => ({title: document.title, h: [...document.querySelectorAll('#app-root__content h1, #app-root__content h2, #app-root__content h3')].map(e => e.textContent.trim()).slice(0, 5), txt: (document.querySelector('#app-root__content')?.innerText || '').slice(0, 200)}));
  await clientNav(page, `/for/web-games/account/53105/documents?x=1`);
  const u2 = await settle(page, {stableMs: 3000});
  await page.waitForTimeout(4000);
  return {u1: u1.replace(BASE, '{base}'), n1, u2: u2.replace(BASE, '{base}'), nAfter: log.requests.length, dom, log};
});
