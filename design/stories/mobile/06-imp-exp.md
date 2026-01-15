# User Story: Log Data Import/Export

## Story Overview
I want to share my log data with healthcare professionals, analyze it externally, and import existing data I've tracked elsewhere.

Context: Bob has already been [using the app daily](02-daily.md) for some time. He wants to use his data for his benefit and bring in historical data he's tracked in spreadsheets.

## Sequence

### Exporting Log Data
1. Bob is on the main history screen and applies a filter to show just his exercise entries from the past month.
2. He finds an export option and exports the filtered entries as a CSV file.  He chooses CSV because his doctor doesn't know anything about his app and wants to just see the entries in a spreadsheet.
3. He shares the CSV file via email to his doctor.
4. Another time, he clears the filter and exports all his log entries.  He will play with that in Excel to do some of his own analysis.

### Importing App Data
5. Bob exports his log entries to YAML (app standard) format.
6. He tries importing that. The parse works, but it doesn't create any more entries.
7. He deletes a few of his entries and then tries the import again.
8. His entries are restored.

### Importing Foreign Data
9. Bob has a spreadsheet with months of exercise data he tracked before using the app.
10. He tries importing it directly, but it fails due to incorrect format.
11. He pulls up the AI assistant, attaches the original spreadsheet and types "Can this be imported?"
12. The agent makes pretty good sense of the data and proposes a bunch of Activity imports in the app's canonical format.
13. He gives a few commands to explain the meaning of the data better until the proposed entries look just right.
14. He approves the import.

## Acceptance Criteria
- [ ] User can export log entries (filtered or all) to CSV
- [ ] User can import log entries from canonical YAML
- [ ] Import shows preview before committing
- [ ] Import is idempotent (duplicate entries are not created)
