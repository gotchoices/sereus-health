#!/usr/bin/env node
/*
 * Regenerate the canonical Sereus Health starter catalogs (web/catalogs/*.yaml)
 * from the in-repo sources under design/specs/domain/catalog/:
 *   - categories.yaml     → types + categories (structure)
 *   - food_list_*.csv      → food items placed under the "Eating" category
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

function foodsFrom(csvFile) {
  const [, ...body] = parseCsv(fs.readFileSync(path.join(CATALOG_SRC, csvFile), 'utf8'));
  return body
    .filter((r) => (r[0] || '').trim().length)
    .map((r) => {
      const item = { categoryName: 'Eating', name: r[0].trim() };
      const desc = (r[1] || '').trim();
      if (desc) item.description = desc;
      return item;
    });
}

function build(meta, foods) {
  const catalog = { types: structure.types, categories: structure.categories };
  if (foods && foods.length) catalog.items = foods;
  const doc = { version: 1, name: meta.name, description: meta.description, catalog };
  const body = yaml.dump(doc, { lineWidth: -1, noRefs: true });
  return `# Sereus Health canonical starter catalog — import via the app or share freely.\n# Format: design/specs/domain/import-export.md\n${body}`;
}

const catalogs = [
  { file: 'starter-minimal.yaml', name: 'Minimal', description: 'Types and categories only — a blank frame to build your own.', foods: null },
  { file: 'starter-small.yaml',   name: 'Small',   description: 'Common categories plus ~250 everyday foods.', foods: foodsFrom('food_list_250.csv') },
  { file: 'starter-medium.yaml',  name: 'Medium',  description: 'Common categories plus ~500 foods.', foods: foodsFrom('food_list_500.csv') },
  { file: 'starter-large.yaml',   name: 'Large',   description: 'Common categories plus ~1000 foods.', foods: foodsFrom('food_list_1000.csv') },
];

for (const c of catalogs) {
  fs.writeFileSync(path.join(OUT_DIR, c.file), build(c, c.foods));
  console.log(`  ${c.file.padEnd(22)} ${c.foods ? c.foods.length : 0} items`);
}
console.log('Catalogs written to web/catalogs/');
