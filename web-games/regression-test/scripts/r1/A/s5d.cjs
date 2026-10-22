const {run, BASE, settle, track, pick, now, waitFor, path} = require(__dirname + '/../A/h.cjs');
const target = process.argv[2];
run(async (page) => {
  const tr = track(page);
  const pe = []; page.on('pageerror', e => pe.push(e.message.slice(0, 150)));
  const out = {t1: now(), target};
  await page.goto(`${BASE}${target}`, {waitUntil: 'commit', timeout: 60000});
  await waitFor(page, () => document.body && document.body.innerText.length > 60, 50000);
  out.u1 = path(await settle(page, {stableMs: 3000}));
  await page.waitForTimeout(10000);
  out.txt = await page.evaluate(() => document.body.innerText.slice(0, 260).replace(/\n+/g, ' | '));
  out.sww = await page.evaluate(() => /Something went wrong/.test(document.body.innerText));
  out.pe = pe.slice(0, 3);
  out.reqs = pick(tr.gw, /remoteEntry|metaframe|\.js\?v=/);
  out.rmc = await require(__dirname + '/../A/h.cjs').remotes(page);
  return out;
});
