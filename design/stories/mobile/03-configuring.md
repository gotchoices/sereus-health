# User Story: Configuration

## Story Overview
I want to log my daily activities with enough detail that it will be useful in evaluating better health practices. However, it needs to be easy to use. I need to enter just a few log entries, but they need to contain multiple sub-items. For example, I ate a salad for lunch. But what was in the salad? I had a workout, but what exercises did I do, and how many of each?

Context: Bob has already been [getting used to the app](02-daily.md).  He now wants to populate his selections with more of the items he will be using each day.

## Sequence
1. Bob opens his fridge and takes note of all the foods he can see.  He wants to make an item for each one.
2. He begins to create a new entry.
3. Rather than selecting from the list of items, he chooses to enter new items.
4. He enters carrots, lettuce, beets, tomatoes, hot dogs, cheese, and many more items.
5. He wants to enter a log entry for lunch. He had a BLT. Hmm, not on the list.
6. He navigates back to create a new item but notices that he can create bundles.
7. He creates a new bundle, BLT.
8. He is able to select items from the list to belong to the bundle but it is getting long.
9. He notices a filter window and begins typing 'bac' and bacon appears in the list, he selects it.
10. He also locates lettuce, tomato, bread and mayonnaise. He selects them all.
11. His bundle is complete.  Returning to his entry, he selects BLT and milk.
12. He sets the quantifier for each and completes his entry.
13. Now it is a part of his history.

## Alternative Path A: Retiring an item no longer used
1. Bob stopped eating hot dogs and wants them out of his pick lists.
2. He finds "hot dogs" in the catalog and chooses **Retire**.
3. The app explains it will be hidden from future logging but kept so his history stays intact, and he confirms.
4. Hot dogs no longer appear when logging, but his past entries that included them are unchanged.

## Acceptance Criteria
- [ ] The user can define any number of items.
- [ ] The user can define bundles which consist of other items.
- [ ] The user can retire a catalog item or bundle; it disappears from future selection while historical entries that reference it remain intact.
