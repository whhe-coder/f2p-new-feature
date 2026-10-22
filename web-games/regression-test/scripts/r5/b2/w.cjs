// Batch-2 helpers (401 / sign-out). Never return token or cookie values.
const {redact, readStore, BASE} = require(__dirname + '/../lib.cjs');
const iso = () => new Date().toISOString();
const short = u => redact(u).replace(/^https:\/\/accounts-sdk-skeleton\.nl-k8s-stage\.srv\.local/, '{host}').replace(/^https:\/\/account-platform-gateway\.nl-k8s-stage\.srv\.local/, '{GW}');

// Summarise a tokenPreview value without returning its characters.
function previewInfo(v) {
  const s = String(v);
  const core = s.replace(/\.\.\.$/, '');
  return {printed: core !== 'undefined' && core.length > 0, chars: core === 'undefined' ? 0 : core.length,
    format: core === 'undefined' ? 'undefined' : core.startsWith('eyJ') ? 'eyJ… (base64url JWT header)' : 'other', ellipsis: s.endsWith('...')};
}

function watch(page) {
  const w = {navs: [], gw: [], console: [], pageErrors: [], authLogCount: 0, tokenPreviews: []};
  const main = r => r.frame() === page.mainFrame();
  page.on('request', r => { if (r.isNavigationRequest() && main(r)) w.navs.push({at: iso(), ev: 'request', url: short(r.url())}); });
  page.on('requestfailed', r => { if (r.isNavigationRequest() && main(r)) w.navs.push({at: iso(), ev: 'failed', err: r.failure() && r.failure().errorText, url: short(r.url())}); });
  page.on('response', r => {
    const u = r.url();
    if (r.request().isNavigationRequest() && main(r.request())) w.navs.push({at: iso(), ev: 'response', status: r.status(), url: short(u)});
    if (/account-platform-gateway/.test(u) && r.request().method() !== 'OPTIONS') w.gw.push({at: iso(), m: r.request().method(), s: r.status(), p: new URL(u).pathname});
  });
  page.on('framenavigated', f => { if (f === page.mainFrame()) w.navs.push({at: iso(), ev: 'framenavigated', url: short(f.url())}); });
  page.on('console', async m => {
    let text = m.text();
    if (/\[Gateway\] Authenticated request/.test(text)) {
      w.authLogCount++;
      if (!w.authLogShape) {
        w.authLogShape = 'pending';
        const v = await (m.args()[1] ? m.args()[1].jsonValue().catch(() => null) : null);
        w.authLogShape = v ? {keys: Object.keys(v), tokenLength: v.tokenLength, anyValueLooksLikeJwt: Object.values(v).some(x => typeof x === 'string' && /^eyJ/.test(x))} : 'unreadable';
      }
      return;
    }
    if (/tokenPreview|\[Gateway Auth\]/.test(text)) {
      const at = iso();
      for (const a of m.args()) {
        const v = await a.jsonValue().catch(e => ({jsonValueError: String(e).slice(0, 80)}));
        if (v && typeof v === 'object') {
          const keys = Object.keys(v);
          w.tokenPreviews.push({at, keys, url: v.url, status: v.status, hasToken: v.hasToken, ...('tokenPreview' in v ? previewInfo(v.tokenPreview) : {noTokenPreviewKey: true}), err: v.jsonValueError});
        }
      }
      text = text.replace(/tokenPreview:?\s*["']?[^,}"']*["']?/g, 'tokenPreview: <omitted>');
    }
    if (/ERR_BLOCKED_BY_CLIENT|X-Frame-Options/.test(text)) return;
    if (/Gateway|401|logout|login|Unauthori|auth/i.test(text) || m.type() === 'error')
      w.console.push({at: iso(), type: m.type(), text: redact(text).replace(/eyJ[\w-]{3,}/g, '<jwt-part>').slice(0, 260)});
  });
  page.on('pageerror', e => w.pageErrors.push({at: iso(), text: redact(e.message).slice(0, 200)}));
  return w;
}

async function tokenPresent(page) {
  return readStore(page, st => ({userToken: !!(st.user && st.user.token), user: !!(st.user && st.user.user)}));
}

// Fresh full load of the dashboard, then report whether user.token exists (boolean only).
async function freshCheck(page, path = '/53105/dashboard') {
  await page.goto(`${BASE}${path}`, {waitUntil: 'domcontentloaded'});
  const t0 = Date.now();
  let s = null;
  while (Date.now() - t0 < 45000) {
    await page.waitForTimeout(1000);
    s = await tokenPresent(page).catch(() => null);
    if (s && s.userToken) break;
  }
  return {at: iso(), url: short(page.url()), ...s};
}

function cookieMeta(list) {
  return list.map(c => ({name: c.name, domain: c.domain, path: c.path, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite, expires: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session'}))
    .sort((a, b) => (a.name + a.domain).localeCompare(b.name + b.domain));
}

module.exports = {iso, short, watch, tokenPresent, freshCheck, cookieMeta, previewInfo};
