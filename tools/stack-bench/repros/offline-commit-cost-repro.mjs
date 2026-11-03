// offline-commit-cost-repro.mjs — what offline mode costs a small transaction on one machine, and
// how that grows with the number of transactions waiting in the queue.
//
//   npm i @serfab/cadre-core @optimystic/db-p2p @optimystic/db-p2p-storage-fs @libp2p/crypto @libp2p/websockets
//   MODE=online  node offline-commit-cost-repro.mjs   # baseline
//   MODE=offline node offline-commit-cost-repro.mjs   # back to back: the queue grows
//   MODE=offline WAIT=1 node offline-commit-cost-repro.mjs   # each sent before the next
//   MODE=offline node --cpu-prof offline-commit-cost-repro.mjs
//
// A solo phone-like CadreNode (no other machine), strand journal in a FileKVStore. Each transaction
// inserts one row and three child rows (a table with a secondary index), as Sereus Health saves an
// entry. Prints ms per transaction for each batch of 25, then the average.
// env: MODE=offline|online  N=200  WAIT=0
import { mkdtempSync } from 'node:fs'; import { randomUUID } from 'node:crypto'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { CadreNode, ed25519KeyPairFromLibp2p } from '@serfab/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p'; import { FileKVStore } from '@optimystic/db-p2p-storage-fs';
import { generateKeyPair } from '@libp2p/crypto/keys'; import { webSockets } from '@libp2p/websockets';
const MODE = process.env.MODE ?? 'offline'; const N = Number(process.env.N ?? 200);
const identity = await generateKeyPair('Ed25519'); const owner = ed25519KeyPairFromLibp2p(identity);
const st = new Map(); const jd = mkdtempSync(join(tmpdir(), 'oc-'));
const node = new CadreNode({ privateKey: identity, controlNetwork: { partyId: randomUUID(), bootstrapNodes: [] }, profile: 'transaction', requireSignedSchemas: false,
  storage: { provider: (s) => { if (!st.has(s)) st.set(s, new MemoryRawStorage()); return st.get(s); } },
  network: { listenAddrs: [], transports: [webSockets()] }, hibernation: { enabled: false },
  strandOffline: { journal: (s) => new FileKVStore(join(jd, s)), initialMode: MODE } });
let committed = 0; node.on('strand:offline-status', ({ status }) => { if (status.kind === 'committed') committed++; });
await node.start(); await node.getControlDatabase().ensureOwnerKey(owner.publicKeyB64); await node.initializeSeedBootstrap(owner.privateKeyB64);
const strandId = randomUUID(); await node.publishStrand(strandId, 'o');
const strand = await node.addStrand({ strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: node.peerId.toString() },
  sAppConfig: { id: 'x', version: '1', schema: 'table entry (id text primary key, ts text, note text); table entry_item (entry_id text, item text, primary key (entry_id, item)); index entry_ts on entry (ts);', signature: '' }, founder: true });
const db = strand.database.getDatabase(); await db.exec("PRAGMA schema_path = 'app,main'");
const t0 = performance.now();
const WAIT = process.env.WAIT === '1'; // wait for each transaction to be sent before the next
let tb = performance.now(); const batches = [];
for (let i = 0; i < N; i++) {
  if (i && i % 25 === 0) { batches.push(((performance.now() - tb) / 25).toFixed(0)); tb = performance.now(); }
  const id = randomUUID();
  await db.exec('BEGIN'); await db.exec('INSERT INTO entry (id, ts, note) VALUES (?, ?, ?)', [id, new Date(Date.now() + i).toISOString(), 'n']);
  for (const it of ['a', 'b', 'c']) await db.exec('INSERT INTO entry_item (entry_id, item) VALUES (?, ?)', [id, it]);
  await db.exec('COMMIT');
  if (WAIT && MODE === 'offline') { while (committed < i + 1) await new Promise((r) => setTimeout(r, 5)); }
}
batches.push(((performance.now() - tb) / 25).toFixed(0));
const ack = performance.now() - t0;
if (MODE === 'offline') { while (committed < N) await new Promise((r) => setTimeout(r, 50)); }
const all = performance.now() - t0;
console.log(`ms per transaction by batch of 25: ${batches.join(' ')}`);
console.log(`${MODE}${WAIT ? ' (each sent before the next)' : ''}: ${N} transactions — commits returned ${(ack / N).toFixed(1)} ms each; all sent ${(all / N).toFixed(1)} ms each (${(all / 1000).toFixed(1)} s)`);
await node.stop(); process.exit(0);
