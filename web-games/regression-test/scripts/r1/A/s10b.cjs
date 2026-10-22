const {run, BASE, settle, now, waitFor, clientNav, path, rurl} = require(__dirname + '/../A/h.cjs');
const DEAD = /marketing-balance|payment_provider\/profile|analytics\/metrics\?|gross_revenue|togglers|project-analytic/;
setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(0); }, 150000);
run(async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const hits = []; let stage = 'dashboard';
  cdp.on('Network.requestWillBeSent', e => {
    if (!DEAD.test(e.request.url)) return;
    const frames = [];
    let st = e.initiator && e.initiator.stack;
    while (st && frames.length < 6) { for (const f of st.callFrames) { if (frames.length < 6) frames.push((f.url.split('/').pop() || '').split('?')[0] + ':' + f.functionName); } st = st.parent; }
    hits.push({stage, at: now(), url: rurl(e.request.url).slice(0, 150), initiator: e.initiator.type, frames: [...new Set(frames)].slice(0, 6)});
  });
  const out = {t0: now()};
  const st = {}; cdp.on('Network.responseReceived', e => { if (DEAD.test(e.response.url)) st[rurl(e.response.url).slice(0, 150)] = e.response.status + ' ' + e.response.mimeType; });
  stage = 'webhooks-full';
  await page.goto(`${BASE}/53105/projects/317869/edit/webhooks`, {waitUntil: 'domcontentloaded', timeout: 60000});
  await waitFor(page, () => /General settings/.test(document.body.innerText), 40000);
  await page.waitForTimeout(5000);
  out.st = st;
  for (const [s, p] of [['integrations', '/53105/projects/317869/integrations']]) {
    stage = s;
    await clientNav(page, '/for/web-games/account' + p);
    await page.waitForTimeout(8000);
    out['u_' + s] = path(page.url());
  }
  out.hits = hits; out.st = st;
  out.t1 = now();
  return out;
});
