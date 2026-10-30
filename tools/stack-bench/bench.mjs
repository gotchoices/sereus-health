// Health's real schema + a real backup, then health's own slowest queries, timed in:
//   memory — plain Quereus (in-memory vtab): the cost of the SQL itself
//   strand — a solo cadre-core strand on optimystic (MemoryRawStorage), as on the phone
//
// Run:  SYNTH=1 node query-perf.mjs   (or: node query-perf.mjs <health-backup.yaml>)
//   env: MODES=memory,strand  RUNS=3  NODES=0  CADRE=<cadre-cli bin>  LATENCY_MS=0  STORAGE_DELAY_MS=0
//        PLAN='<query name>|…'  PROFILE='<query name>'  WRITES=0  SETTLE_MS=15000  QUERY_TRACE=1  PLAN_EACH=1
//        OFFLINE=1  (phone strand in offline mode: writes report ack / sent / held, see timeWrite)
import { readFileSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import yaml from 'js-yaml';
import { Database } from '@quereus/quereus';
import { CadreNode, ed25519KeyPairFromLibp2p, encodeNodeClaimPayload, decodeNodeClaimPayload } from '@serfab/cadre-core';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import { FileKVStore } from '@optimystic/db-p2p-storage-fs';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { webSockets } from '@libp2p/websockets';

const HERE = new URL('.', import.meta.url).pathname;
// A health backup (YAML) to load, or SYNTH=1 for synthetic data of the same shape (3 types,
// 11 categories, 172 items, 177 entries, ~480 entry-item links) so no personal data is needed.
const BACKUP = process.argv[2];
if (!BACKUP && !process.env.SYNTH) { console.error('usage: SYNTH=1 node query-perf.mjs   (or: node query-perf.mjs <health-backup.yaml>)'); process.exit(2); }
// Health's canonical schema (the one the app ships), not a copy.
const SCHEMA_FILE = join(HERE, '../../design/specs/domain/schema.qsql');
const MODES = (process.env.MODES ?? 'memory,strand').split(',');
const RUNS = Number(process.env.RUNS ?? 3);
const STORAGE_DELAY_MS = Number(process.env.STORAGE_DELAY_MS ?? 0);
// NODES=k: after loading, the strand phone claims k local cadre-cli nodes (CADRE = path to the
// cadre binary, default ./node_modules/.bin/cadre) and the queries are timed again with them up.
const NODES = Number(process.env.NODES ?? 0);
const CADRE = process.env.CADRE ?? join(HERE, 'node_modules/.bin/cadre');
// LATENCY_MS=<round trip>: every phone dial goes through a local TCP proxy that delays each
// chunk by half of it in each direction (control and strand ports alike).
const LATENCY_MS = Number(process.env.LATENCY_MS ?? 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const schemaSql = readFileSync(SCHEMA_FILE, 'utf8');
const innerDDL = schemaSql.replace(/^\s*--[^\n]*\n/gm, '').replace(/^declare\s+schema\s+\w+\s*\{/m, '').replace(/\}\s*$/, '').trim();
function synthetic() {
  // Deterministic pseudo-random so runs are comparable.
  let x = 42; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const types = ['Activity', 'Condition', 'Outcome'].map((name) => ({ name }));
  const catsPerType = { Activity: 5, Condition: 3, Outcome: 3 };
  const categories = []; const items = [];
  for (const t of types) for (let c = 0; c < catsPerType[t.name]; c++) categories.push({ typeName: t.name, name: `${t.name}-cat${c}` });
  for (let i = 0; i < 172; i++) { const c = categories[i < 145 ? i % 5 : 5 + (i % 6)]; items.push({ typeName: c.typeName, categoryName: c.name, name: `item${i}` }); }
  const logs = [];
  for (let e = 0; e < 177; e++) {
    const typeName = e < 140 ? 'Activity' : types[1 + (e % 2)].name;
    const pool = items.filter((it) => it.typeName === typeName);
    const n = 1 + Math.floor(rnd() * 5);
    logs.push({ timestampUtc: new Date(Date.UTC(2026, 6, 1) + e * 3600e3).toISOString(), eventUtcOffsetMinutes: -360, typeName,
      items: Array.from({ length: n }, () => { const it = pool[Math.floor(rnd() * pool.length)]; return { categoryName: it.categoryName, itemName: it.name }; }) });
  }
  return { catalog: { types, categories, items, bundles: [] }, logs };
}
const backup = process.env.SYNTH ? synthetic() : yaml.load(readFileSync(BACKUP, 'utf8'));

// ---- the queries health runs on its slow screens (verbatim from src/db) ----------------
const QUERIES = {
  'types usage (EditEntry)': [`SELECT t.id, t.name, count(e.id) as usageCount FROM types t LEFT JOIN log_entries e ON e.type_id = t.id GROUP BY t.id, t.name ORDER BY usageCount DESC, t.name ASC`, () => []],
  'items for type (EditEntry)': [`SELECT i.id AS itemId, i.name AS itemName, c.id AS categoryId, c.name AS categoryName FROM items i JOIN categories c ON c.id = i.category_id WHERE c.type_id = ?`, (ids) => [ids.activity]],
  'item usage counts (EditEntry)': [`SELECT lei.item_id AS id, count(*) AS n FROM log_entry_items lei JOIN items i ON i.id = lei.item_id JOIN categories c ON c.id = i.category_id WHERE c.type_id = ? GROUP BY lei.item_id`, (ids) => [ids.activity]],
  'bundle usage counts (EditEntry)': [`SELECT lei.source_bundle_id AS id, count(*) AS n FROM log_entry_items lei JOIN bundles b ON b.id = lei.source_bundle_id WHERE b.type_id = ? GROUP BY lei.source_bundle_id`, (ids) => [ids.activity]],
  'category item counts (Catalog)': [`SELECT i.category_id AS id, count(*) AS n FROM items i JOIN categories c ON c.id = i.category_id WHERE c.type_id = ? GROUP BY i.category_id`, (ids) => [ids.activity]],
  'history entries (History)': [`SELECT e.id, e.timestamp, e.type_id AS typeId, t.name AS typeName, e.comment, e.event_utc_offset_minutes AS eventUtcOffsetMinutes FROM log_entries e JOIN types t ON t.id = e.type_id ORDER BY e.timestamp DESC`, () => []],
  'history items (History)': [`SELECT lei.entry_id AS entryId, i.id AS itemId, i.name AS name, c.id AS categoryId, c.name AS categoryName, lei.source_bundle_id AS sourceBundleId, b.name AS sourceBundleName FROM log_entry_items lei JOIN items i ON i.id = lei.item_id JOIN categories c ON c.id = i.category_id LEFT JOIN bundles b ON b.id = lei.source_bundle_id ORDER BY i.name ASC`, () => []],
  'count log_entry_items': [`SELECT count(*) AS n FROM log_entry_items`, () => []],
  // Rewrites: one table each, no join, so no per-row lookups (filter by type in JS).
  'REWRITE item usage counts': [`SELECT item_id AS id, count(*) AS n FROM log_entry_items GROUP BY item_id`, () => []],
  'REWRITE bundle usage counts': [`SELECT source_bundle_id AS id, count(*) AS n FROM log_entry_items WHERE source_bundle_id IS NOT NULL GROUP BY source_bundle_id`, () => []],
  'REWRITE category item counts': [`SELECT category_id AS id, count(*) AS n FROM items GROUP BY category_id`, () => []],
  'REWRITE categories for type': [`SELECT id, name FROM categories WHERE type_id = ?`, (ids) => [ids.activity]],
  'REWRITE all items': [`SELECT id AS itemId, name AS itemName, category_id AS categoryId FROM items`, () => []],
};

function slowStorage(storage) {
  if (!STORAGE_DELAY_MS) return storage;
  return new Proxy(storage, { get(t, p) { const v = Reflect.get(t, p, t); if (typeof v !== 'function') return v;
    return (...a) => { const r = v.apply(t, a); return r && typeof r.then === 'function' ? r.then((x) => sleep(STORAGE_DELAY_MS).then(() => x)) : r; }; } });
}

async function openMemory() {
  const db = new Database();
  await db.exec(`declare schema main { ${innerDDL} }\napply schema main;`);
  return { db, close: async () => db.close?.() };
}

// ---- latency model -----------------------------------------------------------------------
const proxies = new Map(); // target port -> proxy port
function proxyFor(port) {
  if (proxies.has(port)) return proxies.get(port);
  const oneWay = LATENCY_MS / 2;
  const ready = new Promise((resolve) => {
    const server = net.createServer((client) => {
      const upstream = net.connect(port, '127.0.0.1');
      const pipe = (a, b) => {
        // Order-preserving delay: each chunk leaves `oneWay` ms after it arrived.
        a.on('data', (chunk) => setTimeout(() => { if (!b.destroyed) b.write(chunk); }, oneWay));
        a.on('end', () => setTimeout(() => b.end(), oneWay));
        a.on('error', () => b.destroy());
        a.on('close', () => setTimeout(() => b.destroy(), oneWay));
      };
      pipe(client, upstream); pipe(upstream, client);
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    server.unref();
  });
  proxies.set(port, ready);
  return ready;
}
function withLatency(factory) {
  if (!LATENCY_MS) return factory;
  return (components) => {
    const t = factory(components);
    return new Proxy(t, { get(target, prop) {
      if (prop === 'dial') return async (ma, options) => {
        const m = /^\/ip4\/[0-9.]+\/tcp\/(\d+)(.*)$/.exec(ma.toString()); // all nodes are on this machine
        if (!m) return target.dial(ma, options);
        const viaPort = await proxyFor(Number(m[1]));
        const { multiaddr } = await import('@multiformats/multiaddr');
        return target.dial(multiaddr(`/ip4/127.0.0.1/tcp/${viaPort}${m[2]}`), options);
      };
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    } });
  };
}

const OFFLINE = process.env.OFFLINE === '1';
const journals = new Map();
const journalDir = OFFLINE ? mkdtempSync(join(tmpdir(), 'bench-journal-')) : '';
// JOURNAL=mem: a never-syncing in-memory journal — diagnostic only (it does not survive a restart),
// to separate the queue's own cost from the file store's disk syncs.
function memJournal() {
  const m = new Map();
  return {
    get: async (k) => m.get(k),
    set: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
    list: async (prefix) => [...m.keys()].filter((k) => k.startsWith(prefix)),
    // JOURNAL=mem-pause: a 1 ms pause per flush, about the cost of a write that never reaches disk.
    ...(process.env.JOURNAL === 'mem-pause' ? { flush: () => sleep(1) } : {}),
  };
}
function journalFor(scope) {
  if (!journals.has(scope)) journals.set(scope, process.env.JOURNAL?.startsWith('mem') ? memJournal() : new FileKVStore(join(journalDir, scope)));
  return journals.get(scope);
}

// Offline-mode write timing, by StampId: when the save returned (ack), when the queue reported the
// transaction committed by the cadre (sent), and when every cohort member held it (held).
const offlineWrites = new Map(); // txId -> { t0, ack, sent, held, failed }
function followOffline(node) {
  node.on('strand:offline-status', ({ status }) => {
    const w = offlineWrites.get(status?.transactionId);
    if (!w) return;
    if (status.kind === 'committed') {
      w.sent ??= performance.now() - w.t0;
      if (status.durability?.overall?.quorum === 'full') w.held ??= w.sent;
    } else if (status.kind === 'failed') w.failed = `${status.reason}: ${status.error?.message ?? ''}`;
  });
  node.on('strand:commit-held', ({ transactionId }) => {
    const w = offlineWrites.get(transactionId);
    if (w) w.held ??= performance.now() - w.t0;
  });
}
/** Wait (up to `ms`) for this phase's offline writes to be sent and held, then report them. */
async function settleOffline(label, txIds, ms = Number(process.env.SYNC_WAIT_MS ?? 120000)) {
  const end = Date.now() + ms;
  const done = () => txIds.every((tx) => { const w = offlineWrites.get(tx); return w && (w.failed || w.held !== undefined); });
  while (!done() && Date.now() < end) await sleep(250);
  const fmt = (v) => (v === undefined ? '—' : v.toFixed(0));
  const ws = txIds.map((tx) => offlineWrites.get(tx));
  for (const [key, name] of [['sent', 'WRITE sent (cadre committed)'], ['held', 'WRITE held (every member)']]) {
    results[name] ??= {};
    results[name][label] = ws.map((w) => (w.failed ? 'failed' : fmt(w[key]))).join(' / ');
    console.log(`  ${name.padEnd(34)}           ms: ${results[name][label]}`);
  }
}

async function openStrand() {
  const storages = new Map();
  const identity = await generateKeyPair('Ed25519');
  const node = new CadreNode({
    privateKey: identity,
    controlNetwork: { partyId: randomUUID(), bootstrapNodes: [] },
    profile: 'transaction',
    requireSignedSchemas: false,
    strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' },
    storage: { provider: (scope) => { if (!storages.has(scope)) storages.set(scope, new MemoryRawStorage()); return slowStorage(storages.get(scope)); } },
    network: { listenAddrs: [], transports: [withLatency(webSockets())], connectionGater: { denyDialMultiaddr: () => false } },
    hibernation: { enabled: false },
    // OFFLINE=1: the phone's strand in offline mode, as health runs it (sereus 1.19.1). The journal
    // is a file store per strand scope (the offline queue refuses an in-memory journal).
    ...(OFFLINE ? { strandOffline: { journal: (scope) => journalFor(scope), initialMode: 'offline' } } : {}),
  });
  if (OFFLINE) followOffline(node);
  await node.start();
  const strandId = randomUUID();
  // Owner key derived from the node identity, as health does (CadreService.runOwnerGenesis).
  const owner = ed25519KeyPairFromLibp2p(identity);
  await node.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
  await node.initializeSeedBootstrap(owner.privateKeyB64);
  await node.publishStrand(strandId, 'o');
  const strand = await node.addStrand({
    strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: node.peerId.toString() },
    sAppConfig: { id: 'org.sereus.health', version: '1.1', schema: innerDDL, signature: '' },
    founder: true,
  });
  const db = strand.database.getDatabase();
  await db.exec("PRAGMA schema_path = 'app,main'");
  return { db, node, strand, close: () => node.stop() };
}

// ---- local cadre-cli nodes ---------------------------------------------------------------
const procs = [];
process.on('exit', () => { for (const p of procs) p.kill('SIGKILL'); });
function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    try { n += e.isDirectory() ? dirSize(f) : statSync(f).size; } catch { /* removed mid-scan */ }
  }
  return n;
}
async function addNode(phone, k) {
  const dir = mkdtempSync(join(tmpdir(), `qp-node${k}-`));
  const ws = 46000 + k * 10 + 2, tcp = ws - 1, hp = 47000 + k;
  execFileSync(CADRE, ['init', '--dir', dir, '--port', String(tcp), '--ws-port', String(ws)], { stdio: 'ignore' });
  let out = '';
  const p = spawn(CADRE, ['start', '-c', join(dir, 'cadre.yaml'), '--health-port', String(hp), '--no-health-server'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  // NODE_LOG=<prefix>: also write node k's full output to <prefix><k>.log.
  const tee = (d) => { out += d; if (process.env.NODE_LOG) appendFileSync(`${process.env.NODE_LOG}${k}.log`, d); };
  p.stdout.on('data', tee); p.stderr.on('data', tee);
  procs.push(p);
  const waitFor = async (re, ms, what) => { const end = Date.now() + ms; while (!re.test(out)) { if (Date.now() > end) throw new Error(`node ${k}: timed out waiting for ${what}\n${out.slice(-1500)}`); await sleep(250); } };
  await waitFor(/Awaiting claim/, 60000, 'awaiting claim');
  const peerId = readFileSync(join(dir, 'cadre-peer.id'), 'utf8').trim();
  const secret = readFileSync(join(dir, 'claim.secret'), 'utf8').trim();
  const payload = decodeNodeClaimPayload(encodeNodeClaimPayload({ peerId, multiaddrs: [`/ip4/127.0.0.1/tcp/${ws}/ws/p2p/${peerId}`], secret }));
  const t0 = Date.now();
  await phone.claimNode(payload);
  await waitFor(/Strand started/, 180000, 'strand started');
  // Settle: the node has copied the strand when its data directory stops growing.
  let prev = -1, size = dirSize(join(dir, 'data'));
  while (size !== prev) { prev = size; await sleep(5000); size = dirSize(join(dir, 'data')); }
  console.log(`  node ${k} claimed, strand started and copied in ${((Date.now() - t0) / 1000).toFixed(1)} s (${(size / 1024).toFixed(0)} KB)`);
  return join(dir, 'data');
}

// ---- replication check (REPL_CHECK=1) ------------------------------------------------------
// A marker string written on the phone is looked for, as raw bytes, in each node's storage.
function dirContains(dir, needle) {
  if (!existsSync(dir)) return false;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    try {
      if (e.isDirectory()) { if (dirContains(f, needle)) return true; }
      else if (readFileSync(f).includes(needle)) return true;
    } catch { /* removed mid-scan */ }
  }
  return false;
}
async function writeMarker(db, ids, marker) {
  await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)',
    [randomUUID(), new Date().toISOString().replace('Z', ''), ids.activity, marker, 0]);
}
async function waitForMarkers(nodeDirs, markers, ms) {
  const t0 = Date.now();
  const seen = new Map();
  while (Date.now() - t0 < ms) {
    for (const [i, dir] of nodeDirs.entries()) for (const m of markers) {
      const key = `${i + 1}:${m}`;
      if (!seen.has(key) && dirContains(dir, m)) seen.set(key, Date.now() - t0);
    }
    if (seen.size === nodeDirs.length * markers.length) break;
    await sleep(5000);
  }
  for (const [i] of nodeDirs.entries()) for (const m of markers) {
    const v = seen.get(`${i + 1}:${m}`);
    console.log(`    node ${i + 1} has ${m}: ${v === undefined ? `NO (after ${(ms / 1000).toFixed(0)} s)` : `yes, ${(v / 1000).toFixed(0)} s after the check began`}`);
  }
}

