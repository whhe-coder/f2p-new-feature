const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
run(async (page) => {
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForFunction(() => document.querySelector('#livechat'), null, {timeout: 40000}).catch(() => {});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => [...document.querySelectorAll('#livechat-bap-expanded, #livechat-bap-collapsed')].map(e => { const b = e.getBoundingClientRect(); return {id: e.id, tag: e.tagName, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height)}; }));
  await page.screenshot({path: __dirname + '/../B/ui012-exp.png', clip: {x: 0, y: 560, width: 300, height: 240}, scale: 'css'});
  return {r};
});
