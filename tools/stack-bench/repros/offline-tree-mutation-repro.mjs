// offline-tree-mutation-repro.mjs — in offline mode, with a journal whose writes resolve without
// yielding, an autocommit insert fails with "Path is invalid due to mutation of the tree" while the
// queue drains earlier inserts into the same table.
//
//   npm i @serfab/cadre-core@1.19.1 @optimystic/db-p2p@1.20.1 @libp2p/crypto @libp2p/websockets
//   node offline-tree-mutation-repro.mjs            # JOURNAL=pause for the passing control
//
// One phone-like node, no other machines, one table. The journal is a plain in-memory key-value
// store (not MemoryKVStore, which the plugin refuses): `JOURNAL=pause` adds a 1 ms pause per flush.
import { randomUUID } from 'node:crypto';
import { CadreNode, ed25519KeyPairFromLibp2p } from '@serfab/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { webSockets } from '@libp2p/websockets';

const PAUSE = process.env.JOURNAL === 'pause';
const ROWS = Number(process.env.ROWS ?? 300);
// SCHEMA=plain|unique|index|both (default both): which secondary structures the table carries.
const SCHEMAS = {
  plain: 'table item (id text primary key, name text, cat text);',
  unique: 'table item (id text primary key, name text unique, cat text);',
  index: 'table item (id text primary key, name text, cat text); index item_cat on item (cat);',
  both: 'table item (id text primary key, name text unique, cat text); index item_cat on item (cat);',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function journal() {
  const m = new Map();
  return {
    get: async (k) => m.get(k),
    set: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
    list: async (prefix) => [...m.keys()].filter((k) => k.startsWith(prefix)),
    ...(PAUSE ? { flush: () => sleep(1) } : {}),
  };
}

const identity = await generateKeyPair('Ed25519');
const owner = ed25519KeyPairFromLibp2p(identity);
const journals = new Map();
const node = new CadreNode({
  privateKey: identity,
  controlNetwork: { partyId: randomUUID(), bootstrapNodes: [] },
  profile: 'transaction',
  requireSignedSchemas: false,
  storage: { provider: () => new MemoryRawStorage() },
  network: { listenAddrs: [], transports: [webSockets()] },
  hibernation: { enabled: false },
  strandOffline: {
    journal: (scope) => { if (!journals.has(scope)) journals.set(scope, journal()); return journals.get(scope); },
    initialMode: 'offline',
  },
});
await node.start();
await node.getControlDatabase().ensureOwnerKey(owner.publicKeyB64);
await node.initializeSeedBootstrap(owner.privateKeyB64);
const strandId = randomUUID();
await node.publishStrand(strandId, 'o');
const strand = await node.addStrand({
  strandRow: { Id: strandId, MemberPrivateKey: null, Type: 'o', FounderOwnerKey: owner.publicKeyB64, FounderPeerId: node.peerId.toString() },
  sAppConfig: { id: 'org.example.repro', version: '1', schema: SCHEMAS[process.env.SCHEMA ?? 'both'], signature: '' },
  founder: true,
});
const db = strand.database.getDatabase();
await db.exec("PRAGMA schema_path = 'app,main'");

let inserted = 0;
try {
  for (; inserted < ROWS; inserted++) {
    await db.exec('INSERT INTO item (id, name, cat) VALUES (?, ?, ?)', [randomUUID(), `item ${inserted}`, `cat ${inserted % 7}`]);
  }
  console.log(`RESULT: ${ROWS} autocommit inserts succeeded (JOURNAL=${PAUSE ? 'pause' : 'immediate'}, SCHEMA=${process.env.SCHEMA ?? 'both'})`);
} catch (err) {
  console.log(`RESULT: insert ${inserted + 1} of ${ROWS} FAILED (JOURNAL=${PAUSE ? 'pause' : 'immediate'}, SCHEMA=${process.env.SCHEMA ?? 'both'}): ${err.message}`);
  console.log(`  cause: ${err.cause?.message ?? '(none)'}`);
  console.log(`  queue: ${JSON.stringify(strand.database.offline?.queueState?.() ?? {})}`.slice(0, 300));
}
await node.stop().catch(() => {});
process.exit(0);
