const {run, BASE} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore, hits} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const H = hits(page, t0); const res = {steps: []};
  const url = () => page.url().replace(/^.*\/account/, '');
  const ui = () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(x => /^(Set up|Configure|Switch setup)$/.test(x));
    const cards = [...document.querySelectorAll('[class*=setup-next-card]')].filter(e => /^(ARTICLE|BUTTON)$/.test(e.tagName)).map(e => ({tag: e.tagName, dis: /--disabled/.test(e.className) || e.disabled, title: e.innerText.split('\n')[0]}));
    return {btns, cards, title: /Add Xsolla to your stack/.test(document.body.innerText)};
  });
  const back = async () => { await page.goBack(); await page.getByRole('button', {name: 'Switch setup'}).waitFor({timeout: 30000}); await page.waitForTimeout(800); };
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'additionalServices'});
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.getByRole('button', {name: 'Configure', exact: true}).first().waitFor({timeout: 60000}).catch(() => {});
    await page.waitForTimeout(2000);
    res.steps.push({label: 'guide', t: Date.now() - t0, url: url(), ui: await ui()});
    let n = H.length;
    const clicks = [
      ['step1', () => page.getByRole('button', {name: 'Configure', exact: true}).nth(0)],
      ['login', () => page.getByRole('button', {name: 'Configure', exact: true}).nth(1)],
      ['Web Shop', () => page.locator('button[class*=setup-next-card]').filter({hasText: 'Web Shop'})],
      ['Offerwall', () => page.locator('button[class*=setup-next-card]').filter({hasText: 'Offerwall'})],
      ['Backpack', () => page.locator('button[class*=setup-next-card]').filter({hasText: 'Backpack'})],
    ];
    for (const [label, loc] of clicks) {
      const l = loc();
      if (!(await l.count())) { res.steps.push({label, missing: true}); continue; }
      await l.click({timeout: 5000}); await page.waitForTimeout(1500);
      res.steps.push({label, url: url(), newHits: H.length - n}); n = H.length;
      await back();
    }
    res.selDuring = (await readKeys(page, [SEL]))[SEL];
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  res.hits = H.map(h => ({t: h.t, en: h.en, ev: h.ev, exv: h.exv}));
  return res;
});
