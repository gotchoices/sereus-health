---
id: schema-indexes
name: Schema Indexes
description: Recommended database indexes for Sereus Health data model.
---

## Recommended indexes (performance)

These are small, high-value indexes used in the prior implementation:

- `categories(type_id)`
- `items(category_id)`
- `item_quantifiers(item_id)`
- `bundles(type_id)`
- `bundle_members(bundle_id)`, `bundle_members(item_id)`, `bundle_members(member_bundle_id)`
- `log_entries(timestamp DESC)`, `log_entries(type_id)`
- `log_entry_items(entry_id)`, `log_entry_items(item_id)`, `log_entry_items(source_bundle_id)`
- `log_entry_quantifier_values(entry_id)`

