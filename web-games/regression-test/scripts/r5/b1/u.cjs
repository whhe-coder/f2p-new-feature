// Upsell mocks. All of these are fulfilled in the browser: the requests do not reach the backend.
const {redact} = require(__dirname + '/../lib.cjs');
const iso = () => new Date().toISOString();
const IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#7a5"/></svg>');

// cfg is mutable: change cfg.info / cfg.assign / cfg.detail between steps.
async function mockUpsell(page, cfg) {
  const log = [];
  cfg.log = log;
  await page.route(/\/salescards\/info/, r => {
    const c = cfg.info;
    log.push({at: iso(), mock: 'info', method: r.request().method(), url: redact(r.request().url()), status: c.status || 200});
    if (c.abort) return r.abort('failed');
    return r.fulfill({status: c.status || 200, contentType: 'application/json', body: JSON.stringify(c.body === undefined ? [] : c.body)});
  });
  await page.route(/\/handle_all_utms/, r => {
    log.push({at: iso(), mock: 'handle_all_utms', method: r.request().method(), url: redact(r.request().url()), body: r.request().postData(), status: 200});
    return r.fulfill({status: 200, contentType: 'application/json', body: ''});
  });
  await page.route(/\/salescards\/assign_to_user/, r => {
    const c = cfg.assign || {status: 200, body: []};
    log.push({at: iso(), mock: 'assign_to_user', method: r.request().method(), url: redact(r.request().url()), body: r.request().postData(), status: c.status});
    return r.fulfill({status: c.status, contentType: 'application/json', body: JSON.stringify(c.body === undefined ? {} : c.body)});
  });
  await page.route(/\/merchants\/\d+\/salescards\/\d+(\?|$)/, r => {
    const c = cfg.detail || {status: 404, body: {}};
    log.push({at: iso(), mock: 'salescards/{id}', method: r.request().method(), url: redact(r.request().url()), status: c.status || 200});
    return r.fulfill({status: c.status || 200, contentType: 'application/json', body: JSON.stringify(c.body)});
  });
  if (cfg.role) {
    await page.route(/\/api\/organization\/\d+\/detail/, async r => {
      const resp = await r.fetch();
      const j = await resp.json();
      const real = j.result && j.result.role;
      if (j.result) j.result.role = cfg.role;
      log.push({at: iso(), mock: 'organization/detail role', from: real, to: cfg.role});
      return r.fulfill({response: resp, contentType: 'application/json', body: JSON.stringify(j)});
    });
  }
  // Main-frame navigations (location.replace etc.).
  const navs = [];
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navs.push({at: iso(), url: redact(r.url())}); });
  page.on('response', r => { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) navs.push({at: iso(), status: r.status(), url: redact(r.url())}); });
  cfg.navs = navs;
  return cfg;
}

async function modalInfo(page) {
  return page.evaluate(() => {
    const m = document.querySelector('[data-id="upsell-modal"]');
    if (!m) return null;
    const img = m.querySelector('img');
    const h4 = m.querySelector('h4');
    const projects = [...m.querySelectorAll('[data-id^="upsell-project-"]')];
    const input = m.querySelector('input');
    return {
      title: h4 && h4.innerText, image: !!img, imageSrcIsData: img ? img.src.startsWith('data:') : null,
      text: m.innerText.replace(/\n+/g, ' | ').slice(0, 300),
      projectCount: projects.length, firstProjects: projects.slice(0, 5).map(p => p.innerText),
      hasSearch: !!input, buttons: [...m.querySelectorAll('button')].map(b => b.innerText || b.getAttribute('aria-label')).slice(0, 6)
    };
  });
}

async function waitModal(page, timeout = 15000) {
  return page.waitForSelector('[data-id="upsell-modal"]', {timeout}).then(() => true).catch(() => false);
}

module.exports = {mockUpsell, modalInfo, waitModal, IMG, iso};
