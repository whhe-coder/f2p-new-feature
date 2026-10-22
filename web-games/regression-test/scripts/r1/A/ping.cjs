const id = process.argv[2];
const ws = new WebSocket(`ws://127.0.0.1:9333/devtools/page/${id}`);
const t0 = Date.now();
const timer = setTimeout(() => { console.log(JSON.stringify({id: id.slice(0, 8), responsive: false, waitedMs: Date.now() - t0})); process.exit(0); }, 8000);
ws.onopen = () => ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: 'location.pathname + "|" + document.querySelectorAll("[role=tab]").length', returnByValue: true}}));
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) { clearTimeout(timer); console.log(JSON.stringify({id: id.slice(0, 8), responsive: true, ms: Date.now() - t0, v: d.result && d.result.result && d.result.result.value})); process.exit(0); } };
ws.onerror = e => { console.log('ws error'); process.exit(0); };
