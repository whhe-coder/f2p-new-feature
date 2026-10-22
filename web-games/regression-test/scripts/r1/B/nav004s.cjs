const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.setViewportSize({width: 1280, height: 800});
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await require(__dirname + '/../B/h.cjs').waitApp(page); await page.waitForTimeout(1500);
  await page.getByLabel('Collapse sidebar').click();
  await page.waitForTimeout(1200);
  const b = page.locator('button[data-id="sidebar-other-tools"][aria-haspopup]');
  const box = await b.boundingBox();
  await b.hover(); await page.waitForTimeout(800);
  await page.screenshot({path: __dirname + '/../B/nav004-hover.png', clip: {x: 0, y: 0, width: 420, height: 800}, scale: 'css'});
  await b.click(); await page.waitForTimeout(1200);
  await page.screenshot({path: __dirname + '/../B/nav004-click.png', clip: {x: 0, y: 0, width: 420, height: 800}, scale: 'css'});
  const menus = await page.evaluate(() => [...document.querySelectorAll('[role=menu]')].map(m => m.innerText.slice(0, 120)));
  return {box, menus};
});
