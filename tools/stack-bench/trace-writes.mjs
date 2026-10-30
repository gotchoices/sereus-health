// trace-writes.mjs <log> — per traced write (WRITE-START/END markers, DEBUG=optimystic:db-p2p:protocol-client):
// requests by protocol and peer, wall time, summed request time, and peak requests in flight.
import { readFileSync } from 'node:fs';
const lines = readFileSync(process.argv[2], 'utf8').split('\n');
const ts = (l) => { const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z)/.exec(l); return m ? Date.parse(m[1]) : null; };
const writes = [];
let cur = null;
for (const l of lines) {
  const t = ts(l); if (t == null) continue;
  let m;
  if ((m = / WRITE-START (\S+)/.exec(l))) { cur = { label: m[1], t0: t, reqs: [], fails: 0 }; continue; }
  if (/ WRITE-END /.test(l) && cur) { cur.t1 = t; writes.push(cur); cur = null; continue; }
  if (!cur) continue;
  if ((m = /protocol-client response peer=(\S+) protocol=(\S+) ms=(\d+)/.exec(l))) {
    const ms = Number(m[3]);
    cur.reqs.push({ peer: m[1].slice(-6), proto: m[2].replace(/^\/optimystic\/[^/]+\//, ''), start: t - ms, end: t });
  } else if (/protocol-client dial:(fail|timeout|aborted)/.test(l)) cur.fails++;
}
const byLabel = new Map();
for (const w of writes) { if (!byLabel.has(w.label)) byLabel.set(w.label, []); byLabel.get(w.label).push(w); }
for (const [label, ws] of byLabel) {
  console.log(`\n== ${label}: ${ws.length} traced writes`);
  for (const w of ws) {
    const wall = w.t1 - w.t0;
    const sum = w.reqs.reduce((s, r) => s + (r.end - r.start), 0);
    const ev = w.reqs.flatMap((r) => [[r.start, 1], [r.end, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let inflight = 0, peak = 0; for (const [, d] of ev) { inflight += d; peak = Math.max(peak, inflight); }
    const byProto = {}; for (const r of w.reqs) byProto[r.proto] = (byProto[r.proto] ?? 0) + 1;
    const peers = new Set(w.reqs.map((r) => r.peer)).size;
    console.log(`  wall ${String(wall).padStart(5)} ms  requests ${String(w.reqs.length).padStart(3)} to ${peers} peer(s)  sum ${String(sum).padStart(6)} ms  peak in flight ${peak}  failed dials ${w.fails}  ${JSON.stringify(byProto)}`);
  }
  // Timeline of the last write: which requests, in what order.
  const w = ws[ws.length - 1];
  console.log('  timeline of the last write (ms from start):');
  for (const r of [...w.reqs].sort((a, b) => a.start - b.start)) console.log(`    ${String(r.start - w.t0).padStart(5)} → ${String(r.end - w.t0).padStart(5)}  ${r.peer}  ${r.proto}`);
}
