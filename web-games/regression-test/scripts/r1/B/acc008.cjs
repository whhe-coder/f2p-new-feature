const {run, BASE, settle, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const found = [];
  page.on('response', async r => {
    const u = r.url(); if (!/gateway/.test(u)) return;
    if (!/json/.test(r.headers()['content-type'] || '')) return;
    let j; try { j = await r.json(); } catch { return; }
    const hits = [];
    const walk = (o, path, d) => { if (!o || typeof o !== 'object' || d > 7 || hits.length > 12) return;
      for (const [k, v] of Object.entries(o)) { const p = path + '.' + k;
        if (/role/i.test(k) && (typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string')))) hits.push({p, v: Array.isArray(v) ? v.slice(0, 8) : v});
        else if (/role/i.test(k) && Array.isArray(v)) hits.push({p, v: JSON.stringify(v).slice(0, 200)});
        else walk(v, Array.isArray(o) ? path + '[]' : p, d + 1); } };
    walk(j, '', 0);
    if (hits.length) found.push({url: u.replace(/^https:\/\/[^/]+/, '').split('?')[0], status: r.status(), hits});
  });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForTimeout(8000);
  const s = await readStore(page, st => ({userRole: st.user?.role, userRoles: st.user?.roles, merchRole: st.merchants?.role ?? st.merchant?.role, rolesKeys: Object.keys(st.roles || {}), cur: st.projects?.currentProject?.id}));
  return {found, s};
});
