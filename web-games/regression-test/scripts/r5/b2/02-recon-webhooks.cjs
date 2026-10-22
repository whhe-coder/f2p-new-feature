// Recon: what the project webhooks page renders for 317869 (text of the main area, class names with "webhook").
const {run, BASE} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForResponse(r => /store\/webhook\/settings/.test(r.url()), {timeout: 55000}).catch(() => {});
  await page.waitForTimeout(4000);
  return await page.evaluate(() => {
    const cls = [...new Set([...document.querySelectorAll('[class*="webhook" i]')].map(e => String(e.className).split(' ').find(c => /webhook/i.test(c))))].slice(0, 30);
    const main = document.querySelector(".edit-webhooks-v2__page");
    const ids = [...document.querySelectorAll('[data-id]')].map(e => e.getAttribute('data-id')).filter(x => /webhook|test|accordion/i.test(x)).slice(0, 20);
    return {path: location.pathname, cls, ids, main: main ? main.innerText.replace(/\n+/g, ' | ').slice(0, 900) : null};
  });
});
