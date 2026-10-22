const {run, BASE, readStore, redact} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  const roleResp = [];
  page.on('response', async r => { if (r.request().resourceType() !== 'xhr' && r.request().resourceType() !== 'fetch') return; try { const t = await r.text(); if (/ROLE_ADMIN/.test(t)) roleResp.push({url: redact(r.url()), len: t.length, snippet: t.slice(0, 200)}); } catch (e) {} });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 70000}).catch(() => {});
  await page.waitForTimeout(1500);
  await page.click('.language-switcher__trigger');
  await page.waitForTimeout(800);
  const dd = await page.evaluate(() => {
    const root = document.querySelector('.language-switcher__trigger').closest('[class*="language-switcher"]').parentElement;
    const items = [...document.querySelectorAll('[class*="language-switcher"] li, [class*="language-switcher"] [role=option], [class*="language-switcher"] [role=menuitem], [class*="language-switcher__item"], [class*="language-switcher__option"]')];
    return {count: items.length, items: items.map(i => ({t: i.innerText, cls: String(i.className).slice(0, 80), tag: i.tagName})), html: root.outerHTML.slice(0, 1500)};
  });
  await page.keyboard.press('Escape');
  const proj = await readStore(page, s => ({items: s.projects.items?.length, total: s.projects.total, isComplete: s.projects.isComplete, preload: Array.isArray(s.projects.preload) ? s.projects.preload.length : typeof s.projects.preload, accounts: s.accounts.list?.length, sample: (s.projects.items || []).slice(0, 2).map(p => ({id: p.id, name: p.name, enabled: p.enabled}))}));
  return {roleResp, dd, proj};
});
