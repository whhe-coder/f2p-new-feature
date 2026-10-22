const {run, BASE, readStore, clientNav} = require(__dirname + '/../lib.cjs');
const {findRemote} = require(__dirname + '/../P2/fib.cjs');
const P = '/for/web-games/account/53105/projects/317869';
const main = async (page, first, then) => {
  const t0 = Date.now(); const ev = []; const steps = [];
  page.on('response', async r => {
    const u = r.url();
    if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) ev.push({t: Date.now() - t0, doc: r.status(), ct: (r.headers()['content-type'] || '').slice(0, 25), u: u.replace(/^.*\/account/, '')});
    else if (/api\/v1\/modules|remoteEntry|remote-entry/i.test(u)) ev.push({t: Date.now() - t0, s: r.status(), u: u.replace(/^https:\/\/([^.]+)[^/]*/, '$1').replace(/(v=[0-9a-f]{8})[^&]*/, '$1').slice(0, 90)});
  });
  try {
    await page.goto(`https://accounts-sdk-skeleton.nl-k8s-stage.srv.local${P}/${first.path}`, {waitUntil: 'domcontentloaded'});
    for (let i = 0; i < 90; i++) { await page.waitForTimeout(500); const r = await findRemote(page, first.name); if (r.count > 0 && r.hostText && r.hostText.length > 5) break; }
    await page.waitForTimeout(3000);
    steps.push({label: `full ${first.path}`, t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await findRemote(page, first.name, 'x'), nf: /not-found/.test(page.url())});
    await clientNav(page, `${P}/${then.path}`);
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(500); const r = await findRemote(page, then.name); if (r.count > 0 && r.hostText && r.hostText.length > 5) break; }
    await page.waitForTimeout(3000);
    steps.push({label: `client ${then.path}`, t: Date.now() - t0, url: page.url().replace(/^.*\/account/, ''), r: await findRemote(page, then.name), nf: /not-found/.test(page.url()), cur: await readStore(page, st => st.projects.currentProject && st.projects.currentProject.id)});
  } catch (e) { steps.push({err: String(e).slice(0, 150), url: page.url().slice(0, 60)}); }
  return {steps, ev};
};
module.exports = {main};
if (require.main === module) {
  const [a, b] = process.argv.slice(2);
  const name = p => p.startsWith('site-builder') ? 'site-builder' : 'network';
  run(page => main(page, {path: a, name: name(a)}, {path: b, name: name(b)}));
}
