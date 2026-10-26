// cdp-profile.mjs <seconds> <out.cpuprofile> [metro port] — CPU-profile the app's JS (Hermes)
// through Metro's inspector proxy (Chrome DevTools Protocol), then print the top self time with a
// short caller chain. Needs a debug build connected to Metro. Profiler only: nothing is paused.
import { writeFileSync } from 'node:fs';
const [secs = '30', out = 'app.cpuprofile', port = process.env.METRO_PORT ?? '8082'] = process.argv.slice(2);
const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
const target = targets.find((t) => /org\.sereus\.health/.test(t.title)) ?? targets[0];
if (!target) { console.error('no inspector target'); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id; pending.set(msgId, { resolve, reject }); ws.send(JSON.stringify({ id: msgId, method, params }));
});
const traceEvents = [];
let traceDone;
const traceComplete = new Promise((r) => { traceDone = r; });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Tracing.dataCollected') traceEvents.push(...(m.params?.value ?? []));
  if (m.method === 'Tracing.tracingComplete') traceDone();
};
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
console.log(`profiling ${target.title} for ${secs} s`);
// React Native's DevTools backend records CPU samples through the Tracing domain (what the
// Performance panel uses) and streams them as Profile / ProfileChunk trace events.
await send('Tracing.start', { categories: 'disabled-by-default-v8.cpu_profiler,v8.execute,devtools.timeline', transferMode: 'ReportEvents' });
await new Promise((r) => setTimeout(r, Number(secs) * 1000));
await send('Tracing.end');
await Promise.race([traceComplete, new Promise((r) => setTimeout(r, 60000))]);
ws.close();
// Assemble the chunks into one .cpuprofile.
const nodes = new Map(); const samples = []; const timeDeltas = [];
let startTime = Infinity;
for (const ev of traceEvents) {
  if (ev.name === 'Profile' && ev.args?.data?.startTime != null) startTime = Math.min(startTime, ev.args.data.startTime);
  if (ev.name !== 'ProfileChunk') continue;
  const d = ev.args?.data ?? {};
  for (const n of d.cpuProfile?.nodes ?? []) nodes.set(n.id, { id: n.id, callFrame: n.callFrame, parent: n.parent, children: [] });
  samples.push(...(d.cpuProfile?.samples ?? []));
  timeDeltas.push(...(d.timeDeltas ?? []));
}
for (const n of nodes.values()) if (n.parent != null && nodes.has(n.parent)) nodes.get(n.parent).children.push(n.id);
const profile = { nodes: [...nodes.values()], startTime: startTime === Infinity ? 0 : startTime, endTime: 0, samples, timeDeltas };
console.log(`trace events: ${traceEvents.length}; profile nodes: ${profile.nodes.length}; samples: ${samples.length}`);
writeFileSync(out, JSON.stringify(profile));
// Summary: self time per function, with 4 callers.
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map(); profile.samples.forEach((sid, i) => self.set(sid, (self.get(sid) ?? 0) + (profile.timeDeltas[i] ?? 0)));
const name = (cf) => `${cf.functionName || '(anon)'}@${(cf.url || '').replace(/^.*node_modules\//, '').replace(/\?.*$/, '').replace(/^.*\//, '')}:${cf.lineNumber + 1}`;
const agg = new Map(); let total = 0;
for (const [nid, us] of self) {
  const n = byId.get(nid); const chain = [name(n.callFrame)];
  let p = parent.get(nid); while (p && chain.length < 5) { const cf = byId.get(p).callFrame; if (cf.functionName !== '(root)') chain.push(name(cf)); p = parent.get(p); }
  const key = chain.join(' < '); agg.set(key, (agg.get(key) ?? 0) + us); total += us;
}
const idle = [...agg].filter(([k]) => /^\((idle|program|garbage collector)\)/.test(k)).reduce((s, [, v]) => s + v, 0);
console.log(`total ${(total / 1000).toFixed(0)} ms sampled; idle/program/gc ${(idle / 1000).toFixed(0)} ms; busy ${((total - idle) / 1000).toFixed(0)} ms`);
for (const [k, us] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${(us / 1000).toFixed(0).padStart(7)} ms  ${k.slice(0, 230)}`);
