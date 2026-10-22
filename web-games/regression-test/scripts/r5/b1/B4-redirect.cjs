// RT-DASH-024 / RT-FRAME-010 / RT-SEC-106: click a project, assign_to_user mocked 200, salescards/{id} mocked,
// then record where window.location.replace sends the main frame. Role mocked to ROLE_OWNER.
// argv[2]: guide | noguide | ext | rel | extq
const {run, BASE} = require(__dirname + '/../lib.cjs');
const u = require(__dirname + '/u.cjs');
const v = process.argv[2] || 'guide';
const stepUrl = {guide: 'https://developers.xsolla.com/doc/pay-station/', ext: 'https://example.com/x', rel: '/53105/projects', extq: 'https://example.com/x?a=1'}[v];
run(async (page) => {
  const assignBody = [{salesCardId: 9001, integrationGuideExist: v !== 'noguide'}];
  const cfg = await u.mockUpsell(page, {
    role: 'ROLE_OWNER',
    info: {status: 200, body: [{id: 9001, title: 'R5 QA card', image_url: u.IMG}]},
    assign: {status: 200, body: assignBody},
    detail: {status: 200, body: {id: 9001, activeStepId: 2, steps: [{id: 1, url: 'https://developers.xsolla.com/doc/first/'}, {id: 2, url: stepUrl}]}}
  });
  const order = [];
  page.on('request', r => { const p = r.url(); if (/salescards|handle_all_utms/.test(p) || (r.isNavigationRequest() && r.frame() === page.mainFrame())) order.push(`${u.iso().slice(11, 23)} ${r.method()} ${p.split('?')[0].replace(/^https:\/\/[^/]+/, m => m.includes('gateway') ? '{GW}' : m)}${p.includes('?') ? '?' + p.split('?').slice(1).join('?') : ''}`); });
  const s = {variant: v, stepUrl, assignBody};
  await page.goto(`${BASE}/53105/dashboard?utm_campaign=spring`, {waitUntil: 'domcontentloaded'});
  s.shown = await u.waitModal(page, 70000);
  await page.waitForTimeout(2000);
  s.modal = await u.modalInfo(page);
  s.urlAtModal = page.url().replace(/^https:\/\/[^/]+/, '');
  s.roleInStore = await require(__dirname + '/../lib.cjs').readStore(page, st => st.merchants.current && st.merchants.current.role).catch(e => String(e).slice(0, 80));
  if (!s.modal || !s.modal.projectCount) return {s, order, navs: cfg.navs, mocks: cfg.log.map(x => `${x.at.slice(11, 19)} ${x.mock} ${x.status || ''} ${x.from ? x.from + '->' + x.to : ''}`)};
  const first = page.locator('[data-id^="upsell-project-"]').first();
  s.project = await first.getAttribute('data-id');
  s.clickAt = u.iso();
  const nav = page.waitForEvent('framenavigated', {predicate: f => f === page.mainFrame(), timeout: 15000}).catch(() => null);
  await first.click();
  await nav;
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2500);
  s.final = {url: page.url(), title: await page.title().catch(() => ''), body: await page.evaluate(() => document.body ? document.body.innerText.slice(0, 160) : '').catch(e => 'eval error: ' + e.message.slice(0, 80))};
  if (!/accounts-sdk-skeleton/.test(page.url())) { await page.goBack({waitUntil: 'domcontentloaded'}).catch(() => {}); s.returnedTo = page.url(); }
  return {s, order, navs: cfg.navs, mocks: cfg.log.map(x => `${x.at.slice(11, 19)} ${x.mock} ${x.method || ''} ${x.status || ''} ${x.body || ''} ${x.from ? x.from + '->' + x.to : ''}`)};
});
