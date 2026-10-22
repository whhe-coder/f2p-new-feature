const {attach} = require(__dirname + '/../lib.cjs');
(async () => {
  const {ctx} = await attach();
  const c = await ctx.cookies();
  console.log(JSON.stringify(c.filter(x => /srv\.local|xsolla/.test(x.domain) && /^(sb-pa|network-pa)/.test(x.name)).map(x => ({n: x.name, d: x.domain, p: x.path, ss: x.sameSite, exp: x.expires > 0 ? new Date(x.expires * 1000).toISOString() : 'session'}))));
  process.exit(0);
})();
