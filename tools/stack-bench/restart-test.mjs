// restart-test.mjs — does a phone-like strand node reopen its own strand after a restart?
//
// A phone (CadreNode, in-memory storage kept across its restart, WebSocket transport only, no
// listen addresses — as on React Native) founds health's strand, writes a few rows, claims NODES
// local cadre-cli nodes, optionally removes REMOVE of them with removeMachine, optionally stops
// every remaining node (OFFLINE=1), then stops and restarts the phone the way health does (same
// identity and party, bootstrap = the live nodes' control addresses, addStrand as non-founder) and
// reports whether the strand opens, how long it took, and whether the rows are there.
//
// env: NODES=3  REMOVE=0  OFFLINE=0  SETTLE_MS=60000  CADRE=<cadre-cli bin>
//      DEBUG=sereus:cadre:strand-redial,optimystic:db-p2p:libp2p-key-network*  (to see the cohort)
import { readFileSync, mkdtempSync, existsSync, readdirSync, statSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CadreNode, ed25519KeyPairFromLibp2p, encodeNodeClaimPayload, decodeNodeClaimPayload } from '@serfab/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { webSockets } from '@libp2p/websockets';

const HERE = new URL('.', import.meta.url).pathname;
const NODES = Number(process.env.NODES ?? 3);
const REMOVE = Number(process.env.REMOVE ?? 0);
const OFFLINE = process.env.OFFLINE === '1';
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 60000);
const CADRE = process.env.CADRE ?? join(HERE, 'node_modules/.bin/cadre');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const innerDDL = readFileSync(join(HERE, '../../design/specs/domain/schema.qsql'), 'utf8')
  .replace(/^\s*--[^\n]*\n/gm, '').replace(/^declare\s+schema\s+\w+\s*\{/m, '').replace(/\}\s*$/, '').trim();

const storages = new Map();
const identity = await generateKeyPair('Ed25519');
const owner = ed25519KeyPairFromLibp2p(identity);
const partyId = randomUUID();
const strandId = randomUUID();

function phoneNode(bootstrapNodes) {
  return new CadreNode({
    privateKey: identity,
    controlNetwork: { partyId, bootstrapNodes },
    profile: 'transaction',
    requireSignedSchemas: false,
    strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' },
    storage: { provider: (scope) => { if (!storages.has(scope)) storages.set(scope, new MemoryRawStorage()); return storages.get(scope); } },
    network: { listenAddrs: [], transports: [webSockets()], connectionGater: { denyDialMultiaddr: () => false } },
    hibernation: { enabled: false },
  });
}
const strandConfig = (node, founder) => ({
  strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: node.peerId.toString() },
  sAppConfig: { id: 'org.sereus.health', version: '1.1', schema: innerDDL, signature: '' },
  founder,
});

// ---- cadre-cli nodes ----
const procs = new Map();
process.on('exit', () => { for (const p of procs.values()) p.kill('SIGKILL'); });
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
  const dir = mkdtempSync(join(tmpdir(), `rt-node${k}-`));
  const ws = 46100 + k * 10 + 2, tcp = ws - 1, hp = 47100 + k;
  execFileSync(CADRE, ['init', '--dir', dir, '--port', String(tcp), '--ws-port', String(ws)], { stdio: 'ignore' });
  let out = '';
  const p = spawn(CADRE, ['start', '-c', join(dir, 'cadre.yaml'), '--health-port', String(hp), '--no-health-server'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const tee = (d) => { out += d; if (process.env.NODE_LOG) appendFileSync(`${process.env.NODE_LOG}${k}.log`, d); };
  p.stdout.on('data', tee); p.stderr.on('data', tee);
  const waitFor = async (re, ms, what) => { const end = Date.now() + ms; while (!re.test(out)) { if (Date.now() > end) throw new Error(`node ${k}: timed out waiting for ${what}\n${out.slice(-1500)}`); await sleep(250); } };
  await waitFor(/Awaiting claim/, 60000, 'awaiting claim');
  const peerId = readFileSync(join(dir, 'cadre-peer.id'), 'utf8').trim();
  const secret = readFileSync(join(dir, 'claim.secret'), 'utf8').trim();
  const addr = `/ip4/127.0.0.1/tcp/${ws}/ws/p2p/${peerId}`;
  await phone.claimNode(decodeNodeClaimPayload(encodeNodeClaimPayload({ peerId, multiaddrs: [addr], secret })));
  await waitFor(/Strand started/, 180000, 'strand started');
  let prev = -1, size = dirSize(join(dir, 'data'));
  while (size !== prev) { prev = size; await sleep(5000); size = dirSize(join(dir, 'data')); }
  procs.set(peerId, p);
  log(`node ${k} claimed and copied (${(size / 1024).toFixed(0)} KB)  ${peerId.slice(-6)}`);
  return { k, peerId, addr, proc: p, dir };
}

// ---- run ----
log(`NODES=${NODES} REMOVE=${REMOVE} OFFLINE=${OFFLINE ? 1 : 0}`);
let phone = phoneNode([]);
await phone.start();
await phone.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
await phone.initializeSeedBootstrap(owner.privateKeyB64);
await phone.publishStrand(strandId, 'o');
let strand = await phone.addStrand(strandConfig(phone, true));
let db = strand.database.getDatabase();
await db.exec("PRAGMA schema_path = 'app,main'");
for (let i = 0; i < 5; i++) await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [randomUUID(), `type-${i}`, i]);
log('phone founded the strand, 5 rows written');

