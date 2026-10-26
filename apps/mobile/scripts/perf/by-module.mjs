// by-module.mjs <profile.cpuprofile> [metro port] — attribute a Hermes CPU profile's busy self time to
// source modules (dev bundle: each module is `__d(function…, id, deps, "path")`), grouped by file and package.
import { readFileSync } from 'node:fs';
const [file, port = '8082'] = process.argv.slice(2);
const p = JSON.parse(readFileSync(file, 'utf8'));
const url = p.nodes.map((n) => n.callFrame.url).find((u) => u && u.includes('index.bundle'));
const query = url.slice(url.indexOf('&') + 1);
const bundle = await (await fetch(`http://localhost:${port}/index.bundle?${query}`)).text();
// Line index -> module path: find each module's end marker `}, <id>, [deps], "path");`
const lines = bundle.split('\n');
const ends = []; // [lineIdx, path]
const re = /^\},\s*\d+,\s*\[[^\]]*\],\s*"([^"]+)"\);?\s*$/;
for (let i = 0; i < lines.length; i++) { const m = re.exec(lines[i]); if (m) ends.push([i, m[1]]); }
const moduleAt = (line) => { let lo = 0, hi = ends.length - 1, ans = null; while (lo <= hi) { const mid = (lo + hi) >> 1; if (ends[mid][0] >= line) { ans = ends[mid][1]; hi = mid - 1; } else lo = mid + 1; } return ans ?? '(unknown)'; };
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const self = new Map(); p.samples.forEach((s, i) => self.set(s, (self.get(s) ?? 0) + (p.timeDeltas[i] ?? 0)));
// Attribute native frames (no url) to the nearest JS caller's module.
const modOf = (nid) => { let id = nid; while (id) { const cf = byId.get(id).callFrame; if (cf.url && cf.lineNumber >= 0) return moduleAt(cf.lineNumber); id = parent.get(id); } return null; };
const byFile = new Map(); const byPkg = new Map(); let busy = 0;
for (const [nid, us] of self) {
  const fn = byId.get(nid).callFrame.functionName;
  if (/^\((idle|program|garbage collector)\)$/.test(fn)) continue;
  const mod = modOf(nid) ?? '(native, no JS caller)';
  busy += us;
  byFile.set(mod, (byFile.get(mod) ?? 0) + us);
  const pkg = mod.includes('node_modules/') ? mod.split('node_modules/').pop().split('/').slice(0, mod.split('node_modules/').pop().startsWith('@') ? 2 : 1).join('/') : (mod.startsWith('src/') || mod.startsWith('App') ? 'APP ' + mod.split('/').slice(0, 2).join('/') : mod);
  byPkg.set(pkg, (byPkg.get(pkg) ?? 0) + us);
}
console.log(`busy ${(busy / 1000).toFixed(0)} ms (modules indexed: ${ends.length})\n-- by package --`);
for (const [k, v] of [...byPkg].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`${(v / 1000).toFixed(0).padStart(7)} ms  ${(100 * v / busy).toFixed(1).padStart(5)}%  ${k}`);
console.log('-- by file --');
for (const [k, v] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`${(v / 1000).toFixed(0).padStart(7)} ms  ${(100 * v / busy).toFixed(1).padStart(5)}%  ${k.replace(/^.*node_modules\//, '')}`);
