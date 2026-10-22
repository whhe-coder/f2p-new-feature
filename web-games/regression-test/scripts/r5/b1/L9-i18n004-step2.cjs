// RT-I18N-004 step 2 repeat: users/location aborted in the browser, pick Deutsch, Save, poll for the failure toast.
const {run, BASE} = require(__dirname + '/../lib.cjs');
const h = require(__dirname + '/h.cjs');
run(async (page) => {
  const loc = h.watchLocale(page);
  await page.route(/\/credential/, r => r.abort('blockedbyclient'));
  await page.route(/users\/location/, r => { loc.location.push({at: h.iso(), aborted: true, body: r.request().postData()}); return r.abort('failed'); });
  const combo = () => page.locator('[data-id="profile-settings"] [role=combobox]').nth(1);
  await page.goto(`${BASE}/53105/profile`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="profile-settings"] [role=combobox]', {timeout: 70000});
  await page.waitForTimeout(2500);
  const L0 = await h.state(page);
  await combo().click();
  const opt = page.locator('[role=option]', {hasText: 'Deutsch'}).first();
  await opt.waitFor({state: 'attached', timeout: 8000});
  await opt.click({timeout: 3000}).catch(() => opt.evaluate(e => e.click()));
  await page.waitForTimeout(400);
  const clickAt = h.iso();
  await page.locator('[data-id="profile-settings"] button', {hasText: /^Save$/}).click();
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    const t = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.children.length <= 3 && /fail|error|wrong|не удалось|fehl/i.test(e.innerText || '') && (e.innerText || '').length < 120).map(e => e.innerText.trim()));
    t.forEach(x => seen.add(x));
    await page.waitForTimeout(200);
  }
  const after = await h.state(page);
  return {L0: [L0.currentLocale, L0.userLocale], clickAt, toastTexts: [...seen].slice(0, 6), after: [after.currentLocale, after.userLocale, after.topbar], combo: await combo().innerText(), loc: loc.location};
});
