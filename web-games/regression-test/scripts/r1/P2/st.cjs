// localStorage backup/restore on a same-origin blank document (no app boot), plus /hit capture.
const {HOST} = require(__dirname + '/../lib.cjs');
const SEL = 'web-games:setup-selection:web-games:53105';
const BLANK = `${HOST}/__p2_blank`;
async function blank(page) {
  await page.route(BLANK, r => r.fulfill({status: 200, contentType: 'text/html', body: '<html><body>p2</body></html>'}));
  await page.goto(BLANK);
}
const readKeys = (page, keys) => page.evaluate(ks => Object.fromEntries(ks.map(k => [k, localStorage.getItem(k)])), keys);
async function setKeys(page, obj) { await page.evaluate(o => { for (const [k, v] of Object.entries(o)) v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); }, obj); }
// Restore from a fresh blank document so the running app cannot rewrite the value afterwards.
async function restore(page, snapshot) {
  await blank(page);
  await setKeys(page, snapshot);
  const back = await readKeys(page, Object.keys(snapshot));
  return {snapshot, back, ok: JSON.stringify(back) === JSON.stringify(snapshot)};
}
function hits(page, t0) {
  const out = [];
  page.on('request', r => {
    if (!/xmts-global-api/.test(r.url())) return;
    out.all = (out.all || 0) + 1;
    let body = ''; try { body = r.postData() || ''; } catch { body = ''; }
    if (!body && r.postDataBuffer) { try { const b = r.postDataBuffer(); body = b ? b.toString('utf8') : ''; } catch {} }
    body = body + ' ' + decodeURIComponent(r.url().split('?')[1] || '');
    const m = body.match(/acc_[a-z_-]+/g);
    if (!m) return;
    let parsed = null; try { parsed = JSON.parse(body); } catch {}
    let p2 = parsed; if (!p2) { try { p2 = JSON.parse(body.trim().split(' ')[0]); } catch {} }
    const exv = p2 && p2.exv ? Object.fromEntries(Object.entries(p2.exv).filter(([k]) => !/user_id|email/.test(k))) : undefined;
    out.push({t: Date.now() - t0, events: [...new Set(m)], en: p2 && p2.en, ev: p2 && p2.ev, exv, et: p2 && p2.et, counter: p2 && p2.counter_id, body, parsed: p2});
  });
  return out;
}
module.exports = {SEL, BLANK, blank, readKeys, setKeys, restore, hits};
