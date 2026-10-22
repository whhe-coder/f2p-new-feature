const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.route(/\/credential/, r => r.abort('blockedbyclient'));
  await page.goto(`${BASE}/53105/profile`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="profile-settings"]', {timeout: 70000});
  await page.waitForTimeout(3000);
  return await page.evaluate(() => {
    const root = document.querySelector('[data-id="profile-settings"]');
    return {
      text: root.innerText.replace(/\n+/g, ' | ').slice(0, 900),
      selects: [...root.querySelectorAll('select, [role=combobox], [role=listbox], [aria-haspopup]')].map(e => ({tag: e.tagName, role: e.getAttribute('role'), txt: e.innerText.slice(0, 40), html: e.outerHTML.slice(0, 250)})),
      buttons: [...root.querySelectorAll('button')].map(b => ({t: b.innerText.slice(0, 30), dis: b.disabled}))
    };
  });
});
