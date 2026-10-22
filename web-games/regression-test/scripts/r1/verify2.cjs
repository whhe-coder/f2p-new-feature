const {attach, readStore} = require('./lib.cjs');
(async () => {
  const {ctx} = await attach();
  const all = ctx.pages(); console.error(all.map(p=>p.url().slice(0,90))); const page = all.find(p => p.url().includes('srv.local/for/web-games'));
  const out = await readStore(page, s => {
    const pick = o => o && typeof o === 'object' ? Object.keys(o).slice(0, 30) : typeof o;
    const r = {sliceKeys: Object.keys(s)};
    for (const k of Object.keys(s)) r[k] = pick(s[k]);
    return r;
  });
  const rootId = await page.evaluate(() => { const el=[...document.querySelectorAll('body *')].find(e=>Object.keys(e).some(k=>k.startsWith('__reactContainer$'))); return el && (el.id || el.tagName); });
  console.log(JSON.stringify({url: page.url(), rootId, out}, null, 1));
  process.exit(0);
})();
