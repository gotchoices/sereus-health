# Sereus Health — web

The public site for Sereus Health, served at **https://sereus.org/health/**. Two jobs:

1. **Learn** about Sereus Health (the landing page).
2. **Download starter catalogs** to import in the app.

## Contents

| Path | What |
|------|------|
| `index.html`, `styles.css` | The landing page |
| `images/logo.svg` | Logo (copied from `../docs/images/`) |
| `catalogs/*.yaml` | Canonical starter catalogs (Minimal / Small / Medium / Large) |
| `build-catalogs.js` | Regenerates `catalogs/*.yaml` from `../design/specs/domain/catalog/` sources |
| `server.sh` | Local preview (`./server.sh` → http://localhost:8080) |
| `publish.sh` | Deploy to `sereus.org/health` via rsync |

## Catalogs

The `catalogs/*.yaml` files are **generated**, not hand-edited. They are built from
the source data in [`../design/specs/domain/catalog/`](../design/specs/domain/catalog/):

- `categories.yaml` → the type/category structure (shared by every catalog)
- `food_list_{250,500,1000}.csv` → food items under the **Eating** category

To regenerate after changing a source list:

```bash
node build-catalogs.js
```

They use the canonical catalog format defined in
[`../design/specs/domain/import-export.md`](../design/specs/domain/import-export.md)
(name-referenced types/categories/items), so the app importer and any hand-authored
catalog share one contract.

## Preview locally

```bash
./server.sh          # http://localhost:8080
```

## Publish

```bash
./publish.sh                       # → root@gotchoices.org:/var/www/sereus.org/health
./publish.sh user@host /some/path  # override target
```

`publish.sh` regenerates the catalogs, then rsyncs the site (excluding the scripts and
this README). Requires ssh access to the host that serves `sereus.org`.
