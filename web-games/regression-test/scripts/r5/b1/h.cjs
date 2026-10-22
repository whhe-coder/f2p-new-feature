// Batch-1 helpers built on ../lib.cjs. No token values are returned.
const {readStore, redact} = require(__dirname + '/../lib.cjs');

const LANG = {en: 'English', ru: 'Русский', de: 'Deutsch', ko: '한국어', ja: '日本語', zh: '中文 (简体)', es: 'Español', fr: 'Français', pt: 'Português'};
const iso = () => new Date().toISOString();

// Record users/location requests (method, body, status) and get_init_info user.locale.
function watchLocale(page) {
  const out = {location: [], init: []};
  page.on('request', r => {
    if (/users\/location/.test(r.url())) out.location.push({at: iso(), method: r.method(), url: redact(r.url()), body: (r.postData() || '').slice(0, 100)});
  });
  page.on('requestfailed', r => {
    if (/users\/location/.test(r.url())) out.location.push({at: iso(), failed: r.failure() && r.failure().errorText});
  });
  page.on('response', async r => {
    if (/users\/location/.test(r.url())) out.location.push({at: iso(), status: r.status()});
    if (/get_init_info/.test(r.url())) { try { const j = await r.json(); out.init.push({at: iso(), status: r.status(), userLocale: j.result && j.result.user && j.result.user.locale}); } catch (e) {} }
  });
  return out;
}

// Record analytics hits (xmts /hit): event name, ev and a short payload excerpt.
function watchHits(page) {
  const hits = [];
  page.on('request', r => {
    if (!/xmts/.test(r.url()) || !/hit/.test(r.url())) return;
    const pd = r.postData() || '';
    const src = decodeURIComponent(pd + ' ' + r.url());
    const en = (src.match(/"en"\s*:\s*"([^"]+)"/) || src.match(/[?&]en=([^&]+)/) || [])[1];
    const ev = (src.match(/"ev"\s*:\s*("([^"]*)"|null)/) || [])[1];
    const i = src.indexOf('"exv"');
    const exv = i >= 0 ? src.slice(i, i + 300) : undefined;
    hits.push({at: iso(), en, ev, exv: exv && redact(exv), excerpt: redact(src).slice(0, 200)});
  });
  return hits;
}

async function waitApp(page, sel = '.language-switcher__trigger', timeout = 75000) {
  await page.waitForSelector(sel, {timeout});
  await page.waitForTimeout(1500);
}

async function state(page) {
  const s = await readStore(page, st => ({currentLocale: st.locale && st.locale.currentLocale, userLocale: st.user && st.user.user && st.user.user.locale}));
  const d = await page.evaluate(() => ({
    topbar: (document.querySelector('.language-switcher__trigger') || {}).innerText,
    htmlLang: document.documentElement.lang,
    paLocale: document.cookie.split('; ').filter(c => /^pa-locale=/.test(c)).map(c => c.split('=')[1]),
    i18nextLng: localStorage.getItem('i18nextLng'),
    liveChat: window.LiveChatWidget ? window.LiveChatWidget.language : undefined,
    marker: window.__r5marker || null,
    path: location.pathname + location.search
  }));
  return {at: iso(), ...s, ...d};
}

async function switchLang(page, code) {
  await page.click('.language-switcher__trigger');
  const item = page.locator('[role=menuitem]', {hasText: LANG[code]}).first();
  await item.waitFor({timeout: 8000});
  const resp = page.waitForResponse(r => /users\/location/.test(r.url()), {timeout: 10000}).catch(() => null);
  await item.click();
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await readStore(page, st => st.locale && st.locale.currentLocale);
    if (s === code) break;
    await page.waitForTimeout(200);
  }
  await resp;
  await page.waitForTimeout(1200);
}

async function menuItems(page) {
  await page.click('.language-switcher__trigger');
  await page.waitForTimeout(600);
  const items = await page.locator('[role=menuitem]').allInnerTexts();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return items;
}

// Find text that looks like an untranslated key id.
async function keyScan(page) {
  return page.evaluate(() => {
    const t = document.body.innerText;
    return (t.match(/\b(host|app|web-games|platform-shared|platform)\.[a-z0-9_-]+(\.[a-z0-9_-]+)+\b/g) || []).slice(0, 10);
  });
}

module.exports = {LANG, iso, watchLocale, watchHits, waitApp, state, switchLang, menuItems, keyScan};
