// RT-DASH-020 (2 cards / 0 cards / 500 / blocked) + RT-API-020 (a,b -> only a; 1 card vs many).
const {run, BASE, clientNav} = require(__dirname + '/../lib.cjs');
const u = require(__dirname + '/u.cjs');
run(async (page) => {
  const cfg = await u.mockUpsell(page, {info: {status: 200, body: [{id: 9001, title: 'Card A', image_url: u.IMG}, {id: 9002, title: 'Card B', image_url: u.IMG}]}});
  const errors = [];
  page.on('pageerror', e => errors.push({at: u.iso(), text: e.message.slice(0, 200)}));
  const s = {};
  const B = '/for/web-games/account/53105';
  const remount = async () => { await clientNav(page, `${B}/get-started`); await page.waitForTimeout(1500); await clientNav(page, `${B}/dashboard?utm_campaign=a,b`); };
  await page.goto(`${BASE}/53105/dashboard?utm_campaign=a,b`, {waitUntil: 'domcontentloaded'});
  s.two = {shown: await u.waitModal(page, 70000)}; await page.waitForTimeout(2000); s.two.modal = await u.modalInfo(page);
  await page.click('[data-id="upsell-modal"] button[aria-label="Close"]').catch(() => {});
  cfg.info = {status: 200, body: [{id: 9001, title: 'Card A single', image_url: u.IMG}]};
  await remount(); s.one = {shown: await u.waitModal(page, 20000)}; s.one.modal = await u.modalInfo(page);
  await page.click('[data-id="upsell-modal"] button[aria-label="Close"]').catch(() => {});
  cfg.info = {status: 200, body: []};
  await remount(); await page.waitForSelector('[data-id="dashboard-balance"]', {timeout: 20000}).catch(() => {}); await page.waitForTimeout(4000);
  s.zero = {modal: await u.modalInfo(page), balance: !!(await page.$('[data-id="dashboard-balance"]'))};
  cfg.info = {status: 500, body: {}};
  await remount(); await page.waitForSelector('[data-id="dashboard-balance"]', {timeout: 20000}).catch(() => {}); await page.waitForTimeout(4000);
  s.fail500 = {modal: await u.modalInfo(page), balance: !!(await page.$('[data-id="dashboard-balance"]')), toast: await page.evaluate(() => [...document.querySelectorAll('[role=alert],[class*="toast"]')].map(e => e.innerText).filter(Boolean).slice(0, 3))};
  cfg.info = {abort: true};
  await remount(); await page.waitForSelector('[data-id="dashboard-balance"]', {timeout: 20000}).catch(() => {}); await page.waitForTimeout(4000);
  s.blocked = {modal: await u.modalInfo(page), balance: !!(await page.$('[data-id="dashboard-balance"]'))};
  return {s, errors, mocks: cfg.log.map(x => `${x.at.slice(11, 19)} ${x.mock} ${x.method} ${x.url.replace(/^https:\/\/[^/]+/, '')} ${x.status}`)};
});
