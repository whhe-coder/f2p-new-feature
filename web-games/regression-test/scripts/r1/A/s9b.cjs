const {run, BASE, settle, now, waitFor, path} = require(__dirname + '/../A/h.cjs');
run(async (page) => {
  const out = {t0: now()};
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks/store`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await waitFor(page, () => /Webhook/i.test(document.body.innerText), 40000);
  await page.waitForTimeout(8000);
  out.u = path(page.url());
  out.text = await page.evaluate(() => { const m = document.querySelector('main') || document.body; const t = m.innerText; const i = t.search(/Webhook/i); const j = t.search(/General settings/); return t.slice(j, j + 1500).replace(/\n+/g, ' | '); });
  out.dataIds = await page.evaluate(() => [...document.querySelectorAll('[data-id], [data-testid]')].map(e => e.getAttribute('data-id') || e.getAttribute('data-testid')).filter(x => /hook|tab|toggle|switch|secret/i.test(x)).slice(0, 30));
  out.switches = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox], [role=switch]')].map(e => `${e.getAttribute('name') || e.getAttribute('aria-label') || e.id}:${e.checked ?? e.getAttribute('aria-checked')}`).slice(0, 10));
  return out;
});
