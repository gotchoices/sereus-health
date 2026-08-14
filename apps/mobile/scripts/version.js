#!/usr/bin/env node
/**
 * App versioning — single source of truth is `version.json` at the app root:
 *   { "version": "1.2.3", "build": 42 }
 *
 *   • version : marketing/user-facing semver (iOS MARKETING_VERSION = Android versionName)
 *   • build   : monotonic integer, must increase per store upload
 *               (iOS CURRENT_PROJECT_VERSION = Android versionCode)
 *
 * Android reads version.json live at Gradle configure time. iOS build settings
 * can't read an external file, so this script stamps them into the pbxproj (and
 * keeps package.json's version in sync). Run it as the ONLY way to change versions.
 *
 * Usage (via yarn scripts):
 *   yarn version:show
 *   yarn version:bump [major|minor|patch]   # default: patch; also bumps build
 *   yarn version:build                       # increment build only
 *   node scripts/version.js set <version> [build]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VERSION_JSON = path.join(ROOT, 'version.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const PBXPROJ = path.join(ROOT, 'ios', 'mobile.xcodeproj', 'project.pbxproj');

function readVersion() {
  const v = JSON.parse(fs.readFileSync(VERSION_JSON, 'utf8'));
  if (typeof v.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(v.version)) {
    throw new Error(`version.json "version" must be semver (x.y.z), got: ${v.version}`);
  }
  if (!Number.isInteger(v.build) || v.build < 1) {
    throw new Error(`version.json "build" must be a positive integer, got: ${v.build}`);
  }
  return v;
}

function writeVersion(v) {
  fs.writeFileSync(VERSION_JSON, JSON.stringify(v, null, 2) + '\n');
}

/** Propagate version.json into package.json + iOS pbxproj (Android reads it live). */
function sync(v) {
  // package.json version (marketing only)
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  pkg.version = v.version;
  fs.writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');

  // iOS pbxproj: all Debug + Release occurrences
  let pbx = fs.readFileSync(PBXPROJ, 'utf8');
  pbx = pbx.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${v.version};`);
  pbx = pbx.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${v.build};`);
  fs.writeFileSync(PBXPROJ, pbx);
}

function pbxVersions() {
  const pbx = fs.readFileSync(PBXPROJ, 'utf8');
  const mk = [...pbx.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1]);
  const cp = [...pbx.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) => m[1]);
  return { marketing: [...new Set(mk)], build: [...new Set(cp)] };
}

function show() {
  const v = readVersion();
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const pbx = pbxVersions();
  console.log(`version.json (source of truth):  ${v.version} (build ${v.build})`);
  console.log(`  package.json version:          ${pkg.version}${pkg.version === v.version ? '' : '   ⚠ DRIFT'}`);
  console.log(`  iOS MARKETING_VERSION:         ${pbx.marketing.join(', ')}${pbx.marketing.every((x) => x === v.version) ? '' : '   ⚠ DRIFT'}`);
  console.log(`  iOS CURRENT_PROJECT_VERSION:   ${pbx.build.join(', ')}${pbx.build.every((x) => x === String(v.build)) ? '' : '   ⚠ DRIFT'}`);
  console.log(`  Android versionName/Code:      reads version.json live (${v.version} / ${v.build})`);
  const drift =
    pkg.version !== v.version ||
    !pbx.marketing.every((x) => x === v.version) ||
    !pbx.build.every((x) => x === String(v.build));
  if (drift) console.log(`\nRun "yarn version:build" or "yarn version:bump" (or "node scripts/version.js set ${v.version} ${v.build}") to re-sync.`);
}

function bump(kind) {
  const v = readVersion();
  let [maj, min, pat] = v.version.split('.').map(Number);
  if (kind === 'major') { maj++; min = 0; pat = 0; }
  else if (kind === 'minor') { min++; pat = 0; }
  else { pat++; } // patch (default)
  v.version = `${maj}.${min}.${pat}`;
  v.build += 1; // a new marketing version is also a new build
  writeVersion(v);
  sync(v);
  console.log(`Bumped to ${v.version} (build ${v.build}).`);
}

function buildOnly() {
  const v = readVersion();
  v.build += 1;
  writeVersion(v);
  sync(v);
  console.log(`Build number → ${v.build} (version ${v.version}).`);
}

function setExplicit(version, build) {
  const v = readVersion();
  if (version) v.version = version;
  if (build != null) v.build = Number(build);
  else v.build += 1;
  // validate via write/read round-trip
  writeVersion(v);
  readVersion();
  sync(v);
  console.log(`Set to ${v.version} (build ${v.build}).`);
}

const [cmd, arg1, arg2] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'show': case undefined: show(); break;
    case 'bump': bump(arg1 || 'patch'); break;
    case 'build': buildOnly(); break;
    case 'set': setExplicit(arg1, arg2); break;
    default:
      console.error(`Unknown command: ${cmd}\nUse: show | bump [major|minor|patch] | build | set <version> [build]`);
      process.exit(2);
  }
} catch (e) {
  console.error('version.js error:', e.message);
  process.exit(1);
}
