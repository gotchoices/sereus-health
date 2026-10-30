// trace-queries.mjs <log> — per traced query run (QUERY-START/END markers): wall ms, network
// requests by protocol, transactor gets, and read-repair consults, from DEBUG output.
import { readFileSync } from 'node:fs';
const lines = readFileSync(process.argv[2], 'utf8').split('\n');
const ts = (l) => { const m = /^(\d{4}-\d\d-\d\dT[\d:.]+Z)/.exec(l); return m ? Date.parse(m[1]) : null; };
const runs = []; let cur = null;
for (const l of lines) {
  const t = ts(l); if (t == null) continue;
  let m;
  if ((m = / QUERY-START (\S.*)$/.exec(l))) { cur = { key: m[1], t0: t, reqs: {}, gets: 0, other: {} }; continue; }
  if (/ QUERY-END /.test(l) && cur) { cur.t1 = t; runs.push(cur); cur = null; continue; }
  if (!cur) continue;
  if ((m = /protocol-client response peer=\S+ protocol=(\S+) ms=/.exec(l))) { const p = m[1].replace(/^\/optimystic\/[^/]+\//, '').replace(/^\/[^/]+\//, ''); cur.reqs[p] = (cur.reqs[p] ?? 0) + 1; }
  else if (/network-transactor get blockIds=/.test(l)) cur.gets++;
  else if ((m = /optimystic:(\S+?) (\S+?)[ :]/.exec(l)) && /read-repair|consult|lineage|cohort/.test(l)) { const k = `${m[1]} ${m[2]}`; cur.other[k] = (cur.other[k] ?? 0) + 1; }
}
for (const r of runs) {
  const [label, name, i] = r.key.split('|');
  if (process.argv[3] && !name.includes(process.argv[3])) continue;
  console.log(`${label.padEnd(18)} ${name.padEnd(32)} #${i} ${String(r.t1 - r.t0).padStart(5)} ms  gets=${r.gets}  reqs=${JSON.stringify(r.reqs)}  ${JSON.stringify(r.other)}`);
}
