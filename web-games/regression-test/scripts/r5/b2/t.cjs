// 401 scenario helpers. Mocks are fulfilled in the browser; nothing reaches the backend.
// /logout navigations are caught here (fulfill 204, so the document stays alive and every
// later attempt can be counted). They never reach the BFF, so the session is not ended.
const {HOST, readStore} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');

async function setup(page) {
  const log = w.watch(page);
  log.mockHits = [];
  log.logout = [];
  log.mocks = {}; // name -> {re, status} or {abort:true}; mutable between steps
  await page.route(/\/logout(\?|$|\/)/, r => {
    if (!r.request().isNavigationRequest()) return r.fallback();
    log.logout.push({at: w.iso(), url: w.short(r.request().url()), frameMain: r.request().frame() === page.mainFrame()});
    return r.fulfill({status: 204, body: ''});
  });
  await page.route(/account-platform-gateway/, r => {
    const req = r.request();
    if (req.method() === 'OPTIONS') return r.fallback();
    const url = req.url();
    for (const [name, m] of Object.entries(log.mocks)) {
      if (!m || !m.re.test(url)) continue;
      log.mockHits.push({at: w.iso(), name, method: req.method(), path: new URL(url).pathname, auth: !!req.headers().authorization, status: m.abort ? 'abort' : m.status});
      if (m.abort) return r.abort('failed');
      return r.fulfill({status: m.status, contentType: 'application/json',
        headers: {'access-control-allow-origin': HOST, 'access-control-allow-credentials': 'true'},
        body: JSON.stringify({code: m.status, error: `R5 mock ${m.status}`})});
    }
    return r.fallback();
  });
  return log;
}

async function waitFor(page, pred, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if (pred()) return true; await page.waitForTimeout(250); }
  return false;
}

async function pageState(page) {
  const s = await readStore(page, st => ({userToken: !!(st.user && st.user.token), user: !!(st.user && st.user.user)})).catch(e => ({error: String(e).slice(0, 80)}));
  const d = await page.evaluate(() => ({
    path: location.pathname + location.search,
    loader: !!document.querySelector('[class*="loader" i], [class*="spinner" i], [data-id*="loader"]'),
    iframe: !!document.querySelector('iframe.integration-frame, iframe[title="integration-guide"]'),
    toasts: [...document.querySelectorAll('[role=alert], [class*="toast" i], [class*="notification" i]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 3),
    balance: (document.querySelector('.dashboard-balance__value') || {}).innerText || null,
    topbarUser: !!document.querySelector('[data-id*="avatar" i], [class*="avatar" i]'),
    bodyLen: document.body.innerText.length
  })).catch(e => ({error: String(e).slice(0, 80)}));
  return {at: w.iso(), ...s, ...d};
}

function summary(log) {
  const firstMock = log.mockHits.find(h => h.status === 401);
  const firstLogout = log.logout[0];
  return {
    mockHits: log.mockHits.map(h => `${h.at.slice(11, 23)} ${h.name} ${h.method} ${h.path} auth=${h.auth} -> ${h.status}`),
    logout: log.logout.map(l => `${l.at.slice(11, 23)} ${l.url} main=${l.frameMain}`),
    logoutCount: log.logout.length,
    delayMs: firstMock && firstLogout ? Date.parse(firstLogout.at) - Date.parse(firstMock.at) : null,
    tokenPreviews: log.tokenPreviews,
    authLogCount: log.authLogCount,
    authLogShape: log.authLogShape,
    console: log.console.filter(c => !/Failed to load resource: the server responded with a status of (404|403)/.test(c.text)).slice(0, 12),
    pageErrors: log.pageErrors.slice(0, 5),
    navs: log.navs.filter(n => n.ev !== 'response' || /logout|login/.test(n.url)).map(n => `${n.at.slice(11, 23)} ${n.ev} ${n.status || n.err || ''} ${n.url}`)
  };
}

module.exports = {setup, waitFor, pageState, summary};
