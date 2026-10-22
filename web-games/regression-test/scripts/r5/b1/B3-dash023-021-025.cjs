// Role mocked to ROLE_OWNER (organization/detail response only).
// RT-DASH-023 search + sort; RT-DASH-021 (a,,b) assign body; RT-DASH-025 / RT-API-023 step 1 (assign 500).
const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const u = require(__dirname + '/u.cjs');
run(async (page) => {
  const cfg = await u.mockUpsell(page, {role: 'ROLE_OWNER', info: {status: 200, body: [{id: 9001, title: 'R5 QA card', image_url: u.IMG}]}, assign: {status: 500, body: {}}});
  const s = {};
  await page.goto(`${BASE}/53105/dashboard?utm_campaign=a,,b`, {waitUntil: 'domcontentloaded'});
  s.shown = await u.waitModal(page, 70000);
  await page.waitForTimeout(2500);
  s.modal = await u.modalInfo(page);
  s.role = await readStore(page, st => st.merchants.current && st.merchants.current.role);
  // Sort check against the store.
  s.sort = await readStore(page, st => {
    const items = st.projects.items || [];
    const name = n => typeof n === 'string' ? n : Object.values(n || {})[0] || '';
    const byId = {}; items.forEach(p => { byId[p.id] = p; });
    const btns = [...document.querySelectorAll('[data-id^="upsell-project-"]')].map(b => Number(b.getAttribute('data-id').replace('upsell-project-', '')));
    const flags = btns.map(id => byId[id] ? byId[id].enabled : null);
    const firstEnabledIdx = flags.indexOf(true);
    const lastDisabledIdx = flags.lastIndexOf(false);
    const disabledNames = btns.filter((id, i) => flags[i] === false).map(id => name(byId[id].name));
    const sortedOk = disabledNames.every((n, i) => i === 0 || !(n < disabledNames[i - 1]));
    return {storeItems: items.length, storeTotal: st.projects.total, shown: btns.length, disabled: flags.filter(f => f === false).length, enabled: flags.filter(f => f === true).length, firstEnabledIdx, lastDisabledIdx, disabledFirst: firstEnabledIdx === -1 || lastDisabledIdx < firstEnabledIdx, disabledNameSorted: sortedOk, head: btns.slice(0, 4).map((id, i) => `${name(byId[id].name)}:${flags[i]}`)};
  });
  // Search: mixed case + surrounding spaces, substring.
  const input = page.locator('[data-id="upsell-modal"] input');
  const names = await page.locator('[data-id^="upsell-project-"]').allInnerTexts();
  const sample = names.find(n => n.length >= 6) || names[0];
  const sub = sample.slice(1, Math.min(sample.length, 5));
  const q = '  ' + sub.split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('') + '  ';
  await input.fill(q); await page.waitForTimeout(500);
  const filtered = await page.locator('[data-id^="upsell-project-"]').allInnerTexts();
  const expected = names.filter(n => n.toLowerCase().includes(sub.toLowerCase()));
  s.search = {query: JSON.stringify(q), sub, filtered: filtered.length, expected: expected.length, allMatch: filtered.every(n => n.toLowerCase().includes(sub.toLowerCase())), sameSet: JSON.stringify(filtered) === JSON.stringify(expected)};
  await input.fill('zz-r5-no-match-zz'); await page.waitForTimeout(400);
  s.empty = {count: await page.locator('[data-id^="upsell-project-"]').count(), text: await page.evaluate(() => (document.querySelector('[data-id="upsell-modal"]') || {}).innerText.split('\n').slice(-2).join(' | '))};
  await input.fill(''); await page.waitForTimeout(400);
  // Assign (mocked 500).
  const first = page.locator('[data-id^="upsell-project-"]').first();
  s.clickedProject = await first.getAttribute('data-id');
  const urlBefore = page.url();
  await first.click();
  await page.waitForTimeout(3000);
  s.afterAssign = {modalOpen: !!(await page.$('[data-id="upsell-modal"]')), urlSame: page.url() === urlBefore, path: page.url().replace(/^https:\/\/[^/]+/, ''), balance: !!(await page.$('[data-id="dashboard-balance"]')), toast: await page.evaluate(() => [...document.querySelectorAll('[role=alert],[class*="toast"],[class*="notify"]')].map(e => e.innerText).filter(Boolean).slice(0, 3))};
  return {s, mocks: cfg.log.map(x => `${x.at.slice(11, 19)} ${x.mock} ${x.method || ''} ${(x.url || '').replace(/^https:\/\/[^/]+/, '')} ${x.status || ''} ${x.body || ''} ${x.from ? x.from + '->' + x.to : ''}`), navs: cfg.navs};
});
