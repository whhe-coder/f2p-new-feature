// RT-UI-008 (zh, Pricing chip) + RT-ANA-005 (zh, Legal chip analytics). Back to en.
const {run, BASE, clientNav} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const hits = h.watchHits(page);
  const cons = [];
  page.on('console', m => { const t = m.text(); if (/analytics|prompt|ask/i.test(t)) cons.push({at: h.iso(), type: m.type(), text: t.slice(0, 250)}); });
  const s = {};
  const B = '/for/web-games/account/53105';
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await h.waitApp(page, '[data-id="ask-ai-banner"]');
  s.balanceZero = await page.evaluate(() => document.querySelector('[class*="dashboard-balance__value"]')?.innerText);
  await h.switchLang(page, 'zh');
  s.zh = await h.state(page);
  s.banner = await page.evaluate(() => document.querySelector('[data-id="ask-ai-banner"]')?.innerText.replace(/\n+/g, ' | '));
  s.chips = await page.locator('[data-id="ask-ai-banner"] button[class*="ask-ai__chip"]').allInnerTexts();
  // RT-UI-008: first chip (Pricing)
  const h0 = hits.length;
  await page.locator('[data-id="ask-ai-banner"] button[class*="ask-ai__chip"]').nth(0).click();
  await page.waitForTimeout(1500);
  s.pricing = await page.evaluate(() => ({path: location.pathname, historyState: JSON.stringify(history.state && history.state.state), session: sessionStorage.getItem('aiAssistantQuestion')}));
  s.pricingHits = hits.slice(h0).filter(x => x.en).map(x => ({en: x.en, ev: x.ev, exv: x.exv}));
  // RT-ANA-005: back to dashboard, Legal chip
  await clientNav(page, `${B}/dashboard`);
  await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 20000});
  await page.waitForTimeout(1000);
  const h1 = hits.length;
  await page.locator('[data-id="ask-ai-banner"] button[class*="ask-ai__chip"]').nth(1).click();
  await page.waitForTimeout(3000);
  s.legal = await page.evaluate(() => ({path: location.pathname, historyState: JSON.stringify(history.state && history.state.state), session: sessionStorage.getItem('aiAssistantQuestion')}));
  s.legalHits = hits.slice(h1).map(x => ({at: x.at, en: x.en, ev: x.ev, exv: x.exv}));
  // restore en
  await clientNav(page, `${B}/dashboard`);
  await h.waitApp(page, '[data-id="ask-ai-banner"]', 20000);
  await h.switchLang(page, 'en');
  s.final = await h.state(page);
  return {s, cons, loc: loc.location.filter(x => x.body || x.status).map(x => `${x.at.slice(11, 19)} ${x.body || x.status}`)};
}, {allow: [/users\/location/]});
