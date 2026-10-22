const {run, BASE, settle, redact, headerNames, now, waitFor} = require(__dirname + '/../A/h.cjs');
run(async (page) => {
  const t0 = Date.now(); const reqs = [];
  page.on('request', r => { if (['xhr','fetch'].includes(r.resourceType())) reqs.push({r, t: Date.now()-t0}); });
  const st = new Map(); page.on('response', r => st.set(r.request(), r.status()));
  const t = now();
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 3000});
  await waitFor(page, () => /Last payout/.test(document.body.innerText), 40000);
  await page.waitForTimeout(3000);
  const list = reqs.map(({r, t}) => `${r.method()} ${require(__dirname + "/../A/h.cjs").rurl(r.url()).split('?')[0].slice(0,140)}${r.url().includes('?')?'?…':''} -> ${st.get(r)} @${t}`);
  const bal = reqs.filter(x => /balance|consent|legal/.test(x.r.url())).map(x => ({url: require(__dirname + "/../A/h.cjs").rurl(x.r.url()), status: st.get(x.r), t: x.t, headers: headerNames(x.r.headers())}));
  const icon = await page.evaluate(() => { const el=[...document.querySelectorAll('*')].find(e=>e.childElementCount===0 && /Next payout date/.test(e.textContent)); if(!el) return null; const box=el.closest('div').parentElement; return {html: box.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>').slice(0,600)}; });
  return {t, url: page.url(), list, bal, icon};
});
