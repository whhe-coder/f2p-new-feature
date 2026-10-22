// RT-DASH-019 (single card) + RT-DASH-026 (close by overlay / x / inner blank). Real role (ROLE_ADMIN).
const {run, BASE, clientNav, readStore} = require(__dirname + '/../lib.cjs');
const u = require(__dirname + '/u.cjs');
run(async (page) => {
  const cfg = await u.mockUpsell(page, {info: {status: 200, body: [{id: 9001, title: 'R5 QA card', image_url: u.IMG}]}});
  const s = {};
  const B = '/for/web-games/account/53105';
  await page.goto(`${BASE}/53105/dashboard?utm_campaign=spring`, {waitUntil: 'domcontentloaded'});
  s.shown1 = await u.waitModal(page, 70000);
  await page.waitForTimeout(2500);
  s.modal1 = await u.modalInfo(page);
  s.role = await readStore(page, st => st.merchants.current && st.merchants.current.role);
  s.putAfterMount1 = cfg.log.filter(x => x.mock === 'handle_all_utms').length;
  // 1. overlay click (top-left corner of the overlay, outside the dialog)
  await page.mouse.click(5, 5);
  await page.waitForTimeout(700);
  s.closedByOverlay = !(await page.$('[data-id="upsell-modal"]'));
  // reopen: remount Dashboard via client navigation
  await clientNav(page, `${B}/get-started`); await page.waitForTimeout(1500);
  await clientNav(page, `${B}/dashboard?utm_campaign=spring`);
  s.shown2 = await u.waitModal(page, 20000);
  await page.click('[data-id="upsell-modal"] button[aria-label="Close"]');
  await page.waitForTimeout(700);
  s.closedByX = !(await page.$('[data-id="upsell-modal"]'));
  await clientNav(page, `${B}/get-started`); await page.waitForTimeout(1500);
  await clientNav(page, `${B}/dashboard?utm_campaign=spring`);
  s.shown3 = await u.waitModal(page, 20000);
  const box = await page.locator('[data-id="upsell-modal"] > div').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 6);
  await page.waitForTimeout(700);
  s.stillOpenAfterInnerClick = !!(await page.$('[data-id="upsell-modal"]'));
  await page.click('[data-id="upsell-modal"] button[aria-label="Close"]');
  await page.waitForTimeout(500);
  s.finalClosed = !(await page.$('[data-id="upsell-modal"]'));
  s.url = page.url().replace(/^https:\/\/[^/]+/, '');
  return {s, mocks: cfg.log, navs: cfg.navs};
});
