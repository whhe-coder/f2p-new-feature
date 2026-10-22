const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const H = () => ({p: location.pathname.replace('/for/web-games/account', ''), lite: !!document.querySelector('nav.app-navigation-lite'), fullNav: !!document.querySelector('button[aria-label="Communication Hub"]'), container: [...document.querySelectorAll('[data-id$=error-container]')].map(e => e.getAttribute('data-id')), title: (document.querySelector('[data-id$=error-container]')?.innerText || '').replace(/\n+/g, '|').slice(0, 120), homeHref: [...document.querySelectorAll('a')].find(a => /To homepage/i.test(a.textContent))?.getAttribute('href')});
run(async (page) => {
  const out = {};
  for (const p of ['/not-found', '/error', '/forbidden']) {
    await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[data-id$=error-container], nav', {timeout: 60000}).catch(() => {});
    const fin = await settle(page, {stableMs: 3000});
    await page.waitForTimeout(1500);
    out[p] = {t: new Date().toISOString(), final: fin.replace(BASE, ''), ...(await page.evaluate(H))};
  }
  await page.getByText('To homepage').first().click();
  const fin = await settle(page, {stableMs: 3000});
  out.toHomepage = {t: new Date().toISOString(), final: fin.replace(BASE, '')};
  return out;
});
