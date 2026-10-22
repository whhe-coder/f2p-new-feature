const {run, BASE} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore, hits} = require(__dirname + '/../P2/st.cjs');
const red = s => s.replace(/[\w.+-]+@[\w.-]+/g, '<email>').replace(/eyJ[\w.-]+/g, '<jwt>');
run(async (page) => {
  const t0 = Date.now(); const H = hits(page, t0); const res = {steps: []};
  const step = async (label, extra = {}) => res.steps.push({label, t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), sel: (await readKeys(page, [SEL]))[SEL], choose: await page.evaluate(() => /How will you launch this project\?/.test(document.body.innerText)), guide: await page.evaluate(() => (document.body.innerText.match(/Publish your game on Games Portal|Add Xsolla to your stack/g) || []).join('|')), hitsSoFar: H.length, ...extra});
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: null});
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => /How will you launch this project\?/.test(document.body.innerText), null, {timeout: 60000});
    await page.waitForTimeout(2000); await step('choose ui');
    await page.getByRole('button', {name: 'Choose'}).first().click(); await page.waitForTimeout(2500); await step('after choose GP');
    await page.getByRole('button', {name: 'Switch setup'}).click(); await page.waitForTimeout(2500); await step('after switch (GP)');
    await page.getByRole('button', {name: 'Choose'}).nth(1).click(); await page.waitForTimeout(2500); await step('after choose AS');
    await page.getByRole('button', {name: 'Switch setup'}).click(); await page.waitForTimeout(2500); await step('after switch (AS)');
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  res.allXmts = H.all;
  res.hits = H.map(h => ({t: h.t, en: h.en, ev: h.ev, et: h.et, c: h.counter, exv: h.exv}));
  return res;
});
