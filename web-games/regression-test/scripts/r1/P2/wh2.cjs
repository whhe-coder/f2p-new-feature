const {run, BASE, settle, readStore, headerNames} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  let hdrs = null, detailUrl = null;
  page.on('request', r => { if (!hdrs && /\/api\/project\/detail\/\d+/.test(r.url())) { hdrs = r.headers(); detailUrl = r.url(); } });
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Webhook server|Enable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  const items = await readStore(page, st => (st.projects.items || []).map(p => ({id: p.id, name: p.name, enabled: p.enabled})));
  const pri = items.filter(p => p.id !== 317869 && /webhook|hook|ipn|pay|store|test/i.test(p.name));
  const rest = items.filter(p => p.id !== 317869 && !pri.includes(p));
  const cands = [...pri, ...rest].slice(0, 15);
  const sendHdrs = {};
  for (const [k, v] of Object.entries(hdrs || {})) if (!/^(sec-|user-agent|referer|accept-encoding|:)/i.test(k)) sendHdrs[k] = v;
  const results = await page.evaluate(async ({cands, base, h}) => {
    const out = [];
    for (const c of cands) {
      const r = await fetch(base + c.id, {method: 'GET', headers: h, credentials: 'include'});
      let j = null; try { j = await r.json(); } catch (e) {}
      out.push({id: c.id, name: c.name, status: r.status, ipn: j && j.result ? j.result.ipn_enabled : undefined});
    }
    return out;
  }, {cands, base: detailUrl.replace(/\d+(\?.*)?$/, ''), h: sendHdrs});
  return {hdrNames: headerNames(hdrs || {}), itemsLen: items.length, results};
});
