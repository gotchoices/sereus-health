// strand-unconnected-repro.mjs — after a phone-like node claims cadre-cli nodes, does its strand
// ever connect to them, or does it keep committing alone?
//
//   npm i @serfab/cadre-core @serfab/cadre-cli @optimystic/db-p2p @optimystic/db-p2p-storage-fs @libp2p/crypto @libp2p/websockets
//   DEBUG='optimystic:db-p2p:coordinator-repo*' node strand-unconnected-repro.mjs 2> repro.err
//   grep -c commit:solo-cohort repro.err
//
// A phone-like CadreNode (WebSocket only, no listen addresses, as on React Native; strand in offline
// mode with a file journal) founds a strand and writes a row, claims NODES local cadre-cli nodes
// (each reports "Strand started"), then for WAIT_MS writes a row every 10 s and reports the phone
// strand's connection count and each commit's `commitDurability` cohort. With the strand connected
// the cohort is NODES + 1; a cohort of 1 is a commit by the phone alone (the coordinator logs
// `commit:solo-cohort` with `knownAbsent: 0`, so offline mode does not hold it back either).
//
// env: NODES=1  WAIT_MS=120000  CADRE=<cadre-cli bin>
import { mkdtempSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CadreNode, ed25519KeyPairFromLibp2p, encodeNodeClaimPayload, decodeNodeClaimPayload } from '@serfab/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import { FileKVStore } from '@optimystic/db-p2p-storage-fs';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { webSockets } from '@libp2p/websockets';

const HERE = new URL('.', import.meta.url).pathname;
const NODES = Number(process.env.NODES ?? 1);
const WAIT_MS = Number(process.env.WAIT_MS ?? 120000);
const CADRE = process.env.CADRE ?? join(HERE, '..', 'node_modules/.bin/cadre');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t00 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t00) / 1000).toFixed(1).padStart(6)}s]`, ...a);

const identity = await generateKeyPair('Ed25519');
const owner = ed25519KeyPairFromLibp2p(identity);
const strandId = randomUUID();
const storages = new Map();
const journalDir = mkdtempSync(join(tmpdir(), 'unconn-journal-'));
const journals = new Map();
const phone = new CadreNode({
  privateKey: identity,
  controlNetwork: { partyId: randomUUID(), bootstrapNodes: [] },
  profile: 'transaction',
  requireSignedSchemas: false,
  strandFilter: { mode: 'sAppId', sAppId: 'org.example.repro' },
  storage: { provider: (scope) => { if (!storages.has(scope)) storages.set(scope, new MemoryRawStorage()); return storages.get(scope); } },
  network: { listenAddrs: [], transports: [webSockets()], connectionGater: { denyDialMultiaddr: () => false } },
  hibernation: { enabled: false },
  strandOffline: {
    journal: (scope) => { if (!journals.has(scope)) journals.set(scope, new FileKVStore(join(journalDir, scope))); return journals.get(scope); },
    initialMode: 'offline',
  },
});

const procs = [];
process.on('exit', () => { for (const p of procs) p.kill('SIGKILL'); });
async function addNode(k) {
  const dir = mkdtempSync(join(tmpdir(), `unconn-node${k}-`));
  const ws = 46300 + k * 10 + 2, tcp = ws - 1;
  execFileSync(CADRE, ['init', '--dir', dir, '--port', String(tcp), '--ws-port', String(ws)], { stdio: 'ignore' });
  let out = '';
  const p = spawn(CADRE, ['start', '-c', join(dir, 'cadre.yaml'), '--no-health-server'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
  p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
  procs.push(p);
  const waitFor = async (re, ms, what) => { const end = Date.now() + ms; while (!re.test(out)) { if (Date.now() > end) throw new Error(`node ${k}: timed out waiting for ${what}\n${out.slice(-1500)}`); await sleep(250); } };
  await waitFor(/Awaiting claim/, 60000, 'awaiting claim');
  const peerId = readFileSync(join(dir, 'cadre-peer.id'), 'utf8').trim();
  const secret = readFileSync(join(dir, 'claim.secret'), 'utf8').trim();
  await phone.claimNode(decodeNodeClaimPayload(encodeNodeClaimPayload({ peerId, multiaddrs: [`/ip4/127.0.0.1/tcp/${ws}/ws/p2p/${peerId}`], secret })));
  await waitFor(/Strand started/, 180000, 'strand started');
  log(`node ${k} claimed; its strand started (${peerId.slice(-6)})`);
}

let db, strand;
async function write(label) {
  await db.exec('BEGIN');
  await db.exec('INSERT INTO item (id, name) VALUES (?, ?)', [randomUUID(), label]);
  const tx = (await db.get('SELECT StampId() AS tx'))?.tx;
  await db.exec('COMMIT');
  let d;
  for (let i = 0; i < 40 && !(d = strand.database.commitDurability(tx)); i++) await sleep(250);
  const conns = strand.libp2pNode?.getConnections().length ?? '?';
  log(`${label.padEnd(16)} strand connections ${conns}; commit cohort ${d?.report?.durability?.overall?.cohort ?? '(not committed yet)'}, heldElsewhere ${d?.heldElsewhere ?? '-'}`);
}

await phone.start();
await phone.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
await phone.initializeSeedBootstrap(owner.privateKeyB64);
await phone.publishStrand(strandId, 'o');
strand = await phone.addStrand({
  strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: phone.peerId.toString() },
  sAppConfig: { id: 'org.example.repro', version: '1', schema: 'table item (id text primary key, name text);', signature: '' },
  founder: true,
});
db = strand.database.getDatabase();
await db.exec("PRAGMA schema_path = 'app,main'");
await write('solo');
for (let k = 1; k <= NODES; k++) await addNode(k);
for (let t = 0; t <= WAIT_MS; t += 10000) {
  await write(`+${t / 1000}s`);
  await sleep(10000);
}
await phone.stop().catch(() => {});
process.exit(0);
