const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  const hits = [];
  page.on('request', r => { if (/xmts-global-api/.test(r.url())) { const b = r.postData() || ''; let keys = null, ev = null; try { const j = JSON.parse(b); const o = Array.isArray(j) ? j[0] : j; keys = Object.keys(o).slice(0, 25); ev = ['et', 'event', 'event_type', 'type', 'action', 'category', 'hit_type', 't', 'ec', 'ea'].filter(k => o[k] !== undefined).map(k => k + '=' + String(o[k]).slice(0, 30)); } catch (e) { keys = 'non-json:' + b.slice(0, 60).replace(/[A-Za-z0-9_-]{30,}/g, '<long>'); } hits.push({t: new Date().toISOString(), type: r.resourceType(), keys, ev}); } });
  await page.goto(`${BASE}/53105/projects/317869/sdk`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(8000);
  const s = await readStore(page, st => ({cur: st.projects?.currentProject?.id, curName: st.projects?.currentProject?.name, cur_iso: JSON.stringify(st.merchants).match(/"default_currency_iso":"[A-Z]+"/)?.[0] || null, mk: Object.keys(st.merchants || {}).slice(0, 12), merchKeys: Object.keys(st).filter(k => /merch/i.test(k)), locale: st.locale?.locale ?? st.locale?.current ?? null}));
  return {s, hits: hits.slice(0, 4)};
});
