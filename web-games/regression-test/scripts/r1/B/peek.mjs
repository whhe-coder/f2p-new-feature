const ws = new WebSocket('ws://127.0.0.1:9333/devtools/page/F7BA8FFFE8A2DF1F2F46C7839B61F4C8');
ws.onopen = () => { ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: 'JSON.stringify({href: location.href, ready: document.readyState, hist: history.length})', returnByValue: true}})); ws.send(JSON.stringify({id: 2, method: 'Page.getNavigationHistory'})); };
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) console.log(m.id, JSON.stringify(m.result || m.error).slice(0, 400)); };
ws.onerror = e => console.log('err', e.message);
setTimeout(() => { console.log('done'); process.exit(0); }, 10000);
