const {attach} = require(__dirname + '/../lib.cjs');
(async () => {
  const {ctx} = await attach();
  const c = await ctx.cookies();
  const out = [];
  for (const x of c) {
    if (!/srv\.local|xsolla\.com/.test(x.domain)) continue;
    const m = x.value.match(/eyJ[\w-]+\.([\w-]+)\.[\w-]*/);
    if (m) { try { const p = JSON.parse(Buffer.from(m[1], 'base64url').toString()); out.push({n: x.name, d: x.domain, exp: p.exp && new Date(p.exp * 1000).toISOString(), iat: p.iat && new Date(p.iat * 1000).toISOString()}); } catch (e) { out.push({n: x.name, err: 'parse'}); } }
  }
  console.log(JSON.stringify({now: new Date().toISOString(), out}));
  process.exit(0);
})();
