// divergence-test.mjs — does a control write made while every node is offline leave the cadre's
// control database unable to accept later writes once the nodes return?
//
// 1. A phone-like node (CadreNode, in-memory storage kept across its restart, WebSocket only, no
//    listen addresses) founds a cadre and claims 2 cadre-cli nodes.
// 2. Both nodes stop. The phone restarts alone (bootstrap = the nodes' addresses, as health does),
//    which refreshes its own CadrePeer record while nobody else is reachable.
// 3. Both nodes restart (same directories and ports) and reconnect.
// 4. The phone claims a third node — a CadrePeer insert — and the result is reported.
//
// env: SETTLE_MS=30000  ALONE_MS=30000  CADRE=<cadre-cli bin>  DEBUG=sereus:cadre:control-db,...
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
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 30000);
const ALONE_MS = Number(process.env.ALONE_MS ?? 30000);
// PHONE_RESTART=0: control — the nodes stop and restart but the phone keeps running (no restart, so
// no self-record refresh while it is alone).
const PHONE_RESTART = process.env.PHONE_RESTART !== '0';
// RESTART=both (default: both nodes stop and start together) | one (only node 1) | staggered (both,
// node 2 started 60 s after node 1).
const RESTART = process.env.RESTART ?? 'both';
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
const phoneNode = (bootstrapNodes) => new CadreNode({
  privateKey: identity,
  controlNetwork: { partyId, bootstrapNodes },
  profile: 'transaction',
  requireSignedSchemas: false,
  strandFilter: { mode: 'sAppId', sAppId: 'org.sereus.health' },
  storage: { provider: (scope) => { if (!storages.has(scope)) storages.set(scope, new MemoryRawStorage()); return storages.get(scope); } },
  network: { listenAddrs: [], transports: [webSockets()], connectionGater: { denyDialMultiaddr: () => false } },
  hibernation: { enabled: false },
});
const strandConfig = (node, founder) => ({
  strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: node.peerId.toString() },
  sAppConfig: { id: 'org.sereus.health', version: '1.1', schema: innerDDL, signature: '' },
  founder,
});

// ---- cadre-cli nodes (restartable: same directory and ports) ----
const live = new Set();
process.on('exit', () => { for (const p of live) p.kill('SIGKILL'); });
function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    try { n += e.isDirectory() ? dirSize(f) : statSync(f).size; } catch { /* removed mid-scan */ }
  }
  return n;
}
function startNode(n) {
  n.out = '';
  const p = spawn(CADRE, ['start', '-c', join(n.dir, 'cadre.yaml'), '--health-port', String(n.hp), '--no-health-server'], { cwd: n.dir, stdio: ['ignore', 'pipe', 'pipe'] });
  const tee = (d) => { n.out += d; if (process.env.NODE_LOG) appendFileSync(`${process.env.NODE_LOG}${n.k}.log`, d); };
  p.stdout.on('data', tee); p.stderr.on('data', tee);
  live.add(p); n.proc = p;
  p.on('exit', () => live.delete(p));
}
async function waitFor(n, re, ms, what) {
  const end = Date.now() + ms;
  while (!re.test(n.out)) { if (Date.now() > end) throw new Error(`node ${n.k}: timed out waiting for ${what}\n${n.out.slice(-1500)}`); await sleep(250); }
}
async function stopNode(n) {
  const exited = new Promise((r) => n.proc.once('exit', r));
  n.proc.kill('SIGTERM');
  await Promise.race([exited, sleep(15000)]);
}
async function addNode(phone, k) {
  const n = { k, dir: mkdtempSync(join(tmpdir(), `dv-node${k}-`)), ws: 46200 + k * 10 + 2, hp: 47200 + k };
  execFileSync(CADRE, ['init', '--dir', n.dir, '--port', String(n.ws - 1), '--ws-port', String(n.ws)], { stdio: 'ignore' });
  startNode(n);
  await waitFor(n, /Awaiting claim/, 60000, 'awaiting claim');
  n.peerId = readFileSync(join(n.dir, 'cadre-peer.id'), 'utf8').trim();
  const secret = readFileSync(join(n.dir, 'claim.secret'), 'utf8').trim();
  n.addr = `/ip4/127.0.0.1/tcp/${n.ws}/ws/p2p/${n.peerId}`;
  await phone.claimNode(decodeNodeClaimPayload(encodeNodeClaimPayload({ peerId: n.peerId, multiaddrs: [n.addr], secret })));
  await waitFor(n, /Strand started/, 180000, 'strand started');
  let prev = -1, size = dirSize(join(n.dir, 'data'));
  while (size !== prev) { prev = size; await sleep(5000); size = dirSize(join(n.dir, 'data')); }
  log(`node ${k} claimed and copied  ${n.peerId.slice(-6)}`);
  return n;
}

// ---- run ----
let phone = phoneNode([]);
await phone.start();
await phone.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
await phone.initializeSeedBootstrap(owner.privateKeyB64);
await phone.publishStrand(strandId, 'o');
await phone.addStrand(strandConfig(phone, true));
log(`phone founded the cadre  ${phone.peerId.toString().slice(-6)}`);
const nodes = [await addNode(phone, 1), await addNode(phone, 2)];
await sleep(SETTLE_MS);
log('step 1 done: phone + 2 nodes, settled');

const cycled = RESTART === 'one' ? nodes.slice(0, 1) : nodes;
for (const n of cycled) await stopNode(n);
log(`step 2: stopped node(s) ${cycled.map((n) => n.k).join(',')} (RESTART=${RESTART})`);
if (PHONE_RESTART) {
  await phone.stop();
  phone = phoneNode(nodes.map((n) => n.addr));
  await phone.start();
  await phone.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
  await phone.initializeSeedBootstrap(owner.privateKeyB64);
  await phone.addStrand(strandConfig(phone, false));
  log(`phone restarted alone; waiting ${ALONE_MS} ms (its self-record refresh runs now)`);
} else log(`control: phone keeps running, not restarted; waiting ${ALONE_MS} ms`);
await sleep(ALONE_MS);

for (const n of cycled) {
  startNode(n);
  if (RESTART === 'staggered' && n !== cycled[cycled.length - 1]) { await waitFor(n, /Strand started/, 180000, 'strand started after restart'); await sleep(60000); }
}
for (const n of cycled) await waitFor(n, /Strand started/, 180000, 'strand started after restart');
log(`step 3: both nodes restarted; settling ${SETTLE_MS} ms`);
await sleep(SETTLE_MS);

log(`step 4 (PHONE_RESTART=${PHONE_RESTART ? 1 : 0}): claiming a third node (CadrePeer insert)`);
try {
  const n3 = await addNode(phone, 3);
  log(`RESULT third node added  ${n3.peerId.slice(-6)}`);
} catch (err) {
  log(`RESULT adding the third node FAILED: ${String(err.message).slice(0, 600)}`);
}
for (const n of nodes) log(`node ${n.k} warnings: ${(n.out.match(/⚠.*|✗.*/g) ?? []).slice(-3).join(' | ').slice(0, 300)}`);
await phone.stop().catch(() => {});
process.exit(0);
