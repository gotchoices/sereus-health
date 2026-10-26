// module-callers.mjs <profile> <module-substring>... — for busy self time inside a module, show the
// chain of CALLING modules (deduplicated, 7 deep), aggregated.
import { readFileSync } from 'node:fs';
const [file, ...needles] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const url = p.nodes.map((n) => n.callFrame.url).find((u) => u && u.includes('index.bundle'));
const bundle = await (await fetch(`http://localhost:8082/index.bundle?${url.slice(url.indexOf('&') + 1)}`)).text();
const lines = bundle.split('\n'); const ends = []; const re = /^\},\s*\d+,\s*\[[^\]]*\],\s*"([^"]+)"\);?\s*$/;
for (let i = 0; i < lines.length; i++) { const m = re.exec(lines[i]); if (m) ends.push([i, m[1]]); }
const moduleAt = (line) => { let lo = 0, hi = ends.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (ends[mid][0] >= line) { ans = ends[mid][1]; hi = mid - 1; } else lo = mid + 1; } return ans; };
const byId = new Map(p.nodes.map((n) => [n.id, n])); const parent = new Map(); for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map(); p.samples.forEach((s, i) => self.set(s, (self.get(s) ?? 0) + (p.timeDeltas[i] ?? 0)));
const short = (m) => (m ?? '?').replace(/^.*node_modules\//, '').replace(/\/dist\/src\//, '/').replace(/\.(js|ts)$/, '');
const fileOf = (id) => { const cf = byId.get(id).callFrame; return cf.url && cf.lineNumber >= 0 ? moduleAt(cf.lineNumber) : null; };
for (const needle of needles) {
  const agg = new Map(); let total = 0;
  for (const [nid, us] of self) {
    // the nearest JS frame at or above the sample must be in the needle module
    let id = nid; let f = null; while (id && !(f = fileOf(id))) id = parent.get(id);
    if (!f || !f.includes(needle)) continue;
    const chain = []; let cur = parent.get(id);
    while (cur && chain.length < 7) { const m = fileOf(cur); if (m && !m.includes('@babel/runtime') && short(m) !== chain[chain.length - 1] && !m.includes(needle)) chain.push(short(m)); cur = parent.get(cur); }
    const key = chain.join(' < ');
    agg.set(key, (agg.get(key) ?? 0) + us); total += us;
  }
  console.log(`\n== ${needle}: ${(total / 1000).toFixed(0)} ms`);
  for (const [k, v] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(`  ${(v / 1000).toFixed(0).padStart(5)} ms  ${k.slice(0, 330)}`);
}
