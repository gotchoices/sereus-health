# User Story: Exploring

## Story Overview
I want to use my mobile device to log and assess my activities and conditions so that I can improve my health and wellness.

Context: Bob is 57 and his health is not what it used to be.  When he was young, he was just healthy all the time--pretty much, no matter what he did.  Now, he has good days and bad days.  He suspects he could improve his health by changing certain practices.  Maybe he needs to eat different foods.  Maybe some exercise or another would help.  There are so many different things going on, it is hard to know if certain ones are creating a problem or if others would improve things.  As he evaluates the app, he has a basic understanding that it will be used to record his daily activities in an attempt to find correlations he can use to improve his health.

## Sequence
1. Bob just installed the app on his phone and launched it. He sees a welcome message indicating he will need to initialize his catalog. He can either import a starter catalog from `health.sereus.org` or start making entries by hand. He selects the option to import the starter catalog.
2. After seeing the import process complete, he now sees an empty screen, but there is a message telling him how he can add new items. He follows the guidance and taps the icon that looks like it will add something.
3. There is a choice to add an **Activity**, a **Condition**, or an **Outcome**.
4. He chooses **Activity**.
5. Now he sees categories for things like Eating, Exercise, Recreation, Work, etc. He decides to try logging what he had for breakfast so he picks Eating.
6. Now he sees many types of foods to choose from but not the one he was thinking (arugula).
7. He notices a way to add new items so he selects that.
8. He adds arugula as a new item.  He also adds items for radishes and spinach.
9. Now they show up in the list so he is able to select arugula, radishes and spinach (the salad he just ate).
10. There is an entry for the date/time so he sets that back to 11:30pm.
11. He confirms and now he can see his new items in the list.
12. That seemed pretty painless so Bob commits to using the app for a few weeks, inputting all his daily activities.

**Alternative Path B: No starter catalog**
1.1. He declines the import.
1.2. He tries making an entry. He selects type Activity, but there are no categories to choose from.
1.3. He creates a new one on the fly, "Work" and specifies "Yard Work" for the name and completes the entry.
1.4. Now his list contains a single item, Yard Work.
1.5. He sees a way to navigate to Catalog and chooses it.
1.6. He creates another item "Programming" under the same "Work" category.
1.7. Then he tries creating another log entry. Choosing the Work category, he sees he can choose from Yard Work and Programming already available from his catalog.
1.8. He spends his free time for the next few days inputting common activities until he has a respectable catalog of Activities, Conditions, and Outcomes.

**Alternative Path C: Exercise**
4.1. He chooses the Exercise category.
4.2. He sees a few of the exercises he did but not all.
4.3. So he adds the missing exercises to the list.
4.4. He is now able to select the various exercises so that his single log entry consists of several specific items: Pushups, Pullups, Situps, Jogging.
4.5. He is able to set the quantifiers for each. The first three are just integer numbers (20, 15, 40). For jogging, he enters 2 miles and 30 minutes for the two quantifiers.
4.6. He also sets the time for his workout: 9am.
4.7. Back to step 11.

**Alternative Path D: Popular Imports**
1.1. Bob is browsing the profile/setup area and sees an item for popular imports.
1.2. He clicks it and is browsing a list of various types of catalog imports (on sereus.org)
1.3. He selects the file for air quality conditions
1.4. The items are added to his catalog.

## Acceptance Criteria
- [ ] Initial conditions have no catalog items or log entries
- [ ] The user is prompted to import a starter catalog (e.g. from `health.sereus.org`)
- [ ] The user can add new categories/items manually (even with an empty catalog)
