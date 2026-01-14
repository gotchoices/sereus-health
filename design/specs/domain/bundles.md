---
id: bundles
name: Bundles
description: Named collections of items (and optionally other bundles) for fast logging.
---

Bundles are a user-defined convenience feature. They are **type-specific** (a bundle belongs to exactly one Type).

## Entities

### Bundle (`bundles`)

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| typeId | UUID | no | Type affinity for all members |
| name | string | no | Display name (unique within the Type) |
| description | string | yes | Optional note |

#### Relationships

- Bundle belongs to Type
- Bundle has many BundleMembers

#### Validation / Constraints

- Unique within Type: `(typeId, name)`
- **Type affinity**: every member (item or nested bundle) must be of the same Type as the Bundle.

#### Notes

- Prior implementation stored only `(id, typeId, name)` for bundles; `description` is optional and can be added later without changing semantics.

---

### BundleMember (`bundle_members`)

Represents membership of either an Item or a nested Bundle.

#### Fields

| Field | Type | Nullable | Description |
|------|------|----------|-------------|
| id | UUID | no | Stable identifier |
| bundleId | UUID | no | Owning Bundle |
| memberItemId | UUID | yes | Member Item (set exactly one of memberItemId/memberBundleId) |
| memberBundleId | UUID | yes | Member Bundle (nested) |
| displayOrder | number | yes | Optional semantic order within the bundle |

#### Relationships

- BundleMember belongs to Bundle
- BundleMember references either an Item or a nested Bundle

#### Validation / Constraints

- Exactly one of `memberItemId` / `memberBundleId` is set.
- No self-reference: `memberBundleId != bundleId`.
- No cycles: bundle nesting must not create cycles (enforced by app logic or DB constraints if supported).

#### Notes

- Nested bundles are supported by the model, but app code must explicitly handle them when reading/expanding bundles.


