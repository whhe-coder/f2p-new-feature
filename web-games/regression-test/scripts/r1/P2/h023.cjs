const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore, hits} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const H = hits(page, t0); const res = {steps: []};
  const url = () => page.url().replace(/^.*\/account/, '');
  const cur = () => readStore(page, st => st.projects.currentProject && st.projects.currentProject.id);
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'gamesPortal'});
    await page.goto(`${BASE}/53105/projects/316818/edit`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => /Simon Testing MCP/.test(document.body.innerText) && /Get started/.test(document.body.innerText), null, {timeout: 60000});
    await page.waitForTimeout(2000);
    res.steps.push({label: 'project page', t: Date.now() - t0, url: url(), cur: await cur()});
    const link = page.locator('a').filter({hasText: /^Get started$/}).first();
    res.linkHref = await link.getAttribute('href');
    await link.click(); await page.getByRole('button', {name: 'Configure', exact: true}).waitFor({timeout: 30000}); await page.waitForTimeout(1000);
    res.steps.push({label: 'get-started via sidebar', url: url(), cur: await cur()});
    await page.getByRole('button', {name: 'Configure', exact: true}).click(); await page.waitForTimeout(1500);
    res.steps.push({label: 'payments CTA', url: url(), cur: await cur()});
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  res.hits = H.map(h => ({en: h.en, ev: h.ev, exv: h.exv}));
  return res;
});
