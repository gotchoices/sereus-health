# Stack workarounds

Code in health that exists only because the Sereus stack (cadre-core, cadre-rn, optimystic,
quereus) does not yet do something well enough. Each entry should be **backed out** once the
stack catches up: health should be written the way we would naturally write it, with
optimization in the backend.

Every workaround is marked in the code with `STACK-WORKAROUND(Wn)`, so
`grep -rna "STACK-WORKAROUND" apps/mobile/src apps/mobile/App.tsx` finds them all (`-a`: `src/db/catalog.ts` holds a literal NUL, so grep would skip it as binary).
When a stack release lands, check each entry's **Back out when** and **Check** lines.

| ID | Workaround | Waiting on | Where |
|---|---|---|---|
| W1 | Single-table count queries, filtered in JS, instead of joins | optimystic#44, optimystic#45 | `src/db/stats.ts`, `src/db/catalog.ts` |
| W2 | Time-boxed control-DB reads + last-known snapshot on Sereus Connections | consistent control reads that block on a solo or reconnecting cohort | `src/data/sereusConnections.ts` |
| W3 | Startup renders without waiting for the DB (catalog flag + 20 s cap) | strand open that is fast and never hangs | `App.tsx` |
| W4 | Local TextDecoder `{ fatal: true }` polyfill | cadre-rn polyfills covering RN 0.82's native TextDecoder | `src/polyfills/textdecoder-fatal.js` |
| W5 | Time-boxed control operations (genesis, publish, claim, remove) | control writes/reads that cannot wedge | `src/services/CadreService.ts`, `src/services/cadreAsync.ts` |
| W6 | App-side journal + replay of background log-entry saves | optimystic offline mode (journal, `entries()`, `onStatus`) exposed by cadre for strand databases | `src/sync/pendingChanges.ts` |

## W1 — Single-table count queries instead of joins

**What.** `getItemsForType` (`src/db/stats.ts`) and `getCategoriesWithCounts` (`src/db/catalog.ts`)
read one table per query (`SELECT … GROUP BY` on `log_entry_items` or `items`; categories and
items separately) and filter by Type in JS. The natural form joins `log_entry_items ⋈ items ⋈
categories WHERE c.type_id = ?`.

**Why.** On optimystic tables a join with a filter on the inner table plans as a nested loop, one
primary-key block read per outer row, ignoring the `type_id` secondary indexes; memory tables get a
hash join and an index seek for the same SQL. And each block read re-assembles its serving cohort
from the libp2p peerStore, so reads get slower with every connected cadre node. On the real backup
(172 items, 177 entries) the joined usage count took 126 ms solo and 325–1,600 ms with two nodes in
Node.js (seconds on a phone); the single-table form takes 2–9 ms either way.

