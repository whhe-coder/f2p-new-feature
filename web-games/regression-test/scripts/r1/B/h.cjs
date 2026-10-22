async function waitApp(page, sel = '[data-id=sidebar-dashboard]', timeout = 75000) {
  try { await page.waitForSelector(sel, {timeout}); }
  catch (e) { const d = await page.evaluate(() => ({u: location.pathname, txt: document.body.innerText.slice(0, 160)})).catch(() => ({})); throw new Error('waitApp fail ' + JSON.stringify(d)); }
}
module.exports = {waitApp};
