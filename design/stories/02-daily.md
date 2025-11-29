# User Story: Daily Use

## Story Overview
I want to log my daily activities in a way that will help determine which ones are correlated to my health and well-being.  But I need this to be efficient and not be a distraction from the things I need to get done each day.

Context: Bob has already been [introduced to the app](01-exploring.md).  He now entering some more log items.

## Sequence
1. Bob has been experiencing some health issues.  He wants to log those.
2. He selects the choice to add a new item.
3. There is a choice to add an Activity, a Condition or an Outcome.  He notices that these categories are also editable.  He could change their names or even delete them and use something else for his top-level categories.
4. He chooses Outcome.
5. Now he sees choices for things like Health, Welfare, Pain, etc.  He selects pain.
6. Now he sees a few different things to choose from (joint, head, back).
7. He navigates to add new items and makes an item for stomach pain.
8. He sees an option to add a quantifier.  He chooses that.
9. For quantifier description, he enters Intensity and selects a scale from 1 to 10, then confirms.
10. Back to his log item, stomach pain is now an option so he selects it.
11. He confirms and now he can see his new item in the list.  He selects it.
12. The date looks fine so he selects a 7 for intensity and commits the item.
13. Now it is a part of his history.

Alternative Path A: Logging Conditions (things not in the user's direct control)
4.1. He chooses Condition
4.2. He sees choices for Weather, Stress, Environment.  He chooses Stress.
4.3. He sees a quantifier input and so selects 8.
4.4. He has been in the middle of a lawsuit and it is occupying all his thoughts.
4.5. He sees a spot to enter a comment and so notes the reason for the stress.
4.6. He commits his entry and sees that it is now part of the log history.

Alternative Path B: <full replacement>
3. <replaces step 3>  
4. <replaces step 4>  
5. <resume or continue to step 6>

## Acceptance Criteria
- [ ] The user can define new categories (in addition to Activity, Condition, Outcome)
- [ ] The user can log Conditions and Outcomes
- [ ] The user can define new Conditions and Outcomes
- [ ] The user can add any number of quantifiers to items.  For example: How much did I eat, how ill did I feel, how much pain did I feel, how much water did I drink, How many pullups did I do, etc.
