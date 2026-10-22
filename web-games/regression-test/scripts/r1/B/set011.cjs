const {run, BASE} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const C = () => ({p: location.pathname.replace('/for/web-games/account', ''), shellSidebar: !!document.querySelector('.app-root__sidebar-fixed'), backBtn: [...document.querySelectorAll('button,a')].some(e => /Back to account/i.test(e.textContent)), settingsNav: [...document.querySelectorAll('a,button')].filter(e => /^(Company settings|API keys|Administration)$/.test(e.textContent.trim()) && e.getBoundingClientRect().width > 0 && !e.closest('[role=menu]')).map(e => e.textContent.trim()), banner: /Can't find something in Business Accounts\?/.test(document.body.innerText), rootCls: document.getElementById('app-root')?.className, contentCls: document.getElementById('app-root__content')?.className});
run(async (page) => {
  const out = {}; const urls = [];
  await page.exposeFunction('__rec', u => urls.push(u.replace('/for/web-games/account', '')));
  await page.addInitScript(() => { for (const k of ['pushState', 'replaceState']) { const o = history[k]; history[k] = function (...a) { const r = o.apply(this, a); try { window.__rec(k[0] + ':' + location.pathname); } catch (e) {} return r; }; } });
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page); await page.waitForTimeout(1500);
  await page.getByRole('button', {name: 'User', exact: true}).click();
  await page.waitForTimeout(800);
  urls.length = 0;
  await page.getByRole('button', {name: 'Change profile'}).click();
  await page.waitForTimeout(4000);
  out.profile = {t: new Date().toISOString(), pushes: urls.slice(), ...(await page.evaluate(C)), visibleText: await page.evaluate(() => document.getElementById('app-root__content')?.innerText.slice(0, 120))};
  return out;
});
