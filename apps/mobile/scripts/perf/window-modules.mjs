// window-modules.mjs <profile.cpuprofile> <anchorFn> <windowMs> [metro port] — what the JS thread did
// in the `windowMs` before the first sample whose stack includes function `anchorFn`: idle vs busy,
// busy self time by file, and busy time by the chain of stack modules (optimystic / sereus / quereus /
// app) on each sample's stack, outermost first — the "whose work is this" view when Hermes async
// stacks show only `asyncGeneratorStep`.
import { readFileSync } from 'node:fs';
const [file, anchor, winMs, port = '8082'] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const url = p.nodes.map((n) => n.callFrame.url).find((u) => u && u.includes('index.bundle'));
const bundle = await (await fetch(`http://localhost:${port}/index.bundle?${url.slice(url.indexOf('&') + 1)}`)).text();
const lines = bundle.split('\n');
const ends = [];
const re = /^\},\s*\d+,\s*\[[^\]]*\],\s*"([^"]+)"\);?\s*$/;
for (let i = 0; i < lines.length; i++) { const m = re.exec(lines[i]); if (m) ends.push([i, m[1]]); }
const moduleAt = (line) => { let lo = 0, hi = ends.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (ends[mid][0] >= line) { ans = ends[mid][1]; hi = mid - 1; } else lo = mid + 1; } return ans ?? '(unknown)'; };
const short = (m) => m.replace(/^.*node_modules\//, '').replace(/\/dist\/src\//, '/').replace(/\/dist\//, '/').replace(/\.js$/, '');
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
let t = p.startTime; const times = [];
for (let i = 0; i < p.samples.length; i++) { t += p.timeDeltas[i] ?? 0; times.push(t); }
const stackFns = (id) => { const s = []; while (id) { s.push(byId.get(id)); id = parent.get(id); } return s; };
const anchorIdx = p.samples.findIndex((s) => stackFns(s).some((n) => n.callFrame.functionName === anchor));
if (anchorIdx < 0) { console.log(`no sample inside '${anchor}'`); process.exit(1); }
const tA = times[anchorIdx], t0 = tA - Number(winMs) * 1000;
const interesting = /@optimystic\/|@serfab\/|@quereus\/|^src\//;
let idle = 0, busy = 0; const byFile = new Map(); const byChain = new Map();
for (let i = 0; i < p.samples.length; i++) {
  if (times[i] < t0 || times[i] >= tA) continue;
  const d = (p.timeDeltas[i + 1] ?? 0) / 1000;
  const st = stackFns(p.samples[i]);
  const top = st[0].callFrame.functionName;
  if (top === '(idle)') { idle += d; continue; }
  busy += d;
  const mods = st.map((n) => (n.callFrame.url && n.callFrame.lineNumber >= 0 ? short(moduleAt(n.callFrame.lineNumber)) : null)).filter(Boolean);
  const leaf = mods[0] ?? '(native)';
  byFile.set(leaf, (byFile.get(leaf) ?? 0) + d);
  const chain = [...mods].reverse().filter((m) => interesting.test(m)).filter((m, j, a) => j === 0 || a[j - 1] !== m);
  const key = chain.slice(0, 4).join(' > ') || '(no stack module)';
  byChain.set(key, (byChain.get(key) ?? 0) + d);
}
console.log(`${winMs} ms before first '${anchor}': idle ${idle.toFixed(0)} ms, busy ${busy.toFixed(0)} ms`);
console.log('-- busy self time by file'); for (const [k, v] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${v.toFixed(0).padStart(6)} ms  ${k}`);
console.log('-- busy by stack modules, outermost first'); for (const [k, v] of [...byChain].sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${v.toFixed(0).padStart(6)} ms  ${k}`);
