const {run, BASE, settle, now, waitFor, path} = require(__dirname + '/../A/h.cjs');
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(0); }, 175000);
run(async (page) => {
  const out = {res: []};
  for (const p of ['/legal-consent', '/account-no-access', '/account-restricted']) {
    const t = now();
    const hist = [];
    const h = f => { if (f === page.mainFrame()) hist.push(path(f.url())); };
    page.on('framenavigated', h);
    await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded', timeout: 60000});
    await page.evaluate(() => { window.__aHist = []; const P = history.pushState, R = history.replaceState; history.pushState = function (s, t, u) { window.__aHist.push('push ' + u); return P.apply(this, arguments); }; history.replaceState = function (s, t, u) { window.__aHist.push('replace ' + u); return R.apply(this, arguments); }; });
    await waitFor(page, () => document.body.innerText.length > 80, 40000);
    await settle(page, {stableMs: 4000});
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => ({h: (window.__aHist || []).map(x => String(x).replace(/https?:\/\/[^/]+/, '').replace('/for/web-games/account', '')), title: document.querySelector('.account-no-access__title')?.innerText, desc: document.querySelector('.account-no-access__description')?.innerText, form: !!document.querySelector('form, [class*=legal-consent], [class*=LegalConsent]'), sidebar: !!document.querySelector('[class*=sidebar]'), text: document.body.innerText.slice(0, 160).replace(/\n+/g, ' | ')}));
    page.off('framenavigated', h);
    out.res.push({p, t, final: path(page.url()), ...info});
  }
  return out;
});
