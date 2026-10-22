// Helpers for agent A scripts (read-only). Fiber walk over the React tree, summarise props without secrets.
const lib = require(__dirname + '/../lib.cjs');

// Returns array of {name, exposedModule, props:{k:summary}, child:{k:summary}} for every RemoteModuleComponent-like fiber.
async function remotes(page, extra = {}) {
  return page.evaluate(({extra}) => {
    const SECRET = /token|authorization|cookie|jwt|secret|password|session/i;
    const ids = new Set((window.__modules || []).map(m => m.module_id));
    ['xaa_widgets', 'disputes', 'sdk_integration', 'sdk-integration', 'storefront', 'payments', 'support', 'subscriptions', 'xsolla_gold', 'metaframe', 'site_builder', 'funding', 'finance', 'launcher', 'communication_platform'].forEach(x => ids.add(x));
    const summ = v => {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      const t = typeof v;
      if (t === 'number') return Number.isNaN(v) ? 'number:NaN' : `number:${v}`;
      if (t === 'boolean') return `boolean:${v}`;
      if (t === 'string') return `string:${v.slice(0, 100)}`;
      if (t === 'function') return 'function';
      if (Array.isArray(v)) return `array(${v.length})`;
      if (t === 'object') { if (v.$$typeof) return 'react-element'; return `object{${Object.keys(v).slice(0, 15).join(',')}}`; }
      return t;
    };
    const safe = (props) => {
      const o = {};
      for (const [k, v] of Object.entries(props || {})) {
        if (k === 'children') continue;
        if (SECRET.test(k)) o[k] = typeof v === 'string' ? `string(len ${v.length}, jwt=${/^eyJ/.test(v)})` : summ(v);
        else if (k === 'preferences' && v && typeof v === 'object') o[k] = JSON.stringify(v).slice(0, 200);
        else if (k === 'merchantDetails' || k === 'privilegesList') o[k] = summ(v);
        else o[k] = summ(v);
      }
      return o;
    };
    const hasRoot = el => Object.keys(el).some(k => k.startsWith('__reactContainer'));
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && hasRoot(el));
    if (!rootEl) return {error: 'no root'};
    const root = rootEl[Object.keys(rootEl).find(k => k.startsWith('__reactContainer'))];
    const out = [];
    const stack = [root];
    let n = 0;
    while (stack.length && n++ < 200000) {
      const f = stack.pop();
      if (!f) continue;
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.name === 'string' && ids.has(p.name) && typeof f.type === 'function') {
        // find rendered remote root: first descendant function component with props.basename
        let child = null;
        const st = [f.child];
        let m = 0;
        while (st.length && m++ < 3000) {
          const c = st.pop();
          if (!c) continue;
          if (c.memoizedProps && typeof c.memoizedProps === 'object' && 'basename' in c.memoizedProps && c !== f) { child = c; break; }
          if (c.sibling) st.push(c.sibling);
          if (c.child) st.push(c.child);
        }
        out.push({name: p.name, exposedModule: p.exposedModule, loadingFallback: 'loadingFallback' in p ? summ(p.loadingFallback) : 'absent', props: safe(p), childMounted: !!child, child: child ? safe(child.memoizedProps) : null});
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return out;
  }, {extra});
}

// Compare token-like props of remotes with a given bearer (in page, returns booleans only).
async function tokenCompare(page, bearer) {
  return page.evaluate((bearer) => {
    const hasRoot = el => Object.keys(el).some(k => k.startsWith('__reactContainer'));
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && hasRoot(el));
    const root = rootEl[Object.keys(rootEl).find(k => k.startsWith('__reactContainer'))];
    const ids = new Set((window.__modules || []).map(m => m.module_id));
    const out = [];
    const stack = [root];
    let n = 0;
    while (stack.length && n++ < 200000) {
      const f = stack.pop();
      if (!f) continue;
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.name === 'string' && ids.has(p.name) && typeof f.type === 'function') {
        for (const [k, v] of Object.entries(p)) if (/token/i.test(k)) out.push({name: p.name, key: k, type: typeof v, equalsBearer: v === bearer});
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return out;
  }, bearer);
}