const nodes = [];
for (let k = 1; k <= NODES; k++) nodes.push(await addNode(phone, k));
await sleep(SETTLE_MS);
log(`settled; phone strand connections: ${strand.libp2pNode?.getConnections().length ?? '?'}`);
await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [randomUUID(), 'type-after-nodes', 9]);

// Strand peer ids of the nodes (the phone's strand connections, keyed by remote address port).
const strandPeers = (strand.libp2pNode?.getConnections() ?? []).map((c) => c.remotePeer.toString());
log(`phone strand peers: ${strandPeers.map((x) => x.slice(-6)).join(' ')}`);
function holders(id) { const out = []; for (const n of nodes) { try { execFileSync('grep', ['-rlq', id, n.dir]); out.push(n.k); } catch { /* absent */ } } return out; }
for (const n of nodes.slice(0, REMOVE)) {
  const plan = await phone.planMachineRemoval(n.peerId);
  log(`removing node ${n.k} (${n.peerId.slice(-6)}); plan: ${JSON.stringify(plan).slice(0, 160)}`);
  await phone.removeMachine(n.peerId);
  await sleep(10000);
  n.proc.kill('SIGTERM'); procs.delete(n.peerId);
  log(`node ${n.k} removed and stopped`);
}
const live = nodes.slice(REMOVE);
if (REMOVE) {
  await sleep(SETTLE_MS);
  await db.exec('INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)', [randomUUID(), 'type-after-removal', 10]);
  log(`after removal; phone strand connections: ${strand.libp2pNode?.getConnections().length ?? '?'}`);
}
if (REMOVE) for (const id of strandPeers) log(`strand peer ${id.slice(-6)} found in data of nodes: ${holders(id).join(',') || 'none'}`);
if (OFFLINE) { for (const n of live) { n.proc.kill('SIGTERM'); procs.delete(n.peerId); } log('all remaining nodes stopped'); await sleep(5000); }

await phone.stop();
log('phone stopped; restarting');
phone = phoneNode(live.map((n) => n.addr)); // as health: its saved node addresses, reachable or not
const t0 = Date.now();
await phone.start();
log(`phone control node up in ${Date.now() - t0} ms`);
const t1 = Date.now();
try {
  strand = await phone.addStrand(strandConfig(phone, false));
  db = strand.database.getDatabase();
  await db.exec("PRAGMA schema_path = 'app,main'");
  let n = 0;
  for await (const r of db.eval('SELECT count(*) AS n FROM types')) n = r.n;
  log(`RESULT strand reopened in ${Date.now() - t1} ms; types rows: ${n}; strand connections: ${strand.libp2pNode?.getConnections().length ?? '?'}`);
} catch (err) {
  log(`RESULT strand FAILED after ${Date.now() - t1} ms: ${err.message}`);
}
await phone.stop().catch(() => {});
process.exit(0);
