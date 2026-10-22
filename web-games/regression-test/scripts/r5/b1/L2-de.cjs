// RT-ANA-008 (de), RT-UI-013 steps 1-3, RT-I18N-008 (de date), RT-I18N-006 (anti-fraud Blocklist), then back to en.
const {run, BASE, clientNav, readStore} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const hits = h.watchHits(page);
  const s = {};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="dashboard-balance"]');
  s.L0 = await h.state(page);
  const hitMark = hits.length;
  await h.switchLang(page, 'de');
  s.de = await h.state(page);
  s.anaHits = hits.slice(hitMark);
  s.deBalance = await page.evaluate(() => document.querySelector('[data-id="dashboard-balance"]')?.innerText.replace(/\n/g, ' | ').slice(0, 120));
  // RT-I18N-006
  await clientNav(page, '/for/web-games/account/53105/analytics/anti-fraud');
  await page.waitForTimeout(6000);
  s.antiFraud = await page.evaluate(() => {
    const tabs = [...document.querySelectorAll('[role=tab], [class*="tab"] a, [class*="tab"] button, nav a')].map(e => e.innerText.trim()).filter(Boolean);
    return {path: location.pathname, tabs: [...new Set(tabs)].slice(0, 25), hasBlocklist: /Blocklist/.test(document.body.innerText), sample: document.body.innerText.replace(/\n+/g, ' | ').slice(0, 400)};
  });
  // RT-UI-013 step 3: page without shell sidebar, then back to Dashboard.
  await clientNav(page, '/for/web-games/account/53105/communication-hub');
  await page.waitForTimeout(5000);
  s.hub = await h.state(page);
  await clientNav(page, '/for/web-games/account/53105/dashboard');
  await page.waitForSelector('[data-id="dashboard-balance"]', {timeout: 20000}).catch(() => {});
  await page.waitForTimeout(3000);
  s.backOnDashboard = await h.state(page);
  // Restore en.
  await h.switchLang(page, 'en');
  s.restored = await h.state(page);
  return {s, loc, hits: hits.map(x => ({at: x.at, en: x.en, ev: x.ev, ex: /language/.test(x.ev || '') ? x.excerpt : undefined}))};
}, {allow: [/users\/location/]});
