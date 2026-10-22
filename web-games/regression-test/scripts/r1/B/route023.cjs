const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const out = [];
  for (const p of ['/53105/finance', '/53105/finance/', '/53105/finance/reports']) {
    await page.goto(`${BASE}${p}`, {waitUntil: 'domcontentloaded'});
    const u = await settle(page, {stableMs: 3000});
    await page.waitForSelector('#app-root__content', {timeout: 20000}).catch(() => {});
    const r = await page.evaluate(() => { const el = document.getElementById('app-root__content'); if (!el) return null; const cs = getComputedStyle(el); return {cls: el.className, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' '), p0: /_p0/.test(el.className)}; });
    out.push({open: p, final: u.replace(BASE, '{base}'), t: new Date().toISOString(), r});
  }
  return {out};
});
