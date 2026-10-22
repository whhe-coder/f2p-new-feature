// Start a headed Chromium with a CDP port so later scripts can attach with connectOverCDP.
const {spawn} = require('child_process');
const {chromium} = require('/Users/wenhaohe/repo/web-games-account/e2e/node_modules/@playwright/test');
const exe = chromium.executablePath();
const child = spawn(exe, [
  '--remote-debugging-port=9333',
  '--user-data-dir=/tmp/r1-profile',
  '--ignore-certificate-errors',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,900',
  'https://accounts-sdk-skeleton.nl-k8s-stage.srv.local/for/web-games/account/login',
], {detached: true, stdio: 'ignore'});
child.unref();
console.log('pid', child.pid, exe);
