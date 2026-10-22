const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  let hdrs = null, detailUrl = null;
  page.on('request', r => { if (!hdrs && /\/api\/project\/detail\/\d+/.test(r.url())) { hdrs = r.headers(); detailUrl = r.url(); } });
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Webhook server|Enable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  const h = {}; for (const [k, v] of Object.entries(hdrs)) if (!/^(sec-|user-agent|referer|accept-encoding|:)/i.test(k)) h[k] = v;
  const results = await page.evaluate(async ({ids, base, h}) => {
    const out = [];
    for (const id of ids) {
      const r = await fetch(base + id, {headers: h, credentials: 'include'});
      const j = await r.json().catch(() => null); const d = (j && j.result) || {};
      out.push({id, status: r.status, ipn: d.ipn_enabled, hasPaymentUrl: Boolean(d.payment_url), universal: d.is_universal_item_enabled});
    }
    return out;
  }, {ids: [316933, 316850, 316818], base: detailUrl.replace(/\d+(\?.*)?$/, ''), h});
  return {results};
});
