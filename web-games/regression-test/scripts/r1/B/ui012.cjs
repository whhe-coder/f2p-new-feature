const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
const {waitApp} = require(__dirname + '/../B/h.cjs');
const K = () => ({p: location.pathname.replace('/for/web-games/account', '').slice(0, 30), script: document.querySelectorAll('script[data-id="xsolla-chat-script"]').length, livechat: document.querySelectorAll('#livechat').length, bapSlots: [...document.querySelectorAll('[id^=livechat-bap]')].map(e => e.id), chatBtnsVisible: [...document.querySelectorAll('.app-root__sidebar-fixed button, .app-root__sidebar-fixed [role=button]')].filter(b => (/^Chat$/.test(b.textContent.trim()) || /chat/i.test(b.getAttribute('aria-label') || '')) && b.getBoundingClientRect().width > 0).length, sidebar: !!document.querySelector('.app-root__sidebar-fixed')});
run(async (page) => {
  const out = {seq: []};
  await page.goto(`${BASE}/53105/dashboard`, {waitUntil: 'domcontentloaded'});
  await waitApp(page);
  await page.waitForFunction(() => document.querySelector('#livechat'), null, {timeout: 40000}).catch(() => {});
  await page.waitForTimeout(2000);
  out.seq.push(await page.evaluate(K));
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', {name: 'Communication Hub'}).first().click();
    await page.waitForTimeout(2500);
    out.seq.push(await page.evaluate(K));
    await page.goBack(); await page.waitForTimeout(2500);
    out.seq.push(await page.evaluate(K));
  }
  await page.getByLabel('Collapse sidebar').click(); await page.waitForTimeout(1500);
  out.collapsed = await page.evaluate(K);
  const exp = page.getByLabel(/Expand sidebar/i);
  if (await exp.count()) { await exp.first().click(); await page.waitForTimeout(1500); out.expanded = await page.evaluate(K); } else out.expanded = 'no expand button found';
  out.t = new Date().toISOString();
  return out;
});
