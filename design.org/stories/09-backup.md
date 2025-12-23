# User Story: Catalog and Backup

## Story Overview
I want to share my catalog setup with others, quickly populate my catalog from external sources, and back up all my data.

Context: Bob has been [using the app daily](02-daily.md) and has built up a useful catalog of items. He wants to protect his data and help others get started faster.

## Sequence

### Catalog Export/Import (from Catalog screen)

**Sharing Catalog with a Friend**
1. Bob's friend Alice is starting to use the app.
2. From the Catalog screen, Bob finds an export option and exports his catalog.
3. The export includes his types, categories, items, bundles, and quantifiers—no personal log data.
4. He shares the file with Alice.
5. Alice imports it from her Catalog screen.
6. She now has all of Bob's items and bundles ready to use.
7. She imports it again by mistake—no duplicates are created.

**Power User: Bulk Import from External Source**
8. Bob wants to quickly add many food items to his catalog.
9. He searches the internet for a list of common foods.
10. He copies the list into a text editor and formats it as a simple YAML file:
    ```yaml
    type: Activity
    category: Eating
    items:
      - Oatmeal
      - Greek Yogurt
      - Scrambled Eggs
      - Toast
      - Orange Juice
      - Coffee
    ```
11. From the Catalog screen, he imports the YAML file.
12. The app shows a preview; he confirms.
13. All the items are added to his catalog instantly.
14. He repeats this for exercises, conditions, and outcomes he found online.

### Full Backup/Restore (from Settings)
15. Bob finds Backup & Restore in Settings.
16. He exports a full backup—everything in a single file.
17. He saves it to cloud storage for safekeeping.
18. Later, when he gets a new phone, he installs the app.
19. He imports his backup file from Settings.
20. All his data is restored exactly as it was.

## Acceptance Criteria
- [ ] User can export catalog to CSV from Catalog screen (via search → hamburger menu)
- [ ] User can import catalog from CSV or YAML (auto-detected, idempotent)
- [ ] User can export full backup (YAML) from Settings
- [ ] User can import/restore from Settings (auto-detects content scope, idempotent)
- [ ] Import shows preview before committing

