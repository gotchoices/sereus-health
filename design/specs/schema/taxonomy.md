---
id: taxonomy
name: Taxonomy
description: Types → Categories → Items, plus per-item quantifier definitions.
---

Defines the user-editable catalog used for logging and analysis.

## Entities

### Type (`types`)

Top-level grouping for everything else (e.g., Activity, Condition, Outcome).

#### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | yes | Stable identifier |
| name | string | yes | Unique display name |
| color | string | no | Optional hex color for UI badges |
| displayOrder | number | no | Optional ordering hint (lower first) |

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

| Field | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | yes | Stable identifier |
| typeId | UUID | yes | Parent Type |
| name | string | yes | Display name (unique within the Type) |

#### Relationships

- Category belongs to Type
- Category has many Items

#### Validation / Constraints

- Unique within Type: `(typeId, name)`

---

### Item (`items`)

Loggable unit (food, exercise, symptom, etc).

#### Fields

| Field | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | yes | Stable identifier |
| categoryId | UUID | yes | Parent Category |
| name | string | yes | Display name (unique within the Category) |
| description | string | no | Optional note/description |

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

| Field | Type | Required | Description |
|------|------|----------|-------------|
| id | UUID | yes | Stable identifier |
| itemId | UUID | yes | Parent Item |
| name | string | yes | Label (unique per Item) |
| units | string | no | Display hint (e.g. “minutes”, “miles”, “1–10”) |
| minValue | number | no | Optional minimum |
| maxValue | number | no | Optional maximum |

#### Relationships

- QuantifierDefinition belongs to Item

#### Validation / Constraints

- Unique per Item: `(itemId, name)`
- If both present: `minValue <= maxValue`


