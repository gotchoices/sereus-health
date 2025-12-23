# Screens Plan

List of screens for this target with routes and status.

## Instructions

- List each screen with a clear, stable name
- Add the route name (PascalCase, used for navigation and deep links)
- Spec file uses kebab-case (`item-list.md` for route `ItemList`)
- Note variants to support (happy, empty, error)

## Screens

| Screen Name | Route | Spec File | Variants | Status |
|-------------|-------|-----------|----------|--------|
| Item List | ItemList | item-list.md | happy, empty, error | draft |
| Item Detail | ItemDetail | item-detail.md | happy, error | draft |
| User Profile | UserProfile | user-profile.md | happy, empty | draft |

## Notes

- Add/remove rows as needed
- Screen-specific requirements go in spec files
- Agent proposes screens from stories if this is empty
