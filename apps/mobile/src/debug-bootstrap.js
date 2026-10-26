// Bootstrap debug logging for sereus/optimystic/fret.
// This must be the first import in index.js so process.env.DEBUG is set
// before any 'debug' package instance initializes.
// React Native / Hermes lacks localStorage, so the debug package falls
// back to process.env.DEBUG.  (@serfab/cadre-rn's polyfills set a DEBUG
// default only when nothing is set, so a value chosen here wins.)
if (!globalThis.process) globalThis.process = {};
if (!globalThis.process.env) globalThis.process.env = {};

// Off by default.  For a DRONE PAIRING capture, uncomment this line: it shows
// the inside of addDrone / deliverSeed / control-cohort reconcile and the
// libp2p dials, alongside the app's own `[CadreService] [pairing] …` line.
// Then: adb -s <device> logcat -v time | grep -E "ReactNativeJS"
//globalThis.process.env.DEBUG = 'sereus:cadre:*,optimystic:db-p2p:*';

// Query timing (src/db/perf.ts): logs `[perf] sql …` per query and `[perf] screen …` per
// screen change.  Uncomment for a timing run (scripts/perf/screen-timings.sh).
globalThis.process.env.HEALTH_PERF = '1'; // TEMP: S7 timing run
