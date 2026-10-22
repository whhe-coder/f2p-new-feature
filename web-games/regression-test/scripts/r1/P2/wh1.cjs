const {run, BASE, settle} = require(__dirname + '/../lib.cjs');
run(async (page) => {
  let detail = null;
  page.on('response', async r => {
    if (/\/api\/project\/detail\/\d+/.test(r.url())) {
      try { const j = await r.json(); detail = j; } catch (e) { detail = {err: String(e)}; }
    }
  });
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded'});
  await settle(page, {stableMs: 4000});
  await page.waitForFunction(() => /Webhook server|Enable webhooks|Secret key/i.test(document.body.innerText), null, {timeout: 60000}).catch(() => {}); await page.waitForTimeout(3000);
  const flat = {};
  const walk = (o, p) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k); else flat[p] = o; };
  walk(detail, '');
  const pick = {};
  for (const [k, v] of Object.entries(flat)) if (/ipn|webhook|hook/i.test(k)) pick[k] = typeof v === 'string' ? v.slice(0, 30) : v;
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[role=tab], a[href*="/edit/webhooks/"]')].map(e => e.textContent.trim().slice(0, 30)));
  const text = await page.evaluate(() => document.body.innerText.match(/Enable webhooks|Disable webhooks|Webhooks are (on|off)[^\n]*/gi));
  return {url: page.url(), topKeys: detail && Object.keys(detail).slice(0, 60), pick, tabs, text};
});
