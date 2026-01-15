# User Story: AI Assistant

## Story Overview
I want to be able to explain things to an AI assistant and have the assistant do things like creating catalog and/or log entries.  Using voice-to-text, I can even just speak my instructions.

Context: Bob has already been [using the app](02-daily.md). He wants to enter some more log entries.

## Sequence
1. Bob has more things to enter but he is a little busy and about to procrastinate.
2. He notices a feature that seems to be an AI or assistant.  Familiar with AI agents, he clicks it.
3. He sees that he doesn't have the feature configured and is in the very configuration screen to enable the feature.
4. The feature requires a selection of AI service and he has to supply an API key.
5. He does a little research on the web, accesses his Claude account and generates an API key.
6. He fills out the setup screen and then tries to access the AI assistant.  It works!
7. The assistant asks how it can help.  He can type something in so clicks there.
8. He is about to type what he had for lunch but notices the microphone on his phone keyboard and taps that instead.
9. He dictates a lengthy message about what he had for lunch, how he's been feeling and doing.
10. The assistant parses his message and creates a list of proposed actions. He can see there will be new log entries created, many associated with his existing catalog items. There are also some new catalog entries for items that are new.
11. Each action is individually selectable and pre-selected.  He can cancel or approve the processing of the selected items.
12. He un-selects one and then approves the screen.
13. The new entries are now part of his catalog and his log history.

Alternative Path A: Image recognition
7.1. Bob takes a picture of the salad he is about to eat and submits it.
7.2. The agent comes back with a list of proposed log entries, consisting of the apparent salad ingredients.
7.3. The list looks pretty good so he approves it but misses the dressing.
7.5. He clicks the entry and types in "oil and vinegar".
7.6. The list is presented again and looks correct.  He approves it.

Alternative Path B: Bundle Creation
7.1. Bob takes a picture of the recipe he is cooking.
7.2. He types/speaks in the entry: "Make new bundle called Rice Pudding, I'm having it for lunch".
7.3. The preview shows proposed actions for the new bundle, a new item (cinnamon), and a log entry for 12pm.
7.5. He approves it and his bundle, catalog item, and log entry are all created.

## Acceptance Criteria
- [ ] The user can give complex tasks to an AI assistant
- [ ] The agent can create catalog items, bundles, log entries, etc
- [ ] No actions are taken without preview and approval
- [ ] Context is maintained so proposed actions can be modified iteratively before being approved
