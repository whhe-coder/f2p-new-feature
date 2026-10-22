const {attach} = require('./lib.cjs');
(async () => {
  const {ctx} = await attach();
  const page = ctx.pages().find(p => p.url().includes('srv.local/for/web-games'));
  const out = await page.evaluate(() => {
    const els = [document.documentElement, document.body, ...document.querySelectorAll('body *')];
    const hits = [];
    for (const el of els) {
      const ks = Object.keys(el).filter(k => /^__react|^_react/.test(k));
      if (ks.some(k => /Container|RootContainer/.test(k))) hits.push({tag: el.tagName, id: el.id, keys: ks.map(k => k.split('$')[0])});
    }
    const anyFiber = els.find(el => Object.keys(el).some(k => k.startsWith('__reactFiber$')));
    return {hits: hits.slice(0, 5), firstFiberEl: anyFiber && (anyFiber.id || anyFiber.tagName), rootChildren: document.getElementById('root')?.children.length};
  });
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
})();
