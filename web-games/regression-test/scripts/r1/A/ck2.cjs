const {attach} = require(__dirname + '/../lib.cjs');
(async () => {
  const {ctx} = await attach();
  const c = await ctx.cookies();
  const g = c.filter(x => /^(gc-pa|sb-pa|network-pa)/.test(x.name));
  console.log(JSON.stringify(g.map(x => ({n: x.name, v: /token/.test(x.name) ? `len ${x.value.length}` : x.value}))));
  process.exit(0);
})();
