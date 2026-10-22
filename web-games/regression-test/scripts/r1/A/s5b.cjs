const {run, BASE, settle, track, pick, now, waitFor, clientNav, path} = require(__dirname + '/../A/h.cjs');
const P = '/for/web-games/account/53105/projects/317869';
const dom = page => page.evaluate(() => {
  const hasRoot = el => Object.keys(el).some(k => k.startsWith('__reactContainer'));
  const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && hasRoot(el));
  const stack = [rootEl[Object.keys(rootEl).find(k => k.startsWith('__reactContainer'))]];
  const ids = new Set(['xsolla-gold', 'metaframe']); let n = 0;
  while (stack.length && n++ < 300000) {
    const f = stack.pop(); if (!f) continue;
    const p = f.memoizedProps;
    if (p && typeof p === 'object' && ids.has(p.name) && typeof f.type === 'function') {
      // hooks: state values
      const hooks = []; let h = f.memoizedState; let i = 0;
      while (h && i++ < 8) { const v = h.memoizedState; hooks.push(v === null ? 'null' : typeof v === 'object' ? (Array.isArray(v) ? 'array' : 'object') : typeof v === 'function' ? 'fn' : String(v).slice(0, 120)); h = h.next; }
      let c = f.child; while (c && !(c.stateNode instanceof Element)) c = c.child;
      return {name: p.name, hooks, html: c ? c.stateNode.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>').slice(0, 400) : 'no host child'};
    }
    if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child);
  }
  return null;
});
run(async (page) => {
  const tr = track(page);
  const out = {t1: now()};
  await page.goto(`${BASE}/53105/projects/317869/gold`, {waitUntil: 'domcontentloaded'});
  out.u1 = path(await settle(page));
  await page.waitForTimeout(20000);
  out.gold = await dom(page);
  out.goldWin = await page.evaluate(() => typeof window.xsolla_gold);
  out.t2 = now();
  await clientNav(page, P + '/metaframe');
  await page.waitForTimeout(10000);
  out.meta = await dom(page);
  out.u2 = path(page.url());
  out.reqs = pick(tr.gw, /remoteEntry|metaframe|\.js\?v=/);
  out.errs = [...new Set(tr.errs.filter(e => !/BLOCKED_BY_CLIENT|status of 404|Datadog/.test(e)))].slice(0, 8);
  return out;
});