async function load(db) {
  const ids = { types: new Map(), cats: new Map(), items: new Map() };
  const t0 = Date.now();
  let n = 0;
  for (const t of backup.catalog.types) { const id = randomUUID(); ids.types.set(t.name, id); await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [id, t.name, n++]); }
  for (const c of backup.catalog.categories) { const id = randomUUID(); ids.cats.set(`${c.typeName}\0${c.name}`, id); await db.exec('INSERT INTO categories (id, type_id, name) VALUES (?, ?, ?)', [id, ids.types.get(c.typeName), c.name]); }
  for (const it of backup.catalog.items) { const id = randomUUID(); ids.items.set(`${it.categoryName}\0${it.name}`, id); await db.exec('INSERT INTO items (id, category_id, name) VALUES (?, ?, ?)', [id, ids.cats.get(`${it.typeName}\0${it.categoryName}`), it.name]); }
  const tCatalog = Date.now();
  let entries = 0, links = 0;
  for (const l of backup.logs) {
    const id = randomUUID();
    await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)',
      [id, l.timestampUtc.replace('Z', ''), ids.types.get(l.typeName), l.comment ?? null, l.eventUtcOffsetMinutes ?? null]);
    entries++;
    const seen = new Set();
    for (const li of l.items ?? []) {
      const itemId = ids.items.get(`${li.categoryName}\0${li.itemName}`);
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);
      await db.exec('INSERT INTO log_entry_items (entry_id, item_id) VALUES (?, ?)', [id, itemId]);
      links++;
    }
  }
  const tLogs = Date.now();
  return { ids: { activity: ids.types.get('Activity') }, catalogMs: tCatalog - t0, logsMs: tLogs - tCatalog, entries, links };
}

