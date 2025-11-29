# Navigation Spec

Purpose
- Define app-wide navigation structure, deep links, and route options.

Sitemap (example)
- HOME Tab
  - ConnectionsList (root)
  - ChatInterface (push from ConnectionsList)
- SETTINGS Tab
  - ProfileSetup (push)

Deep Links
- Scheme: myapp://
- Patterns:
  - myapp://screen/ConnectionsList
  - myapp://screen/ChatInterface?variant=empty

Route Options
- ChatInterface: title "Chat", headerLarge=true
- ConnectionsList: title "Connections"

Notes
- Human spec overrides any AI-generated navigation consolidation.


