const {run, BASE, HOST, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {findRemote} = require(__dirname + '/../P2/fib.cjs');
const short = u => { try { const x = new URL(u); return x.host.split('.')[0] + x.pathname.slice(0, 80); } catch { return 'bad'; } };
run(async (page, ctx) => {
  const t0 = Date.now(); const steps = []; const ev = [];
  const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', e => { if (e.type === 'Document' || /logout/.test(e.request.url)) ev.push({t: Date.now() - t0, doc: short(e.request.url), init: e.initiator && e.initiator.type, st: (e.initiator && e.initiator.stack && e.initiator.stack.callFrames || []).slice(0, 5).map(f => `${short(f.url)}:${f.functionName}:${f.lineNumber}`)}); });
  page.on('response', r => { if (r.status() === 401 || r.status() === 403) ev.push({t: Date.now() - t0, s: r.status(), u: short(r.url())}); });
  page.on('console', m => { if (m.type() === 'error' && ev.length < 80) ev.push({t: Date.now() - t0, ce: m.text().slice(0, 160).replace(/eyJ[\w.-]+/g, '<jwt>')}); });
  try {
  await page.goto(`${BASE}/53105/projects/317869/site-builder`, {waitUntil: 'domcontentloaded'});
  for (let i = 0; i < 100; i++) { await page.waitForTimeout(500); const r = await findRemote(page, 'site-builder'); if (r.hostText && r.hostText.length > 20) break; }
  await page.waitForTimeout(2000);
  steps.push({label: 'sb 317869', t: Date.now() - t0, r: await findRemote(page, 'site-builder', 'sb')});
  ev.push({t: Date.now() - t0, mark: 'nav->316818'});
  await clientNav(page, '/for/web-games/account/53105/projects/316818/site-builder');
  const poll = []; let last = '';
  for (let i = 0; i < 35; i++) { await page.waitForTimeout(400); const r = await findRemote(page, 'site-builder'); const s = JSON.stringify(r); if (s !== last) { poll.push({t: Date.now() - t0, ...r}); last = s; } }
  steps.push({label: 'sb 316818', poll});
  ev.push({t: Date.now() - t0, mark: 'nav->317869'});
  await clientNav(page, '/for/web-games/account/53105/projects/317869/site-builder');
  const poll2 = []; last = '';
  for (let i = 0; i < 25; i++) { await page.waitForTimeout(400); const r = await findRemote(page, 'site-builder').catch(e => ({err: String(e).slice(0, 60)})); const s = JSON.stringify(r) + page.url(); if (s !== last) { poll2.push({t: Date.now() - t0, url: page.url().slice(-40), ...r}); last = s; } }
  steps.push({label: 'back', poll2});
  } catch (e) { steps.push({err: String(e).slice(0, 150), url: page.url().slice(0, 60)}); }
  return {steps, ev};
});
