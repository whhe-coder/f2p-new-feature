// Shared helpers for R1 checks. Attach to the headed Chromium started by launch.cjs.
// Never print token values: use redact() / headerNames() on anything that can hold them.
const {chromium} = require('/Users/wenhaohe/repo/web-games-account/e2e/node_modules/@playwright/test');

const CDP = 'http://127.0.0.1:9333';
const HOST = 'https://accounts-sdk-skeleton.nl-k8s-stage.srv.local';
const BASE = `${HOST}/for/web-games/account`;
const GW = 'account-platform-gateway.nl-k8s-stage.srv.local';

const SECRET_KEYS = /token|authorization|cookie|jwt|secret|password|session/i;

function redact(value) {
  return String(value)
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, '<jwt>')
    .replace(/(Bearer\s+)\S+/gi, '$1<redacted>')
    .replace(/([?&](?:token|access_token|code|state)=)[^&#\s]+/gi, '$1<redacted>')
    .replace(/[A-Za-z0-9+/_-]{60,}={0,2}/g, '<long>');
}

// Header names only; for secret-looking headers keep just "present".
function headerNames(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) out[k] = SECRET_KEYS.test(k) ? 'present' : redact(v).slice(0, 120);
  return out;
}

async function attach() {
  const browser = await chromium.connectOverCDP(CDP);
  const ctx = browser.contexts()[0];
  return {browser, ctx};
}

// Collect network/console/page errors for one page. Filter by `match` (RegExp) to keep output small.
function collect(page, match = /./) {
  const t0 = Date.now();
  const log = {requests: [], responses: [], console: [], pageErrors: []};
  page.on('request', r => {
    if (!match.test(r.url())) return;
    log.requests.push({t: Date.now() - t0, method: r.method(), type: r.resourceType(), url: redact(r.url())});
  });
  page.on('response', r => {
    if (!match.test(r.url())) return;
    log.responses.push({t: Date.now() - t0, status: r.status(), url: redact(r.url())});
  });
  page.on('console', m => log.console.push({t: Date.now() - t0, type: m.type(), text: redact(m.text()).slice(0, 300)}));
  page.on('pageerror', e => log.pageErrors.push({t: Date.now() - t0, text: redact(e.message).slice(0, 300)}));
  return log;
}

// Read-only safety net: abort writes before they leave the browser and record them as evidence.
// Analytics beacons (xmts-global-api /hit) stay allowed because RT-ANA-* cases read them.
const WRITE_POST = /assign_to_user|handle_all_utms|users\/location|consent|accept|agree|logout|settings|profile|pass_survey|invite|delete|update|save/i;
const blockedWrites = [];

async function guard(target) {
  await target.route('**/*', route => {
    const req = route.request();
    const url = req.url();
    const method = req.method();
    const isAnalytics = /xmts-global-api/.test(url);
    const isWrite = ['PUT', 'PATCH', 'DELETE'].includes(method) || (method === 'POST' && !isAnalytics && WRITE_POST.test(url));
    const isLogout = /\/logout(\?|$|\/)/.test(url) && req.isNavigationRequest();
    if (isWrite || isLogout) {
      blockedWrites.push({method, url: redact(url)});
      return route.abort('blockedbyclient');
    }
    return route.fallback();
  });
}

// Open a new tab in the logged-in context, run fn, close the tab, and exit without closing the browser.
async function run(fn, {keepPage = false} = {}) {
  const {ctx} = await attach();
  // Guard only this script's tab and its popups: parallel scripts share the browser,
  // and two clients intercepting the same request can stall it.
  const page = await ctx.newPage();
  await guard(page);
  ctx.on('page', async p => {
    if ((await p.opener().catch(() => null)) === page) await guard(p).catch(() => {});
  });
  try {
    const result = await fn(page, ctx);
    if (blockedWrites.length) result.blockedWrites = blockedWrites;
    console.log(JSON.stringify({at: new Date().toISOString(), ...result}, null, 1));
  } catch (e) {
    console.log(JSON.stringify({at: new Date().toISOString(), error: redact(e.stack || e.message)}));
  } finally {
    if (!keepPage) await page.close().catch(() => {});
    process.exit(0); // drop the CDP connection only; the browser keeps running
  }
}

// Client-side navigation inside the SPA (react-router listens to popstate).
async function clientNav(page, path) {
  await page.evaluate(p => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate', {state: {}}));
  }, path);
}

// Wait until location.href has been stable for `stableMs`.
async function settle(page, {stableMs = 2500, timeoutMs = 40000} = {}) {
  const start = Date.now();
  let last = page.url();
  let since = Date.now();
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(250);
    const now = page.url();
    if (now !== last) { last = now; since = Date.now(); }
    else if (Date.now() - since >= stableMs) break;
  }
  return redact(page.url());
}

// Read the Redux state: walk the React fiber tree from #root to the first memoizedProps.store.
// `pick` runs in the page as (state) => value. Return only names/booleans/counts, never tokens.
async function readStore(page, pick) {
  return page.evaluate(src => {
    const hasRoot = el => Object.keys(el).some(k => k.startsWith('__reactContainer'));
    const rootEl = [document.getElementById('root'), ...document.querySelectorAll('body *')].find(el => el && hasRoot(el));
    if (!rootEl) return {error: 'no react root'};
    const key = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
    const stack = [rootEl[key]];
    let n = 0;
    while (stack.length && n++ < 20000) {
      const f = stack.pop();
      if (!f) continue;
      const store = f.memoizedProps && f.memoizedProps.store;
      if (store && typeof store.getState === 'function') {
        return (0, eval)(`(${src})`)(store.getState());
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return {error: 'store not found'};
  }, pick.toString());
}

module.exports = {CDP, HOST, BASE, GW, redact, headerNames, attach, guard, collect, run, clientNav, settle, readStore};
