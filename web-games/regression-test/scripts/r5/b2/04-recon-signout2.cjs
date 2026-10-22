// Dry run 2: ancestor chain of the Sign out button and visible clickable topbar candidates. Does NOT click Sign out.
const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('.dashboard-balance__value, [data-id="dashboard-balance"]', {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(1500);
  return await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find(e => /^\s*Sign out\s*$/.test(e.textContent));
    const chain = [];
    for (let e = b; e && chain.length < 12; e = e.parentElement) chain.push({tag: e.tagName, cls: String(e.className).slice(0, 70), dataId: e.getAttribute('data-id'), vis: !!e.offsetParent, kids: e.children.length});
    const cands = [...document.querySelectorAll('button, [role=button], [aria-haspopup]')].filter(e => e.offsetParent && e.getBoundingClientRect().top < 70).map(e => ({tag: e.tagName, cls: String(e.className).slice(0, 60), dataId: e.getAttribute('data-id'), aria: e.getAttribute('aria-haspopup'), text: e.innerText.slice(0, 25), x: Math.round(e.getBoundingClientRect().left)}));
    return {chain, cands};
  });
});
