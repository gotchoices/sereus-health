# User Story: Catalog and Backup

## Story Overview
I want to share my catalog setup with others, quickly populate my catalog from external sources, and back up all my data.

Context: Bob has been [using the app daily](02-daily.md) and has built up a useful catalog of items. He wants to protect his data and help others get started faster.

## Sequence

### Catalog Export/Import

**Sharing Catalog with a Friend**
1. Bob's friend Alice is starting to use the app.
2. Bob finds an export option and exports his catalog.
3. The export includes his types, categories, items, bundles, and quantifiers—no personal log data.
4. He shares the file with Alice.
5. Alice imports it.
6. She now has all of Bob's items and bundles ready to use.
7. She imports it again by mistake—no duplicates are created.

**Power User: Bulk Import from External Source**
8. Bob wants to quickly add many food items to his catalog.
9. He searches the internet for a list of common foods.
10. He creates or downloads a simple YAML file describing items to add.
11. He imports the YAML file.
12. All the items are added to his catalog.
13. He repeats this for exercises, conditions, and outcomes he found online.

### Full Backup / Import
14. Bob finds the Backup function.
15. He exports a full backup which includes everything in a single file.
16. He saves it somewhere safe (e.g., cloud storage).
17. Later, when he gets a new phone, he installs the app.
18. He imports his backup file.
19. His data is available again.

## Acceptance Criteria
- [ ] User can export catalog to YAML
- [ ] User can import catalog from CSV or YAML (auto-detected, idempotent)
- [ ] User can export full backup to YAML
- [ ] User can import backup (idempotent); optional clear-first to fully replace local data
- [ ] Import shows preview before committing

