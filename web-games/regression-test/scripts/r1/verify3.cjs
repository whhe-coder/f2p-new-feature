const {attach, readStore} = require('./lib.cjs');
(async () => {
  const {ctx} = await attach();
  const page = ctx.pages().find(p => p.url().includes('srv.local/for/web-games'));
  const out = await readStore(page, s => ({
    admin: s.user.user && s.user.user.admin,
    hasToken: !!s.user.token,
    orgs: (s.user.organizations || []).map(o => o.id || o.org_id || o.merchant_id),
    merchantCurrent: s.merchants.current && (s.merchants.current.id || s.merchants.current.merchant_id),
    roles: s.privileges.roles,
    privilegeCount: (s.privileges.list || []).length,
    merchantFeatureCount: Array.isArray(s.features.merchantFeatures) ? s.features.merchantFeatures.length : Object.keys(s.features.merchantFeatures || {}).length,
    projectsTotal: s.projects.total,
    currentProject: s.projects.currentProject && (s.projects.currentProject.id || s.projects.currentProject),
    modules: (s.modules.modules || []).length,
    locale: s.locale.currentLocale,
  }));
  console.log(JSON.stringify(out));
  process.exit(0);
})();
