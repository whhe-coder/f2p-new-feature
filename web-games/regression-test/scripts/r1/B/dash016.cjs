const {run, BASE, redact} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const out = {xmts: [], dd: [], xaConsole: []};
  page.on('request', r => {
    const u = r.url();
    if (/xmts-global-api/.test(u)) {
      const body = r.postData() || '';
      const all = u + ' ' + body;
      const ev = [...new Set((all.match(/"(?:event|ev|e|name|type|category|action)"\s*:\s*"[^"]{1,40}"/g) || []).slice(0, 6))];
      out.xmts.push({t: new Date().toISOString(), m: r.method(), type: r.resourceType(), url: redact(u).slice(0, 140), has900023: all.includes('900023'), ctx900023: (all.match(/.{0,30}900023.{0,20}/) || [''])[0], bodyLen: body.length, ev});
    }
    if (/browser-intake|datadoghq|ddog|rum/i.test(u) && !/xmts/.test(u)) {
      const body = r.postData() || '';
      out.dd.push({url: redact(u).slice(0, 120), bai: (body.match(/"business_account_id"\s*:\s*"[^"]*"/) || [null])[0], len: body.length});
    }
  });
  page.on('console', m => { if (/xsollaAnalytics/.test(m.text())) out.xaConsole.push(m.text().slice(0, 120)); });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(12000);
  out.xaa = await page.evaluate(() => {
    const el = document.getElementById('root'); const key = Object.keys(el).find(k => k.startsWith('__reactContainer'));
    const st = [el[key]]; let n = 0;
    while (st.length && n++ < 60000) { const f = st.pop(); if (!f) continue;
      const p = f.memoizedProps;
      if (p && p.name === 'xaa_widgets') { const t = f.type; return {comp: (t && (t.displayName || t.name)) || String(typeof t), name: p.name, componentName: p.componentName, merchantId: p.merchantId, merchantIdType: typeof p.merchantId, locale: p.locale, currencyISO: p.currencyISO, siteId: p.siteId, tokenJWT: p.tokenJWT ? 'present' : 'absent', navigate: typeof p.navigate}; }
      if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child); }
    return null; });
  out.store = await page.evaluate(() => null);
  out.dd_rum = await page.evaluate(() => { const d = window.DD_RUM; if (!d) return 'no DD_RUM'; let ic = null, gc = null; try { ic = d.getInitConfiguration && d.getInitConfiguration(); } catch (e) {} try { gc = d.getGlobalContext && d.getGlobalContext(); } catch (e) {} let inn = null; try { inn = d.getInternalContext && d.getInternalContext(); } catch (e) {} return {hasInit: !!ic, appIdPresent: !!(ic && ic.applicationId), site: ic && ic.site, service: ic && ic.service, env: ic && ic.env, gcKeys: gc ? Object.keys(gc) : null, bai: gc && (gc.business_account_id || gc.businessAccountId), internal: inn ? {app: !!inn.application_id, view: inn.view && inn.view.url ? 'y' : 'n'} : null}; });
  return out;
});
