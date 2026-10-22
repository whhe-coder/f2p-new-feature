const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const res = {};
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'gamesPortal'});
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.getByRole('button', {name: 'Configure', exact: true}).waitFor({timeout: 60000});
    await page.waitForTimeout(2000);
    res.links = await page.evaluate(() => [...document.querySelectorAll('a[href*="/projects/"]')].map(a => ({t: a.textContent.trim().slice(0, 25), h: a.getAttribute('href').replace(/^.*\/account/, ''), sec: (a.closest('[class*=group i], [class*=section i], li') || {}).className ? String(a.closest('[class*=group i], [class*=section i], li').className).slice(0, 40) : ''})).slice(0, 80));
    res.switcher = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => /Test Template/.test(b.textContent)).map(b => ({t: b.textContent.trim().slice(0, 40), cls: String(b.className).slice(0, 60), aria: b.getAttribute('aria-haspopup') || b.getAttribute('aria-expanded')})));
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  return res;
});