async function timeQuery(db, sql, params) {
  const t = performance.now();
  let rows = 0;
  for await (const _ of db.eval(sql, params)) rows++;
  return { ms: performance.now() - t, rows };
}

console.log(`query-perf — ${backup.catalog.items.length} items, ${backup.logs.length} log entries; RUNS=${RUNS} STORAGE_DELAY_MS=${STORAGE_DELAY_MS} NODES=${NODES}`);
const results = {};
// PROFILE=<query name>: CPU-profile that query's runs at each step (Node inspector), saved as
// profile-<label>.cpuprofile and summarized by self time.
let inspectorSession = null;
async function profiled(label, fn) {
  if (!inspectorSession) {
    const inspector = await import('node:inspector/promises');
    inspectorSession = new inspector.Session();
    inspectorSession.connect();
    await inspectorSession.post('Profiler.enable');
    await inspectorSession.post('Profiler.setSamplingInterval', { interval: 200 });
  }
  await inspectorSession.post('Profiler.start');
  const out = await fn();
  const { profile } = await inspectorSession.post('Profiler.stop');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(join(HERE, `profile-${label}.cpuprofile`), JSON.stringify(profile));
  summarize(profile, label);
  return out;
}
function summarize(profile, label) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas;
  profile.samples.forEach((id, i) => { self.set(id, (self.get(id) ?? 0) + (dt[i] ?? 0)); });
  const agg = new Map();
  let total = 0;
  for (const [id, us] of self) {
    const cf = byId.get(id).callFrame;
    const file = (cf.url || '').replace(/^.*node_modules\//, '').replace(/^file:\/\/.*\//, '');
    const key = `${cf.functionName || '(anon)'}  ${file}:${cf.lineNumber + 1}`;
    agg.set(key, (agg.get(key) ?? 0) + us);
    total += us;
  }
  console.log(`  profile [${label}] total ${(total / 1000).toFixed(0)} ms; top self time:`);
  for (const [k, us] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
    console.log(`    ${(us / 1000).toFixed(1).padStart(7)} ms  ${(100 * us / total).toFixed(1).padStart(5)}%  ${k.slice(0, 130)}`);
  }
}

