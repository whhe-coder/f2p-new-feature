const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('[data-id="ask-ai-banner"]', {timeout: 70000}).catch(() => {});
  await page.waitForTimeout(1500);
  await page.click('.language-switcher__trigger');
  await page.waitForTimeout(1000);
  const dd = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll('body *')].find(e => e.children.length === 0 && /^Deutsch$/.test(e.textContent.trim()));
    if (!leaf) return {none: true};
    let c = leaf; for (let i = 0; i < 4; i++) c = c.parentElement;
    return {leafTag: leaf.tagName, item: (leaf.closest('[role=menuitem],[role=option],li,button') || leaf).outerHTML.slice(0, 400), container: c.outerHTML.slice(0, 600), all: [...c.querySelectorAll('[role=menuitem],[role=option],li')].map(x => x.innerText)};
  });
  await page.keyboard.press('Escape');
  return {dd};
});
