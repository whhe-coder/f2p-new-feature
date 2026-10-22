const {run, BASE, settle, now, path, rurl} = require(__dirname + '/../A/h.cjs');
const target = process.argv[2] || '/53105/dashboard';
const wait = Number(process.argv[3] || 8000);
run(async (page) => {
  const bad = [];
  page.on('response', r => { if (r.status() >= 400 && !/datadog|google|reddit|linkedin/.test(r.url())) bad.push(`${r.status()} ${r.request().method()} ${rurl(r.url()).slice(0, 160)}`); });
  const out = {t: now(), target};
  const resp = await page.goto(`${BASE}${target}`, {waitUntil: 'domcontentloaded', timeout: 60000});
  out.doc = resp && resp.status();
  const hist = []; page.on('framenavigated', f => { if (f === page.mainFrame()) hist.push(path(f.url())); });
  await page.evaluate(() => { window.__aHist = []; const p = history.pushState, r = history.replaceState; history.pushState = function(s, t, u) { window.__aHist.push('push ' + u); return p.apply(this, arguments); }; history.replaceState = function(s, t, u) { window.__aHist.push('replace ' + u); return r.apply(this, arguments); }; });
  out.u = path(await settle(page, {stableMs: 3000}));
  await page.waitForTimeout(wait);
  out.u2 = path(page.url());
  out.hist = await page.evaluate(() => (window.__aHist || []).map(x => String(x).replace(/^(push|replace) https?:\/\/[^/]+/, '$1 ').replace('/for/web-games/account', '')).slice(0, 15));
  out.text = await page.evaluate(() => document.body.innerText.slice(0, 200).replace(/\n+/g, ' | '));
  out.bad = bad.slice(0, 12);
  return out;
});
