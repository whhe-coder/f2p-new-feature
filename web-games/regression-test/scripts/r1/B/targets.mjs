const v = await (await fetch('http://127.0.0.1:9333/json/version')).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
ws.onopen = () => ws.send(JSON.stringify({id: 1, method: 'Target.getTargets'}));
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) { for (const t of m.result.targetInfos.filter(t => t.type === 'page')) console.log(JSON.stringify({id: t.targetId.slice(0, 8), url: t.url.slice(0, 80), title: t.title.slice(0, 40), attached: t.attached, openerId: t.openerId && t.openerId.slice(0, 8), canAccessOpener: t.canAccessOpener, browserContextId: t.browserContextId && t.browserContextId.slice(0, 8)})); process.exit(0); } };
setTimeout(() => { console.log('timeout'); process.exit(1); }, 15000);
