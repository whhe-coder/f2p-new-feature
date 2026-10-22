const {run, BASE} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore, hits} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const H = hits(page, t0); const res = {steps: []};
  const url = () => page.url().replace(/^.*\/account/, '');
  const ui = () => page.evaluate(() => {
    const t = document.body.innerText;
    const btns = [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(x => /^(Set up|Configure|Switch setup)$/.test(x));
    const cards = [...document.querySelectorAll('[class*=setup-next-card]')].filter(e => /^(ARTICLE|BUTTON)$/.test(e.tagName)).map(e => ({tag: e.tagName, dis: /--disabled/.test(e.className), title: e.innerText.split('\n')[0]}));
    return {guide: /Current setup/.test(t), btns, cards, lock: /Requires a live game/.test(t)};
  });
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'gamesPortal'});
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.getByRole('button', {name: 'Set up', exact: true}).waitFor({timeout: 60000}).catch(() => {});
    await page.waitForTimeout(1500);
    res.steps.push({label: 'guide', t: Date.now() - t0, url: url(), ui: await ui()});
    let n = H.length;
    await page.getByRole('button', {name: 'Set up', exact: true}).click(); await page.waitForTimeout(1500);
    res.steps.push({label: 'step1', url: url(), newHits: H.length - n}); n = H.length;
    await page.goBack(); await page.getByRole('button', {name: 'Configure', exact: true}).waitFor({timeout: 30000}); await page.waitForTimeout(800);
    res.steps.push({label: 'back', url: url()});
    await page.getByRole('button', {name: 'Configure', exact: true}).click(); await page.waitForTimeout(1500);
    res.steps.push({label: 'step2', url: url(), newHits: H.length - n}); n = H.length;
    await page.goBack(); await page.getByRole('button', {name: 'Switch setup'}).waitFor({timeout: 30000}); await page.waitForTimeout(800);
    for (const title of ['Web Shop', 'Offerwall', 'Backpack']) {
      const card = page.locator('[class*=setup-next-card]').filter({hasText: title}).first();
      await card.click({force: true, timeout: 5000}).catch(e => res.steps.push({clickErr: String(e).slice(0, 80)}));
      await page.waitForTimeout(1200);
      res.steps.push({label: `card ${title}`, url: url(), newHits: H.length - n, cursor: await card.evaluate(e => getComputedStyle(e).cursor)}); n = H.length;
    }
    res.selDuring = (await readKeys(page, [SEL]))[SEL];
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  res.hits = H.map(h => ({t: h.t, en: h.en, ev: h.ev, exv: h.exv}));
  return res;
});
