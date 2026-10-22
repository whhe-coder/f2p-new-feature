// Find mounted RemoteModuleComponent-like fibers by props.name; keep fiber refs in window.__p2 (JS only, no DOM writes).
async function findRemote(page, name, tag) {
  return page.evaluate(({name, tag}) => {
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && Object.keys(el).some(k => k.startsWith('__reactContainer')));
    if (!rootEl) return {count: -1};
    const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
    const stack = [rootEl[key]]; let n = 0; const hits = [];
    while (stack.length && n++ < 300000) {
      const f = stack.pop(); if (!f) continue;
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && p.name === name && typeof f.type !== 'string') hits.push(f);
      if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child);
    }
    window.__p2 = window.__p2 || {};
    const prev = window.__p2[tag || 'sb'];
    const f = hits[0];
    if (tag && f && !prev) window.__p2[tag] = f;
    const host = (() => { if (!f) return null; const st = [f.child]; let k = 0; while (st.length && k++ < 5000) { const c = st.pop(); if (!c) continue; if (typeof c.type === 'string' && c.stateNode && c.stateNode.innerText !== undefined) return c.stateNode; if (c.sibling) st.push(c.sibling); if (c.child) st.push(c.child); } return null; })();
    return f ? {count: hits.length, key: f.key, propKeys: Object.keys(f.memoizedProps).filter(k => !/token/i.test(k)).join(','), match: f.memoizedProps.match && f.memoizedProps.match.url, projectId: f.memoizedProps.projectId || f.memoizedProps.project_id, rootURL: f.memoizedProps.rootURL, root: f.memoizedProps.root,
      sameAsSaved: prev ? (prev === f || prev === f.alternate) : null, hostText: host ? host.innerText.slice(0, 120).replace(/\s+/g, ' ') : null} : {count: 0};
  }, {name, tag});
}
module.exports = {findRemote};
