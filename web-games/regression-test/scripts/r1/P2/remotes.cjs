// Walk the React fiber tree and list mounted remote components (props with exposedModule).
async function remotes(page) {
  return page.evaluate(() => {
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && Object.keys(el).some(k => k.startsWith('__reactContainer')));
    if (!rootEl) return [{error: 'no root'}];
    const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
    const out = []; const stack = [rootEl[key]]; let n = 0;
    while (stack.length && n++ < 200000) {
      const f = stack.pop(); if (!f) continue;
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.exposedModule === 'string' && (p.name || p.scope || p.module)) {
        out.push({name: p.name || p.scope || p.module, exposedModule: p.exposedModule, ws: Array.isArray(p.webhookSecrets) ? p.webhookSecrets.length : (p.webhookSecrets === undefined ? 'absent' : typeof p.webhookSecrets), cur: p.currency ? {f: p.currency.isFetching, n: (p.currency.items || []).length} : undefined, project_id: p.project_id, rootURL: p.rootURL, root: p.root});
      }
      if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child);
    }
    const seen = new Set();
    return out.filter(o => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
  });
}
module.exports = {remotes};
