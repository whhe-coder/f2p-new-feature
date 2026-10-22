const {run, BASE, settle, readStore} = require(__dirname + '/../lib.cjs');
const {remotes} = require(__dirname + '/../P2/remotes.cjs');
run(async (page) => {
  await page.goto(`${BASE}/53105/projects/316933/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => /Webhook server|Enable webhooks|Disable webhooks/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {});
  await page.waitForTimeout(4000);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab], [role=tablist] *, a[href*="/edit/"], button')].map(e => ({tag: e.tagName, role: e.getAttribute('role'), text: (e.textContent || '').trim().slice(0, 40), href: e.getAttribute('href')})).filter(t => t.text && (t.role === 'tab' || t.href || /webhook|advanced|test|store|item|pay|subscr|disput/i.test(t.text))).slice(0, 60));
  return {url: page.url(), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id), tabs, r: await remotes(page)};
});
