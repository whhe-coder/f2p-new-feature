const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const B = () => { const c = document.getElementById('app-root__content'); return {p: location.pathname.replace('/for/web-games/account', ''), hl: history.length, txt: (c?.innerText || '').slice(0, 100), drawer: (document.querySelector('[role=dialog], [class*=drawer], [class*=Drawer]')?.innerText || '').slice(0, 120), btns: [...document.querySelectorAll('#app-root__content button, #app-root__content [role=button], #app-root__content a, [role=dialog] button')].map(b => ({id: b.getAttribute('data-id') || b.getAttribute('aria-label'), t: b.textContent.trim().slice(0, 30)})).slice(0, 15)}; };
run(async (page) => {
  const out = {};
  await page.goto(`${BASE}/53105/tax-interview`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(8000);
  out.before = await page.evaluate(B);
  await page.getByRole('button', {name: 'View details in FAQs'}).click();
  await page.waitForTimeout(4000);
  out.faq = await page.evaluate(B); out.tFaq = new Date().toISOString();
  await page.getByLabel('Close drawer').click();
  await page.waitForTimeout(3000);
  out.closed = await page.evaluate(B); out.tClosed = new Date().toISOString();
  return out;
});