async function timeWrite(db, ids) {
  const id = randomUUID();
  const items = [];
  for await (const r of db.eval('SELECT id FROM items LIMIT 3')) items.push(r.id);
  const mark = (what) => { if (process.env.WRITE_TRACE) process.stderr.write(`${new Date().toISOString()} WRITE-${what} ${currentLabel}\n`); };
  mark('START');
  const t = performance.now();
  await db.exec('BEGIN');
  await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)', [id, new Date().toISOString().replace('Z', ''), ids.activity, 'perf', 0]);
  for (const it of items) await db.exec('INSERT INTO log_entry_items (entry_id, item_id) VALUES (?, ?)', [id, it]);
  if (OFFLINE) {
    const tx = (await db.get('SELECT StampId() AS tx'))?.tx;
    if (tx) { lastTx = tx; offlineWrites.set(tx, { t0: t }); }
  }
  await db.exec('COMMIT');
  const ms = performance.now() - t;
  if (OFFLINE && lastTx) offlineWrites.get(lastTx).ack = ms;
  mark('END');
  return ms;
}
let currentLabel = '';
let lastTx = null;
// IDLE_MS=<ms>: before timing, measure the phone node's background load over an idle window:
// event-loop utilization (share of time the JS thread was busy) and process CPU. IDLE_PROFILE=1
// also CPU-profiles the window (profile-idle-<label>.cpuprofile, top self time printed).
async function idleWindow(label, ms = Number(process.env.IDLE_MS), key = 'IDLE') {
  const { performance: perf } = await import('node:perf_hooks');
  const measure = async () => {
    const elu0 = perf.eventLoopUtilization();
    const cpu0 = process.cpuUsage();
    await sleep(ms);
    const elu = perf.eventLoopUtilization(elu0);
    const cpu = process.cpuUsage(cpu0);
    return { elu: elu.utilization, cpuPct: (100 * (cpu.user + cpu.system)) / 1000 / ms };
  };
  const r = process.env.IDLE_PROFILE ? await profiled(`idle-${label}`, measure) : await measure();
  results[`${key} event-loop busy %`] ??= {};
  results[`${key} process CPU %`] ??= {};
  results[`${key} event-loop busy %`][label] = (100 * r.elu).toFixed(1);
  results[`${key} process CPU %`][label] = r.cpuPct.toFixed(1);
  console.log(`  ${key} ${ms / 1000}s: event loop busy ${(100 * r.elu).toFixed(1)}%, process CPU ${r.cpuPct.toFixed(1)}%`);
}
async function timeAll(db, ids, label) {
  currentLabel = label;
  if (process.env.IDLE_MS) await idleWindow(label);
  if (process.env.WRITES !== '0') {
    const w = [];
    const txs = [];
    for (let i = 0; i < RUNS; i++) { lastTx = null; w.push(await timeWrite(db, ids)); if (lastTx) txs.push(lastTx); }
    results['WRITE 1 entry + 3 items'] ??= {};
    results['WRITE 1 entry + 3 items'][label] = w.map((x) => x.toFixed(0)).join(' / ');
    console.log(`  ${'WRITE 1 entry + 3 items'.padEnd(34)}           ms: ${results['WRITE 1 entry + 3 items'][label]}`);
    if (OFFLINE && txs.length) await settleOffline(label, txs);
  }
  // PLAN_EACH=1: print the PLAN queries' plans at every step (after its writes), not only after loading.
  if (process.env.PLAN && process.env.PLAN_EACH) {
    for (const name of process.env.PLAN.split('|')) {
      const [sql, params] = QUERIES[name];
      let literal = sql;
      for (const p of params(ids)) literal = literal.replace('?', `'${p}'`);
      console.log(`  plan [${label}] ${name}:`);
      for await (const r of db.eval('select id, parent_id, op, detail, object_name, est_rows from query_plan(?)', [literal])) {
        console.log(`    ${String(r.id).padStart(2)}<${String(r.parent_id ?? '').padEnd(2)} ${String(r.op).padEnd(18)} ${String(r.object_name ?? '').padEnd(16)} rows~${String(r.est_rows ?? '').padEnd(5)} ${String(r.detail).slice(0, 110)}`);
      }
    }
  }
  for (const [name, [sql, params]] of Object.entries(QUERIES)) {
    if (process.env.QUERIES === '0') break;
    const times = [];
    let rows = 0;
    if (process.env.PROFILE === name) {
      await profiled(label, async () => { for (let i = 0; i < RUNS; i++) await timeQuery(db, sql, params(ids)); });
    }
    // QUERY_TRACE=1: QUERY-START/END markers on stderr around each run, for request counting.
    const qmark = (what, i) => { if (process.env.QUERY_TRACE) process.stderr.write(`${new Date().toISOString()} QUERY-${what} ${label}|${name}|${i}\n`); };
    for (let i = 0; i < RUNS; i++) { qmark('START', i); const r = await timeQuery(db, sql, params(ids)); qmark('END', i); times.push(r.ms); rows = r.rows; }
    results[name] ??= {};
    results[name][label] = times.map((x) => x.toFixed(0)).join(' / ');
    console.log(`  ${name.padEnd(34)} rows=${String(rows).padEnd(4)} ms: ${results[name][label]}`);
  }
  // POSTQ_MS=<ms>: right after the query burst, measure the background load it left behind.
  if (process.env.POSTQ_MS) await idleWindow(label, Number(process.env.POSTQ_MS), 'AFTER-READS');
}
for (const mode of MODES) {
  const opened = mode === 'memory' ? await openMemory() : await openStrand();
  const { db, close } = opened;
  const l = await load(db);
  console.log(`\n[${mode}] load: catalog ${l.catalogMs} ms, ${l.entries} entries + ${l.links} links ${l.logsMs} ms (${(l.logsMs / (l.entries + l.links)).toFixed(1)} ms/row)`);
  if (process.env.PLAN) {
    for (const name of process.env.PLAN.split('|')) {
      const [sql, params] = QUERIES[name];
      let literal = sql;
      for (const p of params(l.ids)) literal = literal.replace('?', `'${p}'`);
      console.log(`  plan [${mode}] ${name}:`);
      for await (const r of db.eval('select id, parent_id, op, detail, object_name, est_rows from query_plan(?)', [literal])) {
        console.log(`    ${String(r.id).padStart(2)}<${String(r.parent_id ?? '').padEnd(2)} ${String(r.op).padEnd(18)} ${String(r.object_name ?? '').padEnd(16)} rows~${String(r.est_rows ?? '').padEnd(5)} ${String(r.detail).slice(0, 110)}`);
      }
    }
  }
  if (process.env.EQUIV) {
    const rows = async (sql, params) => { const out = []; for await (const r of db.eval(sql, params)) out.push(r); return out; };
    const t = l.ids.activity;
    const oldUsage = new Map((await rows(QUERIES['item usage counts (EditEntry)'][0], [t])).map((r) => [r.id, r.n]));
    const typeItems = await rows(QUERIES['items for type (EditEntry)'][0], [t]);
    const cats = new Map((await rows(QUERIES['REWRITE categories for type'][0], [t])).map((r) => [r.id, r.name]));
    const newItems = (await rows(QUERIES['REWRITE all items'][0], [])).filter((r) => cats.has(r.categoryId));
    const allUsage = new Map((await rows(QUERIES['REWRITE item usage counts'][0], [])).map((r) => [r.id, r.n]));
    const newUsage = new Map(newItems.filter((r) => allUsage.has(r.itemId)).map((r) => [r.itemId, allUsage.get(r.itemId)]));
    const sameItems = typeItems.length === newItems.length && typeItems.every((r) => newItems.some((x) => x.itemId === r.itemId && cats.get(x.categoryId) === r.categoryName));
    const sameUsage = oldUsage.size === newUsage.size && [...oldUsage].every(([k, v]) => newUsage.get(k) === v);
    const oldCat = new Map((await rows(QUERIES['category item counts (Catalog)'][0], [t])).map((r) => [r.id, r.n]));
    const allCat = new Map((await rows(QUERIES['REWRITE category item counts'][0], [])).map((r) => [r.id, r.n]));
    const sameCat = [...cats.keys()].every((c) => (oldCat.get(c) ?? 0) === (allCat.get(c) ?? 0));
    console.log(`  EQUIV [${mode}] items for type: ${sameItems} (${typeItems.length}), item usage: ${sameUsage} (${oldUsage.size}), category counts: ${sameCat}`);
  }
  if (!process.env.REPL_CHECK) await timeAll(db, l.ids, mode);
  const nodeDirs = [];
  const markers = [];
  if (mode === 'strand' && process.env.REPL_CHECK) {
    markers.push(`marker-before-claim-${randomUUID().slice(0, 8)}`);
    await writeMarker(db, l.ids, markers[0]);
  }
  if (mode === 'strand') {
    for (let k = 1; k <= NODES; k++) {
      nodeDirs.push(await addNode(opened.node, k));
      if (process.env.REPL_CHECK) {
        const live = `marker-after-node${k}-${randomUUID().slice(0, 8)}`;
        markers.push(live);
        await writeMarker(db, l.ids, live);
        console.log(`[replication with ${k} node${k > 1 ? 's' : ''}]  phone strand connections: ${opened.strand.libp2pNode?.getConnections().length ?? '?'}; markers: ${markers.join(', ')}`);
        await waitForMarkers(nodeDirs, markers, Number(process.env.REPL_WAIT_MS ?? 180000));
        if (process.env.REPL_SECOND) {
          const second = `marker-second-node${k}-${randomUUID().slice(0, 8)}`;
          await writeMarker(db, l.ids, second);
          console.log(`  second write ${second}; phone strand connections now: ${opened.strand.libp2pNode?.getConnections().length ?? '?'}`);
          const t0 = Date.now();
          let conns = [];
          const probe = setInterval(() => conns.push(opened.strand.libp2pNode?.getConnections().length ?? -1), 5000);
          await waitForMarkers(nodeDirs, [second], Number(process.env.REPL_WAIT_MS ?? 180000));
          clearInterval(probe);
          console.log(`  phone strand connections every 5 s during the wait: ${conns.join(' ')}`);
        }
        continue;
      }
      const t = Date.now();
      await sleep(Number(process.env.SETTLE_MS ?? 15000));
      console.log(`[strand + ${k} node${k > 1 ? 's' : ''}]  (settled ${(Date.now() - t) / 1000}s; phone strand connections: ${opened.strand.libp2pNode?.getConnections().length ?? '?'})`);
      await timeAll(db, l.ids, `strand+${k}`);
    }
  }
  await close();
}
console.log('\nms per run (first / second / …):');
console.table(results);
process.exit(0);
