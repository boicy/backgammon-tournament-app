# Data Model: Tap-to-Select (006)

## No New Entities

This feature requires no changes to the data model. Player and match data are unchanged.

## Existing Entities Used

**Player** (unchanged):
- `id` — UUID
- `name` — string

Accessed via `getState().players` (array). No new fields, no new storage keys.

## UI State

New ephemeral state (module-level in `src/views/liveView.js`, not persisted):
- `_pickStep` — `null | 1 | 2 | 'confirm'` (which step of the pick flow)
- `_selectedP1` — player ID or null
- `_selectedP2` — player ID or null

Reset on form toggle and on `render()`. Follows existing pattern of `_expandedCardId`, `_rosterExpanded`, etc.
