// callers.mjs <profile> <fnName>... — aggregate self time of fnName by its caller chain (6 frames).
import { readFileSync } from 'node:fs';
const [file, ...names] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map();
p.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (p.timeDeltas[i] ?? 0)));
const short = (cf) => `${cf.functionName || '(anon)'}@${(cf.url || '').replace(/^.*node_modules\//, '').replace(/^.*\//, '').replace(/\.js$/, '')}:${cf.lineNumber + 1}`;
for (const name of names) {
  const agg = new Map();
  for (const [id, us] of self) {
    if (byId.get(id).callFrame.functionName !== name) continue;
    const chain = [];
    let cur = parent.get(id);
    while (cur && chain.length < 7) { const cf = byId.get(cur).callFrame; if (cf.functionName !== '(root)') chain.push(short(cf)); cur = parent.get(cur); }
    const key = chain.join(' < ');
    agg.set(key, (agg.get(key) ?? 0) + us);
  }
  console.log(`\n== ${name}`);
  for (const [k, us] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 4)) console.log(`  ${(us / 1000).toFixed(1).padStart(6)} ms  ${k}`);
}
