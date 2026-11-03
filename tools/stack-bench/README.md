# stack-bench

Node-only measurements of the Sereus stack (cadre-core, optimystic, quereus) under Sereus Health's
schema and workload — health's counterpart to chat's CLI for stack performance. It does **not** run
health's app code (which is React Native); it runs a phone-like `CadreNode` with health's canonical
schema (`design/specs/domain/schema.qsql`), health's save transaction and health's slowest queries,
against real `cadre-cli` nodes on this machine.

Use it to find causes and compare stack versions. Absolute numbers differ from a phone (Node on a Mac
is roughly 30× faster than Hermes on a Galaxy S7 for this work); confirm phone behavior on a device.

```
npm install
SYNTH=1 node bench.mjs                      # synthetic data shaped like a real health dataset
node bench.mjs <health-backup.yaml>         # or a real backup
```

## bench.mjs

Loads the data, then times writes (one log entry + 3 items, health's save) and queries at each step:
solo, then with each added cadre-cli node. Writes are synchronous by default (the commit waits for
the cadre), like chat's CLI.

| Env | Effect |
|---|---|
| `SYNTH=1` | synthetic data instead of a backup file |
| `MODES=memory,strand` | which backends to time (plain Quereus memory tables, and the strand) |
| `RUNS=3` | runs per write / query |
| `NODES=k` | claim k local cadre-cli nodes, timing after each (`CADRE=<bin>` to use another cadre-cli) |
| `SETTLE_MS=15000` | wait after each node joins (90000 for a connected strand) |
| `LATENCY_MS=n` | TCP proxy delaying every phone dial by n ms round trip |
| `STORAGE_DELAY_MS=n` | slow-storage model |
| `WRITES=0` / `QUERIES=0` | skip writes / queries |
| `PLAN='<query>\|…'`, `PLAN_EACH=1` | print query plans (after loading; `PLAN_EACH` at every step) |
| `PROFILE='<query>'` | CPU-profile a query |
| `WRITE_TRACE=1` / `QUERY_TRACE=1` | markers for `trace-writes.mjs` / `trace-queries.mjs` (with `DEBUG=optimystic:db-p2p:protocol-client`) |
| `IDLE_MS`, `IDLE_PROFILE`, `POSTQ_MS` | idle / after-query background load |
| `REPL_CHECK=1` | check replication of a marker row to each node |
| `OFFLINE=1` | the phone's strand in **offline mode**, as health runs it: writes then report `ack` (save returned), `sent` (the cadre committed it) and `held` (every member holds it); `SYNC_WAIT_MS` bounds the wait |
| `WRITE_GAP_MS=n` | pause between timed writes; with `OFFLINE=1` each one's sync is then timed alone, not behind the writes queued ahead of it |
| `DOWN_WRITE=1` | with `OFFLINE=1` and `NODES`: at the end, stop every node and write once more, reporting the queue statuses and durability (offline mode should keep it queued); `DOWN_MS`, `DOWN_WATCH_MS` |
| `JOURNAL=file\|mem\|mem-pause` | offline journal: a file store (default, what a Node host uses), or diagnostic in-memory variants (`mem` never yields; `mem-pause` pauses 1 ms per flush) |

## Other scripts

- `trace-writes.mjs <stderr-log>` — per traced write: requests by protocol and peer, wall time, peak in flight.
- `trace-queries.mjs <stderr-log> [query]` — per traced query run: transactor gets and remote requests.
- `callers.mjs` — calling-module chains in a CPU profile.
- `restart-test.mjs` — does a phone-like node reopen its strand after a restart (nodes up / offline / one removed)?
- `divergence-test.mjs` — control-database writes after nodes restart (sereus#53 scenarios).
- `repros/strand-unconnected-repro.mjs` — after a claim, how long the phone's strand stays unconnected to its nodes (committing alone, cohort 1).
- `repros/control-fork-repro.mjs` — minimal repro for sereus#53 (two nodes starting together fork `CadrePeer`).

Outputs (`*.log`, `*.out`, `*.err`, `*.cpuprofile`) are scratch; don't commit them.
