// RT-I18N-007: per language, check Dashboard (Ask AI, Performance/Balance, promo banner), Choose UI and Games Portal guide.
// The Games Portal guide needs the local setup selection: set it to gamesPortal for the check, then remove it (restore to absent).
const {run, BASE, clientNav} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
const langs = (process.argv[2] || 'ja,ko,zh').split(',');
run(async (page) => {
  const loc = h.watchLocale(page);
  const B = '/for/web-games/account/53105';
  const out = {langs: {}};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="ask-ai-banner"]');
  out.selKeysBefore = await page.evaluate(() => Object.keys(localStorage).filter(k => /setup-selection/.test(k)).map(k => k + '=' + localStorage.getItem(k)));
  const KEY = 'web-games:setup-selection:web-games:53105';
  const grab = () => page.evaluate(() => {
    const t = s => (document.querySelector(s) || {}).innerText;
    const bal = document.querySelector('[data-id="dashboard-balance"]');
    const promo = [...document.querySelectorAll('body *')].find(e => /promo/i.test(String(e.className)) && e.innerText);
    return {askAi: t('[data-id="ask-ai-banner"]') && t('[data-id="ask-ai-banner"]').replace(/\n+/g, ' | '), perf: bal && bal.innerText.split('\n').slice(0, 2).join(' | '), promo: promo && promo.innerText.replace(/\n+/g, ' | ').slice(0, 140)};
  });
  const mainText = () => page.evaluate(() => { const m = document.querySelector('main, [class*="content"]') || document.body; return m.innerText.replace(/\n+/g, ' | ').slice(0, 220); });
  try {
    for (const c of langs) {
      const r = {};
      await clientNav(page, `${B}/dashboard`);
      await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 20000}).catch(() => {});
      await h.switchLang(page, c);
      r.store = (await h.state(page)).currentLocale;
      r.dash = await grab();
      r.dashKeys = await h.keyScan(page);
      await clientNav(page, `${B}/get-started`);
      await page.waitForTimeout(2500);
      r.chooseUi = await page.evaluate(() => ((document.querySelector('[data-id="root-layout"]') || document.body).innerText.replace(/\n+/g, ' | ').slice(0, 260)));
      r.chooseKeys = await h.keyScan(page);
      await page.evaluate(k => localStorage.setItem(k, 'gamesPortal'), KEY);
      await clientNav(page, `${B}/dashboard`); await page.waitForTimeout(800);
      await clientNav(page, `${B}/get-started`); await page.waitForTimeout(2500);
      r.gpGuide = await page.evaluate(() => { const e = document.querySelector('[class*="setup-content"]') || document.querySelector('[class*="setup-page"]'); return e ? e.innerText.replace(/\n+/g, ' | ').slice(0, 300) : 'NO setup-content'; });
      r.gpKeys = await h.keyScan(page);
      await page.evaluate(k => localStorage.removeItem(k), KEY);
      r.emptyLabels = await page.evaluate(() => [...document.querySelectorAll('button, h1, h2, h3, h4, label')].filter(e => e.offsetParent && !e.innerText.trim() && !e.querySelector('svg,img') && !e.getAttribute('aria-label')).map(e => e.outerHTML.slice(0, 120)).slice(0, 2));
      out.langs[c] = r;
    }
  } finally {
    await page.evaluate(k => localStorage.removeItem(k), KEY).catch(() => {});
    await clientNav(page, `${B}/dashboard`).catch(() => {});
    await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 20000}).catch(() => {});
    await h.switchLang(page, 'en').catch(() => {});
  }
  out.final = await h.state(page);
  out.selKeysAfter = await page.evaluate(() => Object.keys(localStorage).filter(k => /setup-selection/.test(k)).map(k => k + '=' + localStorage.getItem(k)));
  out.loc = loc.location.filter(x => x.body || x.status).map(x => `${x.at.slice(11, 19)} ${x.body || x.status}`);
  return out;
}, {allow: [/users\/location/]});
