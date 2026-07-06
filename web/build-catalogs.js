#!/usr/bin/env node
/*
 * Regenerate the canonical Sereus Health starter catalogs (web/catalogs/*.yaml)
 * from the in-repo sources under design/specs/domain/catalog/:
 *   - categories.yaml  → types + categories (structure)
 *   - seed-items.yaml   → non-food items (Routine, Exercise, Medication,
 *                         Condition, Outcome) with quantifiers
 *   - foods.csv         → curated common foods (natural names), ordered by
 *                         commonality; placed under the "Eating" category
 *
 * Tiers nest: small ⊂ medium ⊂ large (food slices of the one ordered list).
 * "minimal" is a blank frame (structure only — no items).
 *
 * Run from anywhere:  node web/build-catalogs.js
 * (uses js-yaml from apps/mobile/node_modules)
 */
const fs = require('fs');
const path = require('path');

const HEALTH_ROOT = path.resolve(__dirname, '..');
const CATALOG_SRC = path.join(HEALTH_ROOT, 'design/specs/domain/catalog');
const OUT_DIR = path.join(__dirname, 'catalogs');
const yaml = require(path.join(HEALTH_ROOT, 'apps/mobile/node_modules/js-yaml'));

fs.mkdirSync(OUT_DIR, { recursive: true });

const structure = yaml.load(fs.readFileSync(path.join(CATALOG_SRC, 'categories.yaml'), 'utf8')).catalog;
const seedItems = yaml.load(fs.readFileSync(path.join(CATALOG_SRC, 'seed-items.yaml'), 'utf8')).items || [];

// CSV parser that honors quoted fields with internal commas.
function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// All curated foods, in file (commonality) order, as catalog items under "Eating".
function allFoods() {
  const [, ...body] = parseCsv(fs.readFileSync(path.join(CATALOG_SRC, 'foods.csv'), 'utf8'));
  return body
    .filter((r) => (r[0] || '').trim().length)
    .map((r) => ({ categoryName: 'Eating', name: r[0].trim() }));
}
const FOODS = allFoods();

function build(meta, items) {
  const catalog = { types: structure.types, categories: structure.categories };
  if (items && items.length) catalog.items = items;
  const doc = { version: 1, name: meta.name, description: meta.description, catalog };
  const body = yaml.dump(doc, { lineWidth: -1, noRefs: true });
  return `# Sereus Health canonical starter catalog — import via the app or share freely.\n# Format: design/specs/domain/import-export.md\n${body}`;
}

// minimal = blank frame; small/medium/large = seed items + a nesting food slice.
const catalogs = [
  { file: 'starter-minimal.yaml', name: 'Minimal', description: 'Types and categories only — a blank frame to build your own.', items: null },
  { file: 'starter-small.yaml',   name: 'Small',   description: 'Everyday categories, routines & outcomes, plus ~50 staple foods.', items: [...seedItems, ...FOODS.slice(0, 50)] },
  { file: 'starter-medium.yaml',  name: 'Medium',  description: 'Everyday categories, routines & outcomes, plus ~150 common foods.', items: [...seedItems, ...FOODS.slice(0, 150)] },
  { file: 'starter-large.yaml',   name: 'Large',   description: 'Everyday categories, routines & outcomes, plus the full common-food list.', items: [...seedItems, ...FOODS] },
];

const index = [];
for (const c of catalogs) {
  const body = build(c, c.items);
  fs.writeFileSync(path.join(OUT_DIR, c.file), body);
  index.push({
    id: c.file.replace(/^starter-|\.yaml$/g, ''),
    name: c.name,
    description: c.description,
    file: c.file,
    types: structure.types.length,
    categories: structure.categories.length,
    items: c.items ? c.items.length : 0,
    bytes: Buffer.byteLength(body),
  });
  console.log(`  ${c.file.padEnd(22)} ${c.items ? c.items.length : 0} items`);
}
// Machine-readable index so the app can browse catalogs (story 01-exploring).
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ version: 1, catalogs: index }, null, 2) + '\n');
console.log('Catalogs + index.json written to web/catalogs/');
