const {run, BASE, settle, track, pick, now, waitFor, clientNav, remotes, path, readStore} = require(__dirname + '/../A/h.cjs');
run(async (page) => {
  const tr = track(page);
  const out = {};
  out.t1 = now();
  await page.goto(`${BASE}/53105/projects/317869/storefront`, {waitUntil: 'domcontentloaded'});
  // sample mount timeline: when RemoteModule fiber first appears vs user/merchant requests
  const samples = [];
  const t0 = Date.now();
  for (let i = 0; i < 40; i++) {
    const r = await remotes(page).catch(() => []);
    const sf = Array.isArray(r) ? r.find(x => x.name === 'storefront') : null;
    samples.push(sf ? `${Date.now() - t0}ms:rmc${sf.childMounted ? '+child' : ''}` : `${Date.now() - t0}ms:none`);
    if (sf && sf.childMounted) break;
    await page.waitForTimeout(500);
  }
  out.mountTimeline = samples.filter((s, i) => i === 0 || s.split(':')[1] !== samples[i - 1].split(':')[1]);
  out.u1 = path(await settle(page));
  await page.waitForTimeout(3000);
  out.sf = (await remotes(page)).filter(r => r.name === 'storefront');
  out.text1 = await page.evaluate(() => document.querySelector('main, #root')?.innerText.slice(0, 200).replace(/\n+/g, ' | '));
  out.req1 = pick(tr.gw, /gc-publisher|remote-entry|users\/init|get_init_info|organization\/53105\/detail/);
  // step 2: leave and return without reload
  out.t2 = now();
  const before = tr.gw.filter(x => /remote-entry-game-commerce/.test(x.u)).length;
  await clientNav(page, '/for/web-games/account/53105/projects/317869');
  await page.waitForTimeout(3000);
  await clientNav(page, '/for/web-games/account/53105/projects/317869/storefront');
  await page.waitForTimeout(5000);
  out.step2 = {remoteEntryBefore: before, after: tr.gw.filter(x => /remote-entry-game-commerce/.test(x.u)).length, mounted: (await remotes(page)).filter(r => r.name === 'storefront').map(r => r.childMounted)};
  // step 3: hard reload
  out.t3 = now();
  await page.reload({waitUntil: 'domcontentloaded'});
  await settle(page);
  await waitFor(page, () => !!window.gc_publisher_account, 40000);
  await page.waitForTimeout(2000);
  out.step3 = pick(tr.gw, /remote-entry-game-commerce/);
  out.perf = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => /remote-entry-game-commerce/.test(e.name)).map(e => ({v: (e.name.match(/v=([^&]+)/) || [])[1], transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, responseStatus: e.responseStatus})));
  out.store = await readStore(page, st => st.projects.currentProject?.id);
  out.errs = tr.errs.filter(e => !/BLOCKED_BY_CLIENT/.test(e)).slice(0, 8);
  return out;
});
