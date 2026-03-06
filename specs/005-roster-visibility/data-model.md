# Data Model: Roster Visibility (005)

## No New Entities

This feature requires no changes to the data model. Player data is already stored and retrieved correctly.

## Existing Entity Used

**Player** (unchanged):
- `id` — UUID
- `name` — string, user-entered

Accessed via `getState().players` (array). No new fields, no new storage keys.

## UI State

`_rosterExpanded` (module-level boolean in `src/views/liveView.js`) — already exists.
No new ephemeral state required.
