---
id: taxonomy
name: Taxonomy
description: Types → Categories → Items, plus per-item quantifier definitions.
---

Defines the user-editable catalog used for logging and analysis.

Notes:

- **Bundles** are defined separately (see `bundles.md`) but reference Items from this taxonomy.
- Taxonomy edits that affect historical data follow `rules.md` (rename scope; retire/hide vs hard delete).
- Case sensitivity for name matching/uniqueness is defined in one place: see `rules.md`.

## Entities

### Type (`types`)

Top-level grouping for everything else (e.g., Activity, Condition, Outcome).

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| name | string | no | Unique display name |
| color | string | yes | Optional hex color for UI badges |
| displayOrder | number | yes | Optional ordering hint (lower first) |

#### Relationships

- Type has many Categories
- Type has many Bundles
- Type has many LogEntries

#### Validation / Constraints

- `name` is unique.

---

### Category (`categories`)

Flat list of categories under a Type (MVP: no nesting).

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| typeId | UUID | no | Parent Type |
| name | string | no | Display name (unique within the Type) |

#### Relationships

- Category belongs to Type
- Category has many Items

#### Validation / Constraints

- Unique within Type: `(typeId, name)`

---

### Item (`items`)

Loggable unit (food, exercise, symptom, etc).

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| categoryId | UUID | no | Parent Category |
| name | string | no | Display name (unique within the Category) |
| description | string | yes | Optional note/description |

#### Relationships

- Item belongs to Category
- Item has 0–N QuantifierDefinitions
- Item can appear in many Bundles
- Item can appear in many LogEntries (via LoggedItem)

#### Validation / Constraints

- Unique within Category: `(categoryId, name)`

---

### QuantifierDefinition (`item_quantifiers`)

Defines optional numeric measurements for an Item (e.g., Intensity 1–10, Duration minutes).

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| itemId | UUID | no | Parent Item |
| name | string | no | Label (unique per Item) |
| units | string | yes | Display hint (e.g. “minutes”, “miles”, “1–10”) |
| minValue | number | yes | Optional minimum |
| maxValue | number | yes | Optional maximum |

#### Relationships

- QuantifierDefinition belongs to Item

#### Validation / Constraints

- Unique per Item: `(itemId, name)`
- If both present: `minValue <= maxValue`


