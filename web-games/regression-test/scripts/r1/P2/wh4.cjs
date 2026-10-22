const {run, BASE, settle, readStore} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/projects/316933/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Disable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(8000);
  const main = await page.evaluate(() => { const m = document.querySelector('main') || document.body; return m.innerText.slice(0, 2500); });
  const cands = await page.evaluate(() => [...document.querySelectorAll('[class*=tab] , [data-id*=tab], [data-testid*=tab]')].map(e => ({c: String(e.className).slice(0, 60), t: e.textContent.trim().slice(0, 30), d: e.getAttribute('data-testid') || e.getAttribute('data-id')})).slice(0, 30));
  return {url: page.url(), main, cands, r: await remotes(page)};
});
