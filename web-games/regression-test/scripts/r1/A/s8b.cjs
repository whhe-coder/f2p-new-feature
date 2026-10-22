const {run, BASE, settle, track, pick, now, waitFor, clientNav, path, rurl} = require(__dirname + '/../A/h.cjs');
const M = '/for/web-games/account/53105';
run(async (page) => {
  const tr = track(page);
  const sales = []; page.on('request', r => { if (/salescard|sales_card|integration[-_]guide|guide.*card/i.test(r.url())) sales.push(`${r.method()} ${rurl(r.url()).slice(0, 150)}`); });
  const out = {t1: now()};
  await page.goto(`${BASE}/53105/marketplace`, {waitUntil: 'domcontentloaded', timeout: 60000});
  out.u1 = path(await settle(page));
  await waitFor(page, () => !!document.querySelector('iframe[title]'), 40000);
  out.iframes = await page.evaluate(() => [...document.querySelectorAll('iframe')].filter(f => !/xsolla\.com\/metrics|livechat|datadog/i.test(f.src)).map(f => ({title: f.title, src: f.getAttribute('src'), sandbox: f.hasAttribute('sandbox') ? f.getAttribute('sandbox') : 'absent'})));
  out.t2 = now();
  await clientNav(page, M + '/marketplace/x');
  out.u2 = path(await settle(page));
  for (const [k, q] of [['a', ''], ['b', '?upsell-card-id=1'], ['c', '?upsell-step-id=1']]) {
    out['t_' + k] = now();
    await clientNav(page, M + '/frame/documentation' + q);
    await page.waitForTimeout(5000);
    out['u_' + k] = path(page.url());
    out['f_' + k] = await page.evaluate(() => ({iframes: [...document.querySelectorAll('iframe')].map(f => (f.title || '-') + ' ' + (f.getAttribute('src') || '').slice(0, 80)), spinners: [...document.querySelectorAll('[class*=pinner], [class*=loader], [class*=Loader], [role=progressbar]')].map(e => String(e.className).slice(0, 60)), text: document.body.innerText.slice(0, 80).replace(/\n+/g, ' | ')}));
  }
  out.sales = sales;
  out.gwAfter = pick(tr.gw.filter(x => x.t > 0), /card|guide|sales/i);
  return out;
});
