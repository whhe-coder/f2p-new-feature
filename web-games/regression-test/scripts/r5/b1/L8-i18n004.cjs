// RT-I18N-004: Profile page language save. Allowed write: POST users/location only. /credential is aborted.
// Step 1 fr + Save; step 2 users/location aborted, pick de + Save; restore: unblock, English + Save.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  const cred = [];
  await page.route(/\/credential/, r => { cred.push({at: h.iso(), method: r.request().method()}); return r.abort('blockedbyclient'); });
  const cons = [];
  page.on('console', m => { const t = m.text(); if (/Failed to save|persist/i.test(t)) cons.push({at: h.iso(), text: t.slice(0, 160)}); });
  const s = {};
  const combo = () => page.locator('[data-id="profile-settings"] [role=combobox]').nth(1);
  const pick = async (label) => {
    if ((await combo().getAttribute('aria-expanded')) !== 'true') await combo().click();
    const opt = page.locator('[role=option]', {hasText: label}).first();
    await opt.waitFor({state: 'attached', timeout: 8000});
    await opt.scrollIntoViewIfNeeded().catch(() => {});
    await opt.click({timeout: 3000}).catch(() => opt.evaluate(e => e.click()));
    await page.waitForTimeout(500);
  };
  const save = async () => {
    const resp = page.waitForResponse(r => /users\/location/.test(r.url()), {timeout: 8000}).catch(() => null);
    await page.locator('[data-id="profile-settings"] button', {hasText: /^(Save|Enregistrer|Speichern|Сохранить)$/}).first().click();
    await resp;
    await page.waitForTimeout(2500);
  };
  const toasts = () => page.evaluate(() => [...document.querySelectorAll('[role=alert],[role=status],[class*="toast"],[class*="Toast"]')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 4));
  const view = async () => ({...(await h.state(page)), comboText: await combo().innerText(), heading: await page.evaluate(() => document.querySelector('[data-id="profile-settings"]').innerText.split('\n').slice(0, 3).join(' | '))});
  await page.goto(`${BASE}/53105/profile`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="profile-settings"] [role=combobox]', {timeout: 70000});
  await page.waitForTimeout(2500);
  s.L0 = await view();
  // Step 1
  await pick('Français');
  await save();
  s.step1 = {...(await view()), toasts: await toasts()};
  // Step 2: abort users/location
  const blocker = r => { loc.location.push({at: h.iso(), aborted: true, body: r.request().postData()}); return r.abort('failed'); };
  await page.route(/users\/location/, blocker);
  await pick('Deutsch');
  await save();
  s.step2 = {...(await view()), toasts: await toasts()};
  await page.unroute(/users\/location/, blocker);
  // Restore en
  await pick('English');
  await save();
  s.restore = {...(await view()), toasts: await toasts()};
  return {s, cons, cred, loc: loc.location.map(x => `${x.at.slice(11, 19)} ${x.method || ''} ${x.body || ''} ${x.status || ''} ${x.aborted ? 'ABORTED' : ''} ${x.failed || ''}`)};
}, {allow: [/users\/location/]});
