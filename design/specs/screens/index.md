# Screens Plan (Human Proposal)

Purpose
- Make a first pass at screen names and routes before generation.
- If you leave this as-is, the agent will propose names from stories.

Instructions
- List each screen with a clear, stable name and short purpose.
- Add a proposed route (used for deep links and navigation).
- Optional: note variants to support early (happy, empty, error).

Template

| Screen Name        | Route            | Purpose                                 | Variants                |
|--------------------|------------------|-----------------------------------------|-------------------------|
| ConnectionsList    | ConnectionsList  | Home list of connections/threads        | happy, empty, error     |
| ChatInterface      | ChatInterface    | Thread conversation view                | happy, empty, error     |
| ProfileSetup       | ProfileSetup     | Setup/edit profile                      | happy, error            |
| MediaPicker        | MediaPicker      | Select or capture media                 | happy, empty, error     |

Notes
- Add/remove rows as needed. You can refine names later, but avoiding churn helps.
- Screen-specific requirements go in `design/specs/screens/<screen-id>.md`.


