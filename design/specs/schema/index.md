# Schema Index

Shared data model definitions. These specs are used across all targets.

## Entities

| Entity | File | Description | Status |
|--------|------|-------------|--------|
| Item | item.md | Product or service item | draft |
| User | user.md | User account | draft |

## Relationships

Describe relationships between entities:

- User has many Items (ownership)
- Item belongs to Category

## Notes

- Schema is shared across all app targets
- Reference from screen specs: `needs: ["schema:Item"]`
- Keep aligned with API specs