function track(page) {
  const t0 = Date.now();
  const gw = [];
  let bearer = null;
  page.on('request', r => {
    const u = r.url();
    if (/remoteEntry|mf-manifest|account-platform-gateway|xsolla\.com\/api|\/api\//.test(u) || r.resourceType() === 'script' && /remote|[?&]v=[0-9a-f-]{36}|mf-manifest/i.test(u)) {
      const h = r.headers();
      if (!bearer && h.authorization && /gateway/.test(u)) bearer = h.authorization.replace(/^Bearer\s+/i, '');
      gw.push({t: Date.now() - t0, m: r.method(), u: rurl(u).slice(0, 260), auth: !!h.authorization, bai: h['business-account-id']});
    }
  });
  page.on('response', r => {
    const u = r.url();
    const e = [...gw].reverse().find(x => x.u === rurl(u).slice(0, 260) && x.s === undefined);
    if (e) { e.s = r.status(); e.ts = Date.now() - t0; }
  });
  const errs = [];
  page.on('pageerror', e => errs.push(lib.redact(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (/mf-runtime|Remote|remote|loaded|Failed/i.test(t)) errs.push(`${m.type()}: ${lib.redact(t).slice(0, 200)}`); } });
  return {gw, errs, getBearer: () => bearer, t0};
}

const pick = (gw, re) => gw.filter(x => re.test(x.u)).map(x => `${x.m} ${x.u} -> ${x.s} @${x.t}ms${x.bai ? ' BAI=' + x.bai : ''}${x.auth ? ' auth' : ''}`);
const now = () => new Date().toISOString();
const rurl = u => String(u).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, '<jwt>').replace(/([?&](?:token|access_token|code|state|jwt)=)[^&#\s]+/gi, '$1<redacted>');

async function waitFor(page, fn, ms = 30000, arg) {
  try { await page.waitForFunction(fn, arg, {timeout: ms}); return true; } catch { return false; }
}

module.exports = {...lib, rurl, remotes, tokenCompare, track, pick, now, waitFor};

// Find fibers whose memoizedProps contain all `keys`; summarise their props (secret keys masked).
async function fiberFind(page, keys, limit = 3) {
  return page.evaluate(({keys, limit}) => {
    const SECRET = /token|authorization|cookie|jwt|secret|password|session/i;
    const summ = v => v === null ? 'null' : v === undefined ? 'undefined' : typeof v === 'number' ? (Number.isNaN(v) ? 'number:NaN' : `number:${v}`) : typeof v === 'boolean' ? `boolean:${v}` : typeof v === 'string' ? `string:${v.slice(0, 100)}` : typeof v === 'function' ? 'function' : Array.isArray(v) ? `array(${v.length})` : (v.$$typeof ? 'react-element' : `object{${Object.keys(v).slice(0, 12).join(',')}}`);
    const hasRoot = el => Object.keys(el).some(k => k.startsWith('__reactContainer'));
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body > *')].find(el => el && hasRoot(el));
    if (!rootEl) return {error: 'no root'};
    const stack = [rootEl[Object.keys(rootEl).find(k => k.startsWith('__reactContainer'))]];
    const out = []; let n = 0;
    while (stack.length && n++ < 300000 && out.length < limit) {
      const f = stack.pop(); if (!f) continue;
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && keys.every(k => k in p)) {
        const o = {};
        for (const [k, v] of Object.entries(p)) { if (k === 'children') continue; o[k] = SECRET.test(k) && typeof v === 'string' ? `string(len ${v.length})` : summ(v); }
        out.push({type: typeof f.type === 'function' ? (f.type.displayName || f.type.name || 'fn') : String(f.type && f.type.$$typeof ? 'memo/forward' : f.type), props: o});
      }
      if (f.sibling) stack.push(f.sibling); if (f.child) stack.push(f.child);
    }
    return out;
  }, {keys, limit});
}
module.exports.fiberFind = fiberFind;
const _path = u => (u.split('/web-games/account')[1] || u);
module.exports.path = _path;
