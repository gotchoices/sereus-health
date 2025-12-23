# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options.

Sitemap (example)
- HOME Tab
  - ItemList (root)
  - ItemDetail (push from ItemList)
- SETTINGS Tab
  - UserProfile (push)

Deep Links
- Scheme: myapp://
- Patterns:
  - myapp://screen/ItemList
  - myapp://screen/ItemDetail?id=123&variant=happy
  - myapp://screen/UserProfile

Route Options
- ItemDetail: title "Item", headerLarge=true
- ItemList: title "Items"
- UserProfile: title "Profile"

Notes
- Human spec overrides any AI-generated navigation consolidation.
- Adjust scheme to match app identifier (e.g., bonum://, health://)