**Upstream.** [optimystic#44](https://github.com/gotchoices/Optimystic/issues/44) (joins plan as nested
loops, secondary indexes unused) and [optimystic#45](https://github.com/gotchoices/Optimystic/issues/45)
(every block read re-assembles its serving cohort; a cache removes the per-node penalty).

**Back out when** the original joined SQL runs within about 2× of the rewrites, solo and with
2–3 nodes.

**Check.** `cd tmp/query-perf && SYNTH=1 MODES=memory,strand NODES=2 WRITES=0 node query-perf.mjs`
(needs a cadre-cli path in `CADRE`). The table lists the original queries next to the `REWRITE`
ones. The original SQL is also in that harness's `QUERIES`.

## W2 — Time-boxed control reads and a last-known snapshot (Sereus Connections)

**What.** `readControlRows` gives up after 5 s; the screen shows the last completed list of owner
keys and machines (memory + AsyncStorage) and never lets a read that gave up shrink it.

**Why.** `OwnerKey` / `CadrePeer` reads are consistent reads that need the control cohort; on a
solo node, or while the cohort reconnects after a relaunch or a return from background, they can
block, and the list would drop to "This device" only.

**Back out when** control reads of locally held rows return promptly regardless of cohort state
(local-first reads of the control DB). Keep the instant first render from the snapshot if it is
still wanted for UX; drop the time-box and the "gave up" fallback.

**Check.** On the emulator with nodes paused or down, open Sereus Connections with `HEALTH_PERF=1`:
no `[control] … !gaveup` lines and reads under ~100 ms.

## W3 — Startup does not wait for the database

**What.** After the first catalog import, `App.tsx` renders at once (`@health/catalogSetUp`) and each
screen shows its own loading state; a 20 s cap renders anyway if the DB never answers.

**Why.** Opening the health strand took 18–21 s on 1.14 (strand catalog hydration waiting on
unreachable peers, optimystic#34, fixed in 1.13) and once hung indefinitely (optimystic#8 / sereus#8).

**Back out when** the strand opens in well under a second on a phone with nodes up, down or
restarted. The cap is cheap insurance and may stay.

**Check.** `[startup] rendering the app (database ready)` within ~1 s of `Running "mobile"` on a
cold launch with nodes in each state.

## W4 — TextDecoder `{ fatal: true }` polyfill

**What.** `src/polyfills/textdecoder-fatal.js`, imported in `index.js` after the kit's polyfills.

**Why.** React Native 0.82's native TextDecoder rejects `{ fatal: true }`, which the stack passes;
cadre-rn's polyfills do not cover it.

**Back out when** `@serfab/cadre-rn/polyfills` handles it (its boot check lists TextDecoder as
covered for `fatal`).

**Check.** Remove the import; the app boots and `[cadre-rn] polyfill audit` reports no TextDecoder gap.

## W5 — Time-boxed control operations

**What.** `withTimeout(…, CONTROL_OP_TIMEOUT_MS / AUTHORITY_GENESIS_TIMEOUT_MS / CLAIM_TIMEOUT_MS)`
around owner genesis, `publishStrand`, `addDrone`, `deliverSeed`, `removeMachine`, and
`retryAfterRestart` around publishes right after a restart.

**Why.** Control operations have hung on a solo node, and the first writes after a lone restart fail
with "Failed to get super-majority" until the cohort reconnects (sereus 1.9 notes).

**Back out when** control operations either complete or fail promptly on their own, with a typed
error, in every cohort state.

**Check.** Exercise claim / remove / publish with nodes up, down and paused; none should need the
app-side timeout to return.

## W6 — App-side journal for background saves

**What.** `src/sync/pendingChanges.ts` journals each background log-entry save to AsyncStorage
before the editor closes, replays journaled saves that never committed at the next start, and
follows each commit's durability (`commitDurability`, `strand:commit-held`) to drive the sync
markers.

**Why.** Saves now run in the background so the UI never waits on a slow commit, but until the
stack queues them itself, a save that is still running when the app is killed would be lost. And
cadre-core keeps a commit's durability only in memory, so a change written but not yet held
elsewhere loses its "on this device only" marker on restart.

**Back out when** cadre exposes optimystic's offline mode for strand databases (optimystic 1.20:
`plugin.offline` with a `journal`, `entries()`, `onStatus`, `outcomes()`). Then: enter offline mode,
drop the AsyncStorage journal and replay, and drive the store from `onStatus` / `entries()` — the
write lane, the History overlay and the UI stay as they are.

**Check.** Save an entry with nodes unreachable, kill the app, restart: the entry is present and
still marked until a node returns, with no app-side journal involved.

## Not workarounds, but adoption debt

Places where health builds its own version of something the kit now provides; they are not waiting
on the stack, just on us.

- **Owner key derived from the node identity.** cadre-core 1.17 dropped `getIdentityOwnerKey`; the kits
  now keep a separate owner key in a key-store slot (`cadre-core/edge-node`). Health derives the same
  key itself with `ed25519KeyPairFromLibp2p`.
- **Hand-built node config instead of `createPhoneNode`.** Health assembles transports, the permissive
  dial gater, stores and bring-up itself (`CadreService.doStart`); the kit's phone node does all of
  it, including the separate owner key above.
- **Manual `usesCleartextTraffic="true"`.** cadre-rn's Expo config plugin sets it; a bare React Native
  app sets it by hand.
