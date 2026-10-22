const {run, BASE, HOST, readStore} = require(__dirname + '/../lib.cjs');
const {blank, readKeys, setKeys, restore} = require(__dirname + '/../P2/st.cjs');
const LK = 'i18nextLng';
run(async (page, ctx) => {
  const t0 = Date.now(); const res = {poll: []};
  const ck = async () => (await ctx.cookies(HOST)).filter(c => /^pa-locale$/.test(c.name));
  const ckStr = cs => cs.map(c => `${c.value}@${c.domain}${c.path}`).join(',');
  await blank(page);
  const snapLs = await readKeys(page, [LK]); const snapCk = await ck();
  res.before = {ls: snapLs, ck: snapCk.map(c => ({v: c.value, d: c.domain, p: c.path, exp: c.expires > 0 ? new Date(c.expires * 1000).toISOString() : 'session', ss: c.sameSite, sec: c.secure, ho: c.httpOnly}))};
  try {
    const nav = page.goto(`${BASE}/53105/dashboard?locale=fr`, {waitUntil: 'commit'});
    await nav;
    let last = '';
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(300);
      let s;
      try {
        s = await page.evaluate(() => ({q: location.search, lang: document.documentElement.lang, ls: localStorage.getItem('i18nextLng'), dash: (document.body && document.body.innerText.match(/Tableau de bord|Dashboard|Commencer|Get started/g) || []).slice(0, 2).join('|')}));
        s.store = await readStore(page, st => st.locale && (st.locale.locale || st.locale.current || JSON.stringify(st.locale).slice(0, 40))).catch(() => null);
        s.user = await readStore(page, st => Boolean(st.user && st.user.user && st.user.user.email)).catch(() => null);
      } catch (e) { s = {err: String(e).slice(0, 40)}; }
      s.ck = ckStr(await ck());
      const k = JSON.stringify(s);
      if (k !== last) { res.poll.push({t: Date.now() - t0, ...s}); last = k; }
    }
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally {
    res.restoreLs = await restore(page, snapLs);
    const nowCk = await ck();
    if (ckStr(nowCk) !== ckStr(snapCk)) {
      for (const c of nowCk) await ctx.clearCookies({name: c.name, domain: c.domain, path: c.path});
      await ctx.addCookies(snapCk);
      res.cookieRestored = true;
    }
    const after = await ck();
    res.restoreCk = {before: ckStr(snapCk), after: ckStr(after), attrsSame: JSON.stringify(after.map(c => [c.domain, c.path, Math.round(c.expires), c.sameSite])) === JSON.stringify(snapCk.map(c => [c.domain, c.path, Math.round(c.expires), c.sameSite]))};
  }
  return res;
});
