const {run, BASE, collect, settle, readStore} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const urls = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) urls.push({t: new Date().toISOString(), u: f.url().replace(BASE, '{base}')}); });
  await page.goto(`${BASE}/53105//dashboard?x=1#h`, {waitUntil: 'domcontentloaded'});
  const final = (await settle(page, {stableMs: 4000})).replace(BASE, '{base}');
  const hist = await page.evaluate(() => history.length);
  const loc = await page.evaluate(() => ({p: location.pathname, s: location.search, h: location.hash}));
  await page.goBack({timeout: 15000}).catch(e => urls.push({backErr: e.message.slice(0, 100)}));
  await page.waitForTimeout(3000);
  const afterBack = page.url().replace(BASE, '{base}');
  return {final, loc, hist, afterBack, urls};
});
