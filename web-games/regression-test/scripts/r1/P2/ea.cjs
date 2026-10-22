const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {blank, readKeys, setKeys, restore} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const res = {steps: []};
  const url = () => page.url().replace(/^.*\/account/, '') || '/';
  const urlsOver = async (ms) => { const seen = []; const end = Date.now() + ms; while (Date.now() < end) { const u = url(); if (seen[seen.length - 1] !== u) seen.push(u); await page.waitForTimeout(250); } return seen; };
  await blank(page);
  const uid = await page.evaluate(() => localStorage.getItem('userId'));
  const K = `ba.web-games.enterAccountSeen.${uid}`;
  res.keyName = `ba.web-games.enterAccountSeen.<userId len ${String(uid).length}>`;
  const snap = await readKeys(page, [K]); res.before = {exists: snap[K] !== null, value: snap[K]};
  try {
    await setKeys(page, {[K]: null});
    await page.goto(`${BASE}/53105`, {waitUntil: 'domcontentloaded'});
    const seen1 = await urlsOver(30000);
    const who = await readStore(page, st => ({admin: Boolean(st.admin && (st.admin.isAdmin || st.admin.is_admin)), role: st.merchants && st.merchants.current && st.merchants.current.role, uidMatch: null, storeUid: st.user && st.user.user && String(st.user.user.id).length}));
    res.steps.push({label: 'CONSENT-016 key absent, load /53105', t: Date.now() - t0, seen: seen1, who, key: (await readKeys(page, [K]))[K]});
    await setKeys(page, {[K]: 'true'});
    await page.goto(`${BASE}/enter-account`, {waitUntil: 'domcontentloaded'});
    const seen2 = await urlsOver(25000);
    const pageInfo = await page.evaluate(() => ({btns: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => /enter|learn/i.test(t)), title: (document.body.innerText.match(/[^\n]*Enter[^\n]*/g) || []).slice(0, 3)}));
    res.steps.push({label: 'CONSENT-018 key=true, load /enter-account', t: Date.now() - t0, seen: seen2, pageInfo});
    // HOME-024: first-visit state (key absent), press Enter account on the SDK screen
    await setKeys(page, {[K]: null});
    const btn = page.getByRole('button', {name: /^Enter account/}).first();
    if (await btn.count()) {
      await btn.click();
      const seen3 = await urlsOver(8000);
      res.steps.push({label: 'HOME-024 click Enter account', t: Date.now() - t0, seen: seen3, keyAfter: (await readKeys(page, [K]))[K], ui: await page.evaluate(() => /How will you launch this project\?/.test(document.body.innerText) ? 'Choose UI' : document.body.innerText.slice(0, 80))});
    } else res.steps.push({label: 'HOME-024', noButton: true});
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { const r = await restore(page, snap); res.restore = {ok: r.ok, back: r.back[K]}; }
  return res;
});
