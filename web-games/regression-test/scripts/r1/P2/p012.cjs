const {run, BASE, readStore} = require(__dirname + '/../lib.cjs');
const {SEL, blank, readKeys, setKeys, restore} = require(__dirname + '/../P2/st.cjs');
run(async (page) => {
  const t0 = Date.now(); const res = {steps: []}; const reqs = [];
  page.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && !/xmts|consent-api|chat\./.test(r.url())) reqs.push({t: Date.now() - t0, m: r.method(), u: r.url().replace(/\?.*/, '').slice(0, 90)}); });
  const state = async label => {
    const s = await page.evaluate(() => {
      const ids = {};
      for (const a of document.querySelectorAll('a[href*="/projects/"]')) { const m = a.getAttribute('href').match(/\/projects\/(\d+)\//); if (m) ids[m[1]] = (ids[m[1]] || 0) + 1; }
      const pick = t => { const a = [...document.querySelectorAll('a')].find(x => x.textContent.trim() === t); return a ? a.getAttribute('href').replace(/^.*\/account/, '') : null; };
      return {ids, toolsGPP: pick('Game Player Platform'), toolsIntegrations: pick('Integrations'), settingsProject: pick('Project'), settingsWebhooks: pick('Webhooks'), switcher: (document.querySelector('button.project-select') || {}).textContent};
    });
    res.steps.push({label, t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id), ...s});
  };
  const pickProject = async name => {
    await page.locator('button.project-select').click(); await page.waitForTimeout(1500);
    const opts = await page.evaluate(() => [...document.querySelectorAll('[role=option], [role=listbox] li, [role=menuitem]')].map(e => e.textContent.trim().slice(0, 30)).slice(0, 12));
    res.steps.push({opts});
    let target = page.locator('[role=option], [role=listbox] li, [role=menuitem]').filter({hasText: name}).first();
    if (!(await target.count())) { res.steps.push({notListed: name}); return false; }
    await target.click(); await page.waitForTimeout(2500); return true;
  };
  await blank(page);
  const snap = await readKeys(page, [SEL]); res.before = snap;
  try {
    await setKeys(page, {[SEL]: 'gamesPortal'});
    await page.goto(`${BASE}/53105/get-started`, {waitUntil: 'domcontentloaded'});
    await page.getByRole('button', {name: 'Configure', exact: true}).waitFor({timeout: 60000});
    await page.waitForTimeout(2000);
    await state('before');
    await pickProject('jtest1');
    await state('after switch');
    await pickProject('Test Template');
    await state('after switch back');
  } catch (e) { res.err = String(e).slice(0, 200); }
  finally { res.restore = await restore(page, snap); }
  res.writes = reqs;
  return res;
});
