---
id: domain-index
name: Domain Index
description: Shared domain contract for Sereus Health (all targets).
---

This folder contains the shared domain contract: data model, operations, rules, and interfaces.

## Files

| Area | File | What it covers |
|------|------|----------------|
| **Schema** | `schema.qsql` | **Canonical Quereus schema (executable, hash-enforced for cohort consistency)** |
| Taxonomy | `taxonomy.md` | Types → Categories → Items + item quantifiers (human-readable documentation) |
| Bundles | `bundles.md` | Bundles and membership rules (human-readable documentation) |
| Logging | `logging.md` | Log entries, logged items, quantifier values; bundle expansion semantics (human-readable documentation) |
| Rules | `rules.md` | Cross-cutting invariants, constraints, and seed expectations |
| Indexes | `schema-indexes.md` | Recommended database indexes for performance |
| Import/Export | `import-export.md` | Cross-app data portability contract (canonical YAML/JSON import; CSV export for logs) |

**Note:** `schema.qsql` is the authoritative executable schema definition. The markdown files (`taxonomy.md`, `bundles.md`, `logging.md`) provide human-readable documentation explaining the semantics and design decisions.

