// control-fork-repro.mjs — two cadre nodes that start at the same moment each commit their own
// CadrePeer refresh while alone, forking the CadrePeer block; afterwards every write to it is
// rejected (content-digest-mismatch) and a multi-collection write tears.
//
//   npm i @serfab/cadre-core@1.19.0 @serfab/cadre-cli@1.19.0 @optimystic/db-p2p@1.19.0 @libp2p/crypto @libp2p/websockets
//   node control-fork-repro.mjs                 # RESTART=staggered for the passing control
import { readFileSync, mkdtempSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CadreNode, ed25519KeyPairFromLibp2p, encodeNodeClaimPayload, decodeNodeClaimPayload } from '@serfab/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { webSockets } from '@libp2p/websockets';

const CADRE = join(new URL('.', import.meta.url).pathname, 'node_modules/.bin/cadre');
const STAGGER = process.env.RESTART === 'staggered';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

// A phone-like owner node: in-memory storage, WebSocket only, no listen addresses.
const identity = await generateKeyPair('Ed25519');
const owner = ed25519KeyPairFromLibp2p(identity);
const phone = new CadreNode({
  privateKey: identity,
  controlNetwork: { partyId: randomUUID(), bootstrapNodes: [] },
  profile: 'transaction',
  requireSignedSchemas: false,
  storage: { provider: () => new MemoryRawStorage() },
  network: { listenAddrs: [], transports: [webSockets()], connectionGater: { denyDialMultiaddr: () => false } },
  hibernation: { enabled: false },
});
await phone.start();
await phone.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
await phone.initializeSeedBootstrap(owner.privateKeyB64);
const strandId = randomUUID();
await phone.publishStrand(strandId, 'o');
await phone.addStrand({
  strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: phone.peerId.toString() },
  sAppConfig: { id: 'org.example.repro', version: '1', schema: 'table t (id text primary key);', signature: '' },
  founder: true,
});

const procs = new Set();
process.on('exit', () => { for (const p of procs) p.kill('SIGKILL'); });
function start(n) {
  n.out = '';
  n.proc = spawn(CADRE, ['start', '-c', join(n.dir, 'cadre.yaml'), '--health-port', String(n.hp), '--no-health-server'], { cwd: n.dir, stdio: ['ignore', 'pipe', 'pipe'] });
  n.proc.stdout.on('data', (d) => { n.out += d; }); n.proc.stderr.on('data', (d) => { n.out += d; });
  procs.add(n.proc); n.proc.on('exit', () => procs.delete(n.proc));
}
async function waitFor(n, re, ms = 180000) {
  const end = Date.now() + ms;
  while (!re.test(n.out)) { if (Date.now() > end) throw new Error(`node ${n.k}: no ${re} in time`); await sleep(250); }
}
async function stop(n) { const gone = new Promise((r) => n.proc.once('exit', r)); n.proc.kill('SIGTERM'); await gone; }
async function claim(k) {
  const n = { k, dir: mkdtempSync(join(tmpdir(), `fork-node${k}-`)), ws: 46300 + k * 10 + 2, hp: 47300 + k };
  execFileSync(CADRE, ['init', '--dir', n.dir, '--port', String(n.ws - 1), '--ws-port', String(n.ws)], { stdio: 'ignore' });
  start(n);
  await waitFor(n, /Awaiting claim/);
  const peerId = readFileSync(join(n.dir, 'cadre-peer.id'), 'utf8').trim();
  const secret = readFileSync(join(n.dir, 'claim.secret'), 'utf8').trim();
  const multiaddrs = [`/ip4/127.0.0.1/tcp/${n.ws}/ws/p2p/${peerId}`];
  await phone.claimNode(decodeNodeClaimPayload(encodeNodeClaimPayload({ peerId, multiaddrs, secret })));
  await waitFor(n, /Strand started/);
  log(`node ${k} joined (${peerId.slice(-6)})`);
  return n;
}

const a = await claim(1);
const b = await claim(2);
await sleep(30000);

log(`stopping both nodes, then starting them ${STAGGER ? '60 s apart' : 'together'}`);
await stop(a); await stop(b);
start(a);
if (STAGGER) { await waitFor(a, /Strand started/); await sleep(60000); }
start(b);
await waitFor(a, /Strand started/); await waitFor(b, /Strand started/);
await sleep(60000);

log('adding a third node (a CadrePeer insert)');
try {
  await claim(3);
  log('RESULT: third node added');
} catch (err) {
  log(`RESULT: FAILED — ${String(err.message).slice(0, 400)}`);
}
for (const n of [a, b]) log(`node ${n.k}: ${(n.out.match(/⚠ Control write abandoned.*/) ?? ['(no abandoned control write)'])[0].slice(0, 260)}`);
process.exit(0);
