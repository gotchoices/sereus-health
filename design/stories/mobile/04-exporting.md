# User Story: Log Data Import/Export

## Story Overview
I want to share my log data with healthcare professionals, analyze it externally, and import existing data I've tracked elsewhere.

Context: Bob has already been [using the app daily](02-daily.md) for some time. He wants to use his data for his benefit and bring in historical data he's tracked in spreadsheets.

## Sequence

### Exporting Log Data
1. Bob is on the main history screen and applies a filter to show just his exercise entries from the past month.
2. He finds an export option and exports the filtered entries as a file.
3. He shares the file via email to his doctor.
4. Another time, he clears the filter and exports all his log entries.

### Importing Historical Data
5. Bob has an old spreadsheet with months of exercise data he tracked before using the app.
6. He saves it as CSV with columns matching the app's expected format.
7. From the history screen, he finds an import option.
8. He selects his CSV file; the app shows a preview of what will be imported.
9. He confirms, and his historical exercise data appears in the log.
10. He accidentally imports the same file again—no duplicates are created.

## Acceptance Criteria
- [ ] User can export log entries (filtered or all) to CSV
- [ ] User can import log entries from CSV or YAML (auto-detected)
- [ ] Import shows preview before committing
- [ ] Import is idempotent (duplicate entries are not created)
