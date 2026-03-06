# Research: Roster Visibility (005)

## Finding 1 — Root Cause

**Decision**: The bug is a missing CSS layer, not a logic bug.

The `rosterListHtml()` function in `src/views/liveView.js` already renders player names as `.live-roster__row` / `.live-roster__name` elements when the roster is expanded. However, `styles.css` has **zero rules** for `.live-roster__row`, `.live-roster__name`, or `.live-roster__empty`. The container `.live-roster-inner` (which provides background, padding, and border) is also defined in CSS but never used in the rendered HTML — names are injected directly into `.live-roster`.

Result: names render as unstyled, borderless block elements on a transparent background — invisible or near-invisible against the page background.

**Rationale**: Confirmed by `grep -n "live-roster__row\|live-roster__name" styles.css` returning no results.

**Alternatives considered**: Rewriting toggle logic (not needed — JS toggle works correctly).

---

## Finding 2 — Fix Scope

**Decision**: Two changes needed:

1. Wrap roster content in `.live-roster-inner` so it gets card styling (background, border, padding).
2. Add CSS rules for `.live-roster__row` (flex row, space-between), `.live-roster__name` (legible text), and `.live-roster__empty` (muted note).

**Rationale**: The existing `live-roster-inner` CSS is already defined and correct — it just needs to be used. Adding these rules is minimal and consistent with existing BEM conventions.

**Alternatives considered**: Adding a completely new expanded UI — rejected (YAGNI; existing structure is sound).

---

## Finding 3 — No Data Model Changes

**Decision**: No changes to store, models, or localStorage.

The player list is already available via `getState().players`. No new data, no new events, no new keys.

**Rationale**: This is a pure rendering fix.
