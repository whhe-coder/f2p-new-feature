const {attach, redact} = require('./lib.cjs');
(async () => {
  const {ctx} = await attach();
  const pages = ctx.pages().map(p => redact(p.url()));
  const cookies = (await ctx.cookies('https://accounts-sdk-skeleton.nl-k8s-stage.srv.local')).map(c => ({name: c.name, httpOnly: c.httpOnly}));
  console.log(JSON.stringify({pages, cookieNames: cookies}, null, 1));
  process.exit(0);
})();
