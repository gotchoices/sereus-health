# Assistant API Keys Setup

## Purpose

Enable the AI assistant and register API access keys

## Layout

- Header: title “Assistant Setup”
  - Title: Left side "Assistant Setup"
  - Right corner: (+) Add new icon (similar to catalog, log entry screens)

## Key List
List is initially empty.  When the user presses the add button, a new line is appended to the list.

Each line contains:
  - a radio button to exclusively enable the line
  - A provider selector (determined by what `global/assistant/vercel-ai-sdk.md` package supports)
  - A model selector (if supported by package)
  - An entry for the API key (masked by default)
    - An eyeball icon to toggle visibility of the key
  - A trash icon (remove this key)

## Notes
- Only one key can be enabled at a time
- Multiple keys may be stored
- Page contents are persistent and stored in **device secure storage** (Keychain on iOS, Keystore on Android; not plain AsyncStorage).
- Delete function issues confirmation prompt dialog before deleting
