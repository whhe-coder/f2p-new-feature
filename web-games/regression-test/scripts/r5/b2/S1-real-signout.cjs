// REAL SIGN-OUT (runs once). RT-AUTH-014 + RT-SEC-103 + RT-AUTH-015.
// Tab A = the lib page (guard with allowLogout); tab B = second tab, same guard options.
// Cookies: names and attributes only. No login attempt after sign-out. Both tabs are closed at the end.
const {run, BASE, guard, clientNav} = require(__dirname + '/../lib.cjs');
const w = require(__dirname + '/w.cjs');
const OPTS = {allowLogout: true, allow: [/\/logout(\?|$|\/)/]};
const srv = list => w.cookieMeta(list).filter(c => /srv\.local/.test(c.domain));
const fmt = n => `${n.at.slice(11, 23)} ${n.ev} ${n.status || n.err || ''} ${n.url}`;
run(async (A, ctx) => {
  const B = await ctx.newPage();
  await guard(B, OPTS);
  const out = {};
  try {
    const la = w.watch(A), lb = w.watch(B);
    const reqA = [];
    let recA = false;
    A.on('request', r => { if (recA && !/\.(png|svg|woff2?|jpg|gif|css)(\?|$)/.test(r.url())) reqA.push({at: w.iso(), m: r.method(), type: r.resourceType(), url: w.short(r.url()).replace(/\?.*$/, '?…')}); });
    A.on('response', r => { if (recA && (r.request().isNavigationRequest() || /logout|login|bff/.test(r.url()))) reqA.push({at: w.iso(), status: r.status(), url: w.short(r.url()).replace(/\?.*$/, '?…'), location: r.headers().location ? w.short(r.headers().location).replace(/\?.*$/, '?…') : undefined}); });
    await Promise.all([A, B].map(p => p.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'})));
    await Promise.all([A, B].map(p => p.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {})));
    await A.waitForTimeout(1500);
    out.ready = {A: await w.tokenPresent(A), B: await w.tokenPresent(B), at: w.iso()};
    out.cookiesBefore = srv(await ctx.cookies());
    // RT-AUTH-014: Sign out in A.
    const so = A.locator('button.profile-dropdown__action').filter({hasText: /^\s*Sign out\s*$/}).first();
    await A.locator('nav.app-navigation button.topbar__icon-button').last().click();
    await so.waitFor({state: 'visible', timeout: 5000});
    recA = true;
    const nA = la.navs.length;
    out.clickAt = w.iso();
    await so.click();
    await A.waitForTimeout(9000);
    out.A_landing = {url: w.short(A.url()).replace(/\?.*$/, '?…'), hasQuery: A.url().includes('?'), title: await A.title().catch(() => null), text: (await A.evaluate(() => document.body.innerText.slice(0, 160)).catch(() => '')).replace(/\n+/g, ' | ')};
    out.A_navs = la.navs.slice(nA).map(fmt);
    out.A_requests = reqA.slice(0, 40);
    // RT-SEC-103: cookies after sign-out.
    out.cookiesAfter = srv(await ctx.cookies());
    // RT-AUTH-015: B was not reloaded. Client navigation that fires gateway requests.
    const nB = lb.gw.length, nBn = lb.navs.length;
    out.B_before = {url: w.short(B.url()), ...(await w.tokenPresent(B))};
    out.B_navAt = w.iso();
    await clientNav(B, '/for/web-games/account/53105/projects');
    await B.waitForTimeout(9000);
    out.B_after = {url: w.short(B.url()).replace(/\?.*$/, '?…'), ...(await w.tokenPresent(B).catch(e => ({err: String(e).slice(0, 60)})))};
    out.B_gw = lb.gw.slice(nB).map(x => `${x.at.slice(11, 23)} ${x.m} ${x.s} ${x.p}`);
    out.B_navs = lb.navs.slice(nBn).map(fmt);
    out.B_console = lb.console.filter(c => /Gateway Auth|401/.test(c.text)).slice(0, 5);
    out.B_tokenPreviews = lb.tokenPreviews;
    // B: final reload.
    const nBn2 = lb.navs.length;
    await B.reload({waitUntil: 'domcontentloaded'}).catch(() => {});
    await B.waitForTimeout(6000);
    out.B_reload = {url: w.short(B.url()).replace(/\?.*$/, '?…'), navs: lb.navs.slice(nBn2).map(fmt)};
    // RT-AUTH-014 step 2: Back and deep link in A.
    await A.goBack({waitUntil: 'domcontentloaded', timeout: 10000}).catch(() => {});
    await A.waitForTimeout(4000);
    out.A_back = w.short(A.url()).replace(/\?.*$/, '?…');
    await A.goto(`${BASE}/53105/analytics`, {waitUntil: 'domcontentloaded', timeout: 15000}).catch(() => {});
    await A.waitForTimeout(4000);
    out.A_deeplink = w.short(A.url()).replace(/\?.*$/, '?…');
    out.cookiesEnd = srv(await ctx.cookies()).map(c => c.name + '@' + c.domain);
  } finally {
    await B.close().catch(() => {});
    out.closedB = true;
  }
  return out;
}, OPTS);
