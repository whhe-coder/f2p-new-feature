const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const P = st => ({currentID: st.projects?.currentID, cpId: st.projects?.currentProject?.id, loading: st.projects?.loading, attempted: st.projects?.hasAttemptedFetch, keys: Object.keys(st.projects || {}).join(',')});
run(async (page) => {
  const out = {};
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  out.s0 = await readStore(page, P);
  await page.waitForTimeout(15000);
  out.s15 = await readStore(page, P);
  out.expandedSdkHref = await page.evaluate(() => document.querySelector('[data-id=sidebar-sdk]')?.getAttribute('href'));
  await page.getByLabel('Collapse sidebar').click();
  await page.waitForTimeout(1500);
  out.rail = await page.evaluate(() => [...document.querySelectorAll('.app-root__sidebar-fixed button[aria-haspopup], .app-root__sidebar-fixed div[data-id] > a')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.tagName + '#' + (e.getAttribute('data-id') || e.parentElement.getAttribute('data-id'))));
  await page.screenshot({path: __dirname + '/../B/nav004-rail.png', clip: {x: 0, y: 120, width: 80, height: 680}, scale: 'css'});
  return out;
});
